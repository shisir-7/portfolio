/**
 * engine.js — SpeedPulse measurement core.
 *
 * Pure measurement logic with no DOM access, so it can run either on the main
 * thread or inside a Web Worker (see speedtest.worker.js).
 *
 * Primary network traffic goes to Cloudflare's public speed test endpoints:
 *   GET  https://speed.cloudflare.com/__down?bytes=<N>   -> download payload
 *   POST https://speed.cloudflare.com/__up              -> upload sink
 *   GET  https://speed.cloudflare.com/meta              -> connection metadata
 *   GET  https://speed.cloudflare.com/cdn-cgi/trace     -> metadata fallback
 *
 * Each phase also has a secondary source that is used automatically when the
 * primary one fails (network error, CORS rejection, or a non-2xx status), so
 * a blocked endpoint degrades instead of killing the test.
 *
 * Every request carries a unique cache-busting query parameter and
 * `cache: "no-store"` so we never measure a CDN cache hit.
 */

/* ==========================================================================
   TUNABLE CONSTANTS
   ========================================================================== */

export const CONFIG = Object.freeze({
  /* --- Primary endpoints ------------------------------------------------ */
  endpoints: Object.freeze({
    download: 'https://speed.cloudflare.com/__down',
    upload: 'https://speed.cloudflare.com/__up',
    meta: 'https://speed.cloudflare.com/meta',
    trace: 'https://speed.cloudflare.com/cdn-cgi/trace',
  }),

  /* --- Fallback sources -------------------------------------------------
     Used only when the primary source fails. Both send CORS headers and
     accept cache-busting query parameters.                              */
  fallbacks: Object.freeze({
    ping: Object.freeze([
      // A one-byte response with CORS headers: enough to time a round trip.
      'https://httpbingo.org/bytes/1',
    ]),
    download: Object.freeze([
      // A large, immutable asset served with `Access-Control-Allow-Origin: *`.
      'https://cdn.jsdelivr.net/npm/typescript@5.5.4/lib/typescript.js',
    ]),
    upload: Object.freeze([
      // httpbin echoes the body back and reflects the caller's origin.
      'https://httpbin.org/post',
    ]),
  }),

  /* --- Ping -------------------------------------------------------------
     20 sequential round-trips; the first is discarded as a warm-up because
     the initial TCP + TLS handshake dominates the first sample.            */
  ping: Object.freeze({
    samples: 20,
    warmup: 1,
    timeoutMs: 5000,
  }),

  /* --- Download ---------------------------------------------------------
     Parallel streams, each pulling a growing ladder of file sizes. The
     first `ignoreMs` are dropped so TCP slow start does not deflate the
     average.                                                           */
  download: Object.freeze({
    streams: 5,
    durationMs: 11000,
    ignoreMs: 1800,
    timeoutMs: 30000,
    /** Size ladder in bytes: 100 KB -> 1 MB -> 10 MB -> 25 MB -> 50 MB. */
    sizes: [100 * 1024, 1024 * 1024, 10 * 1024 * 1024, 25 * 1024 * 1024, 50 * 1024 * 1024],
    /** Cloudflare rejects bodies of 100 MB and above with HTTP 403. */
    maxBytes: 99_999_999,
  }),

  /* --- Upload -----------------------------------------------------------
     Fewer streams than download: browsers cap concurrent connections per
     origin (HTTP/1.1 -> 6) and the server is the bottleneck anyway.      */
  upload: Object.freeze({
    streams: 3,
    durationMs: 10000,
    ignoreMs: 1500,
    timeoutMs: 45000,
    /** Payload sizes per request: 1 MB -> 5 MB -> 15 MB -> 30 MB. */
    sizes: [1024 * 1024, 5 * 1024 * 1024, 15 * 1024 * 1024, 30 * 1024 * 1024],
  }),

  /* --- Live reporting --------------------------------------------------- */
  report: Object.freeze({
    intervalMs: 150,   // how often live speed is pushed to the UI
  }),

  /* --- Networking ------------------------------------------------------- */
  net: Object.freeze({
    /** Hard ceiling for the whole test; a hung request can never hang the UI. */
    overallTimeoutMs: 90_000,
    /** Hard ceiling for a single phase, on top of the per-request timeouts. */
    phaseTimeoutMs: 45_000,
  }),
});

/* ==========================================================================
   SMALL UTILITIES
   ========================================================================== */

/** High resolution clock, safe in workers and on the main thread. */
const now = () => performance.now();

/** Unique token used to defeat caches on every request. */
function cacheBuster() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${rand}`;
}

/** Round to a fixed number of decimals, avoiding float noise. */
function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Median of a numeric array (average of the two middle values if even). */
export function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Remove stall samples from a latency series.
 *
 * Stalls only ever push latency *up*, so only the upper tail is trimmed.
 * A sample is considered a stall when it exceeds `median * factor + slack`.
 * Because the threshold is relative to the median, a genuinely slow but
 * *consistent* connection is never filtered out.
 *
 * @param {number[]} values Raw latency samples.
 * @param {number} factor  Multiples of the median above which a sample is
 *                         treated as a stall.
 * @param {number} slack   Absolute margin added to the threshold (ms).
 */
function filterStalls(values, factor = 2.5, slack = 20) {
  if (values.length < 4) return values;
  const ceiling = median(values) * factor + slack;
  const kept = values.filter((v) => v <= ceiling);
  // Never discard so much that the series becomes meaningless.
  return kept.length >= 4 ? kept : values;
}

/**
 * Jitter = mean absolute difference between consecutive samples.
 *
 * Raw consecutive differences are dominated by rare stalls (a TCP
 * retransmit, a router hiccup, a GC pause) that can be hundreds of
 * milliseconds. Those outliers are filtered out first, so the figure
 * describes the stability of the link rather than the worst moment.
 *
 * @param {number[]} values Raw latency samples, in order.
 */
export function jitter(values) {
  if (values.length < 2) return 0;

  const kept = filterStalls(values);
  if (kept.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < kept.length; i++) total += Math.abs(kept[i] - kept[i - 1]);
  return total / (kept.length - 1);
}

/**
 * Summary statistics for a set of latency samples.
 *
 * The reported ping is the median of the stall-free series, which is a
 * robust central estimate. The jitter is the mean absolute difference
 * between consecutive samples of that same series.
 */
export function latencyStats(values) {
  if (!values.length) return { pingMs: 0, jitterMs: 0, minMs: 0, maxMs: 0, used: 0 };

  const kept = filterStalls(values);
  return {
    pingMs: round(median(kept), 1),
    jitterMs: round(jitter(values), 1),
    minMs: round(Math.min(...kept), 1),
    maxMs: round(Math.max(...kept), 1),
    used: kept.length,
  };
}

/**
 * True when an error is the result of a user/system cancellation.
 *
 * Note that a per-request timeout is *not* an abort: it is a failed sample
 * that the phase may skip, so the overall test keeps going.
 */
function isAbort(err, signal) {
  return signal?.aborted || err?.name === 'AbortError';
}

/**
 * Fetch with a timeout layered on top of an optional external AbortSignal.
 * The returned response is handed back before the body is read, so callers
 * control streaming and cancellation.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = CONFIG.net.overallTimeoutMs, externalSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), timeoutMs);
  const onExternalAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort(externalSignal.reason);
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

/**
 * Combine an external AbortSignal with a phase deadline.
 *
 * The returned controller aborts when either the external signal fires or
 * the phase's own time budget runs out. This is what lets a throughput
 * phase stop at a fixed duration instead of waiting for the last chunk to
 * finish downloading.
 *
 * @param {AbortSignal|undefined} externalSignal
 * @param {number} timeoutMs
 * @returns {{signal: AbortSignal, cancel: () => void, timedOut: () => boolean}}
 */
function createPhaseScope(externalSignal, timeoutMs) {
  const controller = new AbortController();
  let expired = false;

  const timer = setTimeout(() => {
    expired = true;
    controller.abort(new DOMException('Phase timeout', 'TimeoutError'));
  }, timeoutMs);

  const onExternalAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort(externalSignal.reason);
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  return {
    signal: controller.signal,
    timedOut: () => expired,
    cancel: () => {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    },
  };
}

/* ==========================================================================
   PHASE 1 — PING & JITTER
   ========================================================================== */

/**
 * Run sequential latency probes and report the live running median.
 *
 * @param {(progress: object) => void} onProgress
 * @param {AbortSignal} signal
 * @returns {Promise<{pingMs: number, jitterMs: number, samples: number[]}>}
 */
export async function measurePing(onProgress, signal) {
  const { samples: totalSamples, warmup, timeoutMs } = CONFIG.ping;
  const samples = [];
  const deadline = now() + CONFIG.net.overallTimeoutMs;

  /**
   * Candidate latency probes, primary first. The fallback is a one-byte
   * response from a different host, so a blocked primary endpoint still
   * allows the test to produce a latency figure.
   */
  const sources = [
    { build: () => `${CONFIG.endpoints.download}?bytes=0&cb=${cacheBuster()}` },
    ...CONFIG.fallbacks.ping.map((url) => ({ build: () => `${url}?cb=${cacheBuster()}` })),
  ];
  let sourceIndex = 0;

  for (let i = 0; i < totalSamples; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    // Never let the phase run past the overall budget, even if every probe
    // times out.
    if (now() > deadline) break;

    const startedAt = now();
    let latencyMs;

    try {
      const response = await fetchWithTimeout(
        sources[sourceIndex].build(),
        { method: 'GET', cache: 'no-store', mode: 'cors', credentials: 'omit' },
        timeoutMs,
        signal,
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await response.arrayBuffer();
      latencyMs = now() - startedAt;
    } catch (err) {
      if (isAbort(err, signal)) throw err;
      // Rotate to the next source and retry this probe.
      if (sourceIndex < sources.length - 1) {
        sourceIndex += 1;
        i -= 1; // this probe did not count; try again against the new source
        continue;
      }
      // Every source failed for this probe. Skip it, but give up if the
      // server is genuinely unreachable.
      if (i > totalSamples - 4 && samples.length === 0) {
        throw new Error('Could not reach the test server. Check your connection or try again.');
      }
      continue;
    }

    // The very first sample includes connection setup -> discard it.
    if (i >= warmup) samples.push(latencyMs);

    onProgress?.({
      samples: samples.length,
      total: totalSamples - warmup,
      latencyMs: round(latencyMs, 2),
      medianMs: round(median(samples), 2),
    });
  }

  if (!samples.length) {
    throw new Error('Could not reach the test server. Check your connection or try again.');
  }

  const stats = latencyStats(samples);
  return {
    // The median is robust against a couple of stalls, which is why it is
    // preferred over the mean for latency.
    pingMs: stats.pingMs,
    jitterMs: stats.jitterMs,
    minMs: stats.minMs,
    maxMs: stats.maxMs,
    samples: samples.map((v) => round(v, 2)),
  };
}

/* ==========================================================================
   PHASE 2 — DOWNLOAD
   ========================================================================== */

/**
 * Build the list of candidate URLs for a download chunk, primary first.
 * The fallback serves a fixed-size asset, so the requested size is ignored.
 */
function downloadUrls(source, size) {
  if (source === CONFIG.endpoints.download) {
    return [`${source}?bytes=${size}&cb=${cacheBuster()}`];
  }
  return [`${source}?cb=${cacheBuster()}`];
}

/**
 * Choose the size of the next download chunk.
 *
 * The ladder is climbed gradually so the connection is never flooded with a
 * huge request it cannot finish, and it is capped by the speed observed so
 * far: a 50 MB request on a 5 Mbps line would take 80 seconds and stall the
 * measurement, so a slow connection stays on small chunks.
 *
 * @param {number} step     How many chunks this stream has already sent.
 * @param {number} mbps     The best speed observed so far (0 = unknown).
 * @param {number[]} ladder The configured size ladder.
 */
function pickChunkSize(step, mbps, ladder) {
  const maxIndex = ladder.length - 1;
  let index = Math.min(step, maxIndex);

  if (mbps > 0) {
    // Keep a chunk under roughly 4 seconds of transfer at the observed speed.
    const seconds = 4;
    const affordable = Math.floor((mbps * 1e6 * seconds) / 8);
    let capIndex = 0;
    ladder.forEach((size, i) => { if (size <= affordable) capIndex = i; });
    index = Math.min(index, capIndex);
  }
  return ladder[Math.max(0, index)];
}

/**
 * Pull data over several parallel connections and compute throughput.
 *
 * The reported speed is bytes transferred *after* the slow-start window
 * divided by the elapsed time inside that window, so the number reflects
 * steady-state throughput rather than the initial ramp.
 *
 * @param {(progress: {mbps: number, bytes: number, elapsedMs: number}) => void} onProgress
 * @param {AbortSignal} signal
 */
export async function measureDownload(onProgress, signal) {
  const { streams, durationMs, ignoreMs, sizes } = CONFIG.download;
  const startedAt = now();

  // The phase runs for a fixed window. When the window closes, every
  // in-flight request is aborted so the phase ends promptly instead of
  // waiting for the last chunk to finish.
  const scope = createPhaseScope(signal, durationMs + ignoreMs);

  /** Per-stream byte counters, so we can attribute bytes to a stream. */
  const totals = new Array(streams).fill(0);
  /** Byte counter snapshot taken once the slow-start window closes. */
  let baseBytes = 0;
  let baseTime = 0;
  let stopped = false;
  /** Index of the source currently in use (0 = primary). */
  let activeSource = CONFIG.endpoints.download;
  /**
   * Edge metadata captured from the first successful response headers.
   * Cloudflare exposes these via `access-control-expose-headers`, so the
   * IP / colo / coordinates come for free with the traffic we already need.
   */
  let edge = null;
  /** Best observed per-stream speed in bytes/second, used to size chunks. */
  let bestChunkBps = 0;

  /** Record the speed of a completed chunk so the size ladder can adapt. */
  const recordChunkSpeed = (bytesPerSecond) => {
    if (bytesPerSecond > bestChunkBps) bestChunkBps = bytesPerSecond;
  };

  /** One worker per parallel connection. */
  const runStream = async (index) => {
    let step = 0;
    while (!stopped) {
      // The size ladder adapts to the observed speed: a fast connection
      // jumps ahead to the large files, a slow one stays on small ones so no
      // single request runs for an unreasonable time.
      const size = pickChunkSize(step, (bestChunkBps * 8) / 1e6, sizes);
      step += 1;
      const url = downloadUrls(activeSource, size)[0];
      const chunkStart = now();

      try {
        // The request itself is only bounded by the phase budget. A slow
        // connection legitimately needs a long time for a large file, so a
        // fixed timeout would restart the transfer forever instead of
        // letting it complete.
        const response = await fetchWithTimeout(
          url,
          { method: 'GET', cache: 'no-store', mode: 'cors', credentials: 'omit' },
          CONFIG.net.phaseTimeoutMs,
          scope.signal,
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        // Harvest the edge metadata from the first good response.
        if (!edge) {
          const h = response.headers;
          const captured = {
            ip: h.get('cf-meta-ip') || null,
            colo: h.get('cf-meta-colo') || null,
            asn: h.get('cf-meta-asn') || null,
            country: h.get('cf-meta-country') || null,
            city: h.get('cf-meta-city') || null,
            latitude: h.get('cf-meta-latitude') || null,
            longitude: h.get('cf-meta-longitude') || null,
            timezone: h.get('cf-meta-timezone') || null,
          };
          if (captured.ip || captured.colo) edge = captured;
        }

        // Stream the body so `totals` grows in real time and cancellation is
        // immediate. The bytes are never retained.
        const before = totals[index];
        const reader = response.body?.getReader();
        if (reader) {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            totals[index] += value.byteLength;
          }
        } else {
          const buffer = await response.arrayBuffer();
          totals[index] += buffer.byteLength;
        }
        recordChunkSpeed((totals[index] - before) / ((now() - chunkStart) / 1000));
      } catch (err) {
        // The phase deadline aborts in-flight requests on purpose; that is a
        // normal end of the phase, not a failure.
        if (scope.timedOut()) return;
        if (isAbort(err, signal)) throw err;
        // Rotate to the fallback source and try again.
        if (activeSource !== CONFIG.endpoints.download) {
          if (stopped) return;
          await new Promise((r) => setTimeout(r, 120));
          continue;
        }
        const fallback = CONFIG.fallbacks.download[0];
        if (fallback) {
          activeSource = fallback;
          continue;
        }
        if (stopped) return;
        await new Promise((r) => setTimeout(r, 120));
      }

      if (now() - startedAt > durationMs + ignoreMs) return;
    }
  };

  const streamsPromise = Promise.all(
    Array.from({ length: streams }, (_, i) =>
      runStream(i).catch((err) => {
        if (scope.timedOut()) return;
        if (isAbort(err, signal)) throw err;
      }),
    ),
  );

  // Live reporting loop.
  const reportTimer = setInterval(() => {
    const elapsed = now() - startedAt;

    if (elapsed >= ignoreMs && baseTime === 0) {
      baseTime = elapsed;
      baseBytes = totals.reduce((a, b) => a + b, 0);
    }

    if (baseTime > 0) {
      const windowMs = elapsed - baseTime;
      if (windowMs > 0) {
        const deltaBytes = totals.reduce((a, b) => a + b, 0) - baseBytes;
        const mbps = (deltaBytes * 8) / (windowMs * 1000); // bits/ms -> Mbps
        onProgress?.({ mbps: round(mbps, 2), bytes: deltaBytes, elapsedMs: Math.round(windowMs) });
      }
    }
  }, CONFIG.report.intervalMs);

  try {
    // The phase normally ends when the streams finish. The timeout is only a
    // safety net: when it fires, the data collected so far is still used
    // rather than failing the whole test.
    await Promise.race([
      streamsPromise,
      new Promise((resolve) =>
        setTimeout(resolve, CONFIG.net.phaseTimeoutMs),
      ),
    ]);
  } finally {
    stopped = true;
    clearInterval(reportTimer);
    scope.cancel();
  }

  // Final measurement across the whole post-warm-up window.
  const endMs = now() - startedAt;
  if (baseTime === 0) {
    baseTime = Math.min(ignoreMs, endMs * 0.5);
    baseBytes = 0;
  }
  const totalBytes = totals.reduce((a, b) => a + b, 0);
  const windowMs = Math.max(1, endMs - baseTime);
  const finalMbps = ((totalBytes - baseBytes) * 8) / (windowMs * 1000);

  if (totalBytes <= 0) throw new Error('Download test received no data.');

  return {
    mbps: round(finalMbps, 2),
    bytes: totalBytes,
    durationMs: Math.round(endMs),
    usedFallback: activeSource !== CONFIG.endpoints.download,
    edge,
  };
}

/* ==========================================================================
   PHASE 3 — UPLOAD
   ========================================================================== */

/**
 * Push random bytes to the server over parallel connections.
 *
 * Two transport strategies are supported:
 *
 *  - `XMLHttpRequest` (preferred, main thread only): the only browser API
 *    that exposes granular *upload* progress events, which is what makes a
 *    live upload gauge possible. `fetch()` cannot report upload progress.
 *  - `fetch` (workers): no progress events, so the byte counter is advanced
 *    when the request completes. Streaming request bodies are tried first
 *    and a buffered body is used as a fallback.
 *
 * @param {(progress: {mbps: number, bytes: number, elapsedMs: number}) => void} onProgress
 * @param {AbortSignal} signal
 */
export async function measureUpload(onProgress, signal) {
  const { streams, durationMs, ignoreMs, timeoutMs, sizes } = CONFIG.upload;
  const startedAt = now();

  // The phase runs for a fixed window and then aborts whatever is in flight.
  const scope = createPhaseScope(signal, durationMs + ignoreMs);

  /** Per-stream totals: bytes from finished requests + the in-flight request. */
  const totals = new Array(streams).fill(0);
  /** Bytes already accepted by the server for each stream. */
  const completed = new Array(streams).fill(0);
  /** Bytes reported by the current in-flight request for each stream. */
  const inFlight = new Array(streams).fill(0);

  let baseBytes = 0;
  let baseTime = 0;
  let stopped = false;
  let activeSource = CONFIG.endpoints.upload;

  /** True when running on the main thread, where XHR upload progress exists. */
  const canUseXhr = typeof XMLHttpRequest !== 'undefined';

  /** Random payload source; regenerated per request so nothing is compressible. */
  const makeBlob = (size) => {
    const buffer = new ArrayBuffer(size);
    const view = new Uint8Array(buffer);
    // Fill in reasonably-sized random chunks (crypto is not required here:
    // the payload only needs to be incompressible, not secret).
    for (let offset = 0; offset < size; offset += 32768) {
      const chunk = new Uint8Array(Math.min(32768, size - offset));
      crypto.getRandomValues(chunk);
      view.set(chunk, offset);
    }
    return new Blob([buffer], { type: 'application/octet-stream' });
  };

  /**
   * Upload one payload via XMLHttpRequest, reporting live progress.
   */
  const uploadViaXhr = (index, size, blob, url) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let settled = false;

      const cleanup = () => {
        scope.signal.removeEventListener('abort', onAbort);
        xhr.onload = xhr.onerror = xhr.onabort = xhr.ontimeout = null;
        xhr.upload.onprogress = null;
      };
      const onAbort = () => {
        if (settled) return;
        settled = true;
        try { xhr.abort(); } catch { /* already finished */ }
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      };

      if (scope.signal.aborted) { onAbort(); return; }
      scope.signal.addEventListener('abort', onAbort, { once: true });

      xhr.open('POST', url, true);
      xhr.withCredentials = false;
      // `text/plain` is a CORS-safelisted content type, so no preflight
      // round-trip is needed and the upload starts immediately.
      xhr.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
      // The timeout must accommodate a slow link: a 30 MB upload on a
      // 5 Mbps line takes about 50 seconds. Anything above that is a real
      // hang, and the phase budget catches the rest.
      xhr.timeout = Math.max(timeoutMs, CONFIG.net.phaseTimeoutMs);

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        // The counter must never go backwards: the in-flight value is
        // relative to this request, so it is added to the completed total.
        inFlight[index] = event.loaded;
        totals[index] = completed[index] + inFlight[index];
      };

      xhr.onload = () => {
        if (settled) return;
        settled = true;
        cleanup();
        // 2xx means the server accepted the payload.
        if (xhr.status >= 200 && xhr.status < 300) {
          completed[index] += size;
          inFlight[index] = 0;
          totals[index] = completed[index];
          resolve();
        } else {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Upload failed — the server could not be reached.'));
      };

      xhr.onabort = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      };

      xhr.ontimeout = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Upload timed out.'));
      };

      xhr.send(blob);
    });

  /**
   * Upload one payload via fetch (worker path).
   *
   * Web Workers have no XMLHttpRequest, so the upload has to go through
   * fetch. Two body strategies are tried:
   *   1. A streaming ReadableStream body, which reports progress as the
   *      chunks are handed to the transport. Requires `duplex: 'half'`.
   *   2. A plain ArrayBuffer body, which is accepted everywhere but cannot
   *      report progress, so the counter is advanced optimistically.
   */
  const uploadViaFetch = async (index, size, blob, url) => {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const chunkSize = 64 * 1024;

    const makeStreamBody = () => new ReadableStream({
      async pull(controller) {
        if (signal?.aborted) {
          controller.error(new DOMException('Aborted', 'AbortError'));
          return;
        }
        const offset = inFlight[index];
        if (offset >= bytes.byteLength) {
          controller.close();
          return;
        }
        const end = Math.min(offset + chunkSize, bytes.byteLength);
        controller.enqueue(bytes.subarray(offset, end));
        inFlight[index] = end;
        totals[index] = completed[index] + inFlight[index];
      },
    });

    const post = (body, extra) => fetchWithTimeout(
      url,
      {
        method: 'POST',
        body,
        // `text/plain` is CORS-safelisted, so no preflight is required.
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        cache: 'no-store',
        mode: 'cors',
        credentials: 'omit',
        ...extra,
      },
      timeoutMs === undefined ? CONFIG.net.phaseTimeoutMs : timeoutMs,
      scope.signal,
    );

    let response;
    try {
      response = await post(makeStreamBody(), { duplex: 'half' });
    } catch (err) {
      if (scope.timedOut()) throw err;
      if (isAbort(err, signal)) throw err;
      // Streaming bodies are not accepted by every server. Fall back to a
      // buffered body, which has no progress events but always works.
      inFlight[index] = 0;
      totals[index] = completed[index];
      response = await post(buffer, {});
    }

    await response.text().catch(() => {});

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    // The server accepted the payload, so count the whole body.
    completed[index] += size;
    inFlight[index] = 0;
    totals[index] = completed[index];
  };

  /** Best observed upload speed in bytes/second, used to size chunks. */
  let bestChunkBps = 0;

  const runStream = async (index) => {
    let step = 0;
    while (!stopped) {
      // The payload size adapts to the observed upload speed so a slow link
      // is not asked to push a 30 MB body that would take a minute.
      const size = pickChunkSize(step, (bestChunkBps * 8) / 1e6, sizes);
      step += 1;
      const blob = makeBlob(size);
      const url = `${activeSource}?cb=${cacheBuster()}`;
      const chunkStart = now();

      try {
        if (canUseXhr) {
          await uploadViaXhr(index, size, blob, url);
        } else {
          await uploadViaFetch(index, size, blob, url);
        }
        const bps = size / ((now() - chunkStart) / 1000);
        if (bps > bestChunkBps) bestChunkBps = bps;
      } catch (err) {
        // The phase deadline aborts in-flight requests on purpose; that is a
        // normal end of the phase, not a user cancellation.
        if (scope.timedOut()) return;
        if (isAbort(err, signal)) throw err;
        // Roll back the partial in-flight bytes so the total stays honest.
        inFlight[index] = 0;
        totals[index] = completed[index];

        if (activeSource !== CONFIG.endpoints.upload) {
          if (stopped) return;
          await new Promise((r) => setTimeout(r, 150));
          continue;
        }
        const fallback = CONFIG.fallbacks.upload[0];
        if (fallback) {
          activeSource = fallback;
          continue;
        }
        if (stopped) return;
        await new Promise((r) => setTimeout(r, 150));
      }

      if (now() - startedAt > durationMs + ignoreMs) return;
    }
  };

  const streamsPromise = Promise.all(
    Array.from({ length: streams }, (_, i) =>
      runStream(i).catch((err) => {
        if (scope.timedOut()) return;
        if (isAbort(err, signal)) throw err;
      }),
    ),
  );

  const reportTimer = setInterval(() => {
    const elapsed = now() - startedAt;

    if (elapsed >= ignoreMs && baseTime === 0) {
      baseTime = elapsed;
      baseBytes = totals.reduce((a, b) => a + b, 0);
    }

    if (baseTime > 0) {
      const windowMs = elapsed - baseTime;
      if (windowMs > 0) {
        const deltaBytes = totals.reduce((a, b) => a + b, 0) - baseBytes;
        const mbps = (deltaBytes * 8) / (windowMs * 1000);
        onProgress?.({ mbps: round(mbps, 2), bytes: deltaBytes, elapsedMs: Math.round(windowMs) });
      }
    }
  }, CONFIG.report.intervalMs);

  try {
    // The phase normally ends when the streams finish. The timeout is only a
    // safety net: when it fires, the data collected so far is still used
    // rather than failing the whole test.
    await Promise.race([
      streamsPromise,
      new Promise((resolve) =>
        setTimeout(resolve, CONFIG.net.phaseTimeoutMs),
      ),
    ]);
  } finally {
    stopped = true;
    clearInterval(reportTimer);
  }

  const endMs = now() - startedAt;
  if (baseTime === 0) {
    baseTime = Math.min(ignoreMs, endMs * 0.5);
    baseBytes = 0;
  }
  const totalBytes = totals.reduce((a, b) => a + b, 0);
  const windowMs = Math.max(1, endMs - baseTime);
  const finalMbps = ((totalBytes - baseBytes) * 8) / (windowMs * 1000);

  if (totalBytes <= 0) throw new Error('Upload test sent no data.');

  return {
    mbps: round(finalMbps, 2),
    bytes: totalBytes,
    durationMs: Math.round(endMs),
    usedFallback: activeSource !== CONFIG.endpoints.upload,
  };
}

/* ==========================================================================
   METADATA — IP, ISP, LOCATION, EDGE SERVER
   ========================================================================== */

/**
 * Collect connection metadata.
 *
 * Strategy:
 *  1. The download endpoint returns `cf-meta-*` headers (IP, colo, country,
 *     city, lat/long) that Cloudflare explicitly exposes via
 *     `access-control-expose-headers` — free, accurate, no extra request.
 *  2. `/meta` gives a richer JSON payload but is stricter about who may call
 *     it, so it is attempted and treated as optional.
 *  3. `/cdn-cgi/trace` is the most permissive and always answers.
 *
 * @param {AbortSignal} signal
 */
export async function collectMetadata(signal, seed = null) {
  const meta = {
    ip: null,
    isp: null,
    asn: null,
    city: null,
    country: null,
    countryCode: null,
    region: null,
    latitude: null,
    longitude: null,
    timezone: null,
    colo: null,
    coloCity: null,
    coloLat: null,
    coloLon: null,
    connectionType: null,
  };

  /* --- 0. Seed from headers captured during the download phase ----------- */
  if (seed) {
    meta.ip = seed.ip || null;
    meta.colo = seed.colo || null;
    meta.asn = seed.asn || null;
    meta.country = seed.country || null;
    meta.city = seed.city || null;
    meta.latitude = seed.latitude || null;
    meta.longitude = seed.longitude || null;
    meta.timezone = seed.timezone || null;
  }

  /* --- 1. Free metadata from the download response headers --------------- */
  if (!meta.ip || !meta.colo) {
    try {
      const response = await fetchWithTimeout(
        `${CONFIG.endpoints.download}?bytes=0&cb=${cacheBuster()}`,
        { method: 'GET', cache: 'no-store', mode: 'cors', credentials: 'omit' },
        6000,
        signal,
      );
      meta.ip = response.headers.get('cf-meta-ip') || meta.ip;
      meta.colo = response.headers.get('cf-meta-colo') || meta.colo;
      meta.asn = response.headers.get('cf-meta-asn') || meta.asn;
      meta.country = response.headers.get('cf-meta-country') || meta.country;
      meta.city = response.headers.get('cf-meta-city') || meta.city;
      meta.latitude = response.headers.get('cf-meta-latitude') || meta.latitude;
      meta.longitude = response.headers.get('cf-meta-longitude') || meta.longitude;
      meta.timezone = response.headers.get('cf-meta-timezone') || meta.timezone;
      await response.arrayBuffer();
    } catch {
      /* Non-fatal: the sources below can fill the gaps. */
    }
  }

  /* --- 2. Rich JSON metadata (optional) --------------------------------- */
  try {
    const response = await fetchWithTimeout(
      `${CONFIG.endpoints.meta}?cb=${cacheBuster()}`,
      { method: 'GET', cache: 'no-store', mode: 'cors', credentials: 'omit' },
      6000,
      signal,
    );
    if (response.ok) {
      const text = await response.text();
      if (text.trim().startsWith('{')) {
        const data = JSON.parse(text);
        meta.ip = data.clientIp || meta.ip;
        meta.asn = data.asn || meta.asn;
        meta.isp = data.asOrganization || meta.isp;
        meta.country = data.country || meta.country;
        meta.countryCode = data.country || meta.countryCode;
        meta.city = data.city || meta.city;
        meta.region = data.region || meta.region;
        meta.latitude = data.latitude || meta.latitude;
        meta.longitude = data.longitude || meta.longitude;
        meta.colo = data.colo?.iata || meta.colo;
        meta.coloCity = data.colo?.city || meta.coloCity;
        meta.coloLat = data.colo?.lat ?? null;
        meta.coloLon = data.colo?.lon ?? null;
      }
    }
  } catch {
    /* Optional — the trace endpoint below is the safety net. */
  }

  /* --- 3. Trace fallback (most permissive) -------------------------------- */
  if (!meta.ip || !meta.colo) {
    try {
      const response = await fetchWithTimeout(
        `${CONFIG.endpoints.trace}?cb=${cacheBuster()}`,
        { method: 'GET', cache: 'no-store', mode: 'cors', credentials: 'omit' },
        6000,
        signal,
      );
      if (response.ok) {
        const text = await response.text();
        const fields = Object.fromEntries(
          text.trim().split('\n').map((line) => {
            const idx = line.indexOf('=');
            return idx === -1 ? [line, ''] : [line.slice(0, idx), line.slice(idx + 1)];
          }),
        );
        meta.ip = fields.ip || meta.ip;
        meta.colo = fields.colo || meta.colo;
        meta.country = meta.country || fields.loc || null;
        meta.countryCode = meta.countryCode || fields.loc || null;
      }
    } catch {
      /* Nothing else to try. */
    }
  }

  meta.connectionType = describeConnectionType();
  return meta;
}

/**
 * Describe the client that ran the test, so the user can sanity-check the
 * result (e.g. "Chrome on desktop" vs "Safari on mobile").
 */
function describeConnectionType() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isMobile = /Android|iPhone|iPad|Mobile/i.test(ua);
  let browser = null;
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\//.test(ua)) browser = 'Opera';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';

  if (browser) return `${browser} on ${isMobile ? 'mobile' : 'desktop'}`;
  return isMobile ? 'Mobile device' : 'Desktop browser';
}

/**
 * Great-circle distance from the user to the test edge server, in km.
 * Uses the user's coordinates and the edge's own coordinates when Cloudflare
 * reports both. Returns null when the edge position is unknown.
 */
export function distanceKm(meta) {
  const userLat = Number(meta.latitude);
  const userLon = Number(meta.longitude);
  const edgeLat = Number(meta.coloLat);
  const edgeLon = Number(meta.coloLon);

  if (!Number.isFinite(userLat) || !Number.isFinite(userLon)) return null;
  if (!Number.isFinite(edgeLat) || !Number.isFinite(edgeLon)) return null;

  const R = 6371; // mean Earth radius in km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(edgeLat - userLat);
  const dLon = toRad(edgeLon - userLon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(userLat)) * Math.cos(toRad(edgeLat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/* ==========================================================================
   ORCHESTRATION
   ========================================================================== */

/**
 * Run the latency and download phases and return their results.
 *
 * These two phases are pure `fetch` work, so they are safe to run inside a
 * Web Worker where they keep the main thread free.
 *
 * @param {object} handlers
 * @param {(state: {phase: string, label: string}) => void} handlers.onPhase
 * @param {(data: object) => void} handlers.onPing
 * @param {(data: object) => void} handlers.onDownload
 * @param {AbortSignal} signal
 */
export async function runDownloadPhases({ onPhase, onPing, onDownload }, signal) {
  const startedAt = Date.now();

  /* --- Phase 1: Ping ----------------------------------------------------- */
  onPhase?.({ phase: 'ping', label: 'Measuring latency' });
  const ping = await measurePing(onPing, signal);

  /* --- Phase 2: Download -------------------------------------------------- */
  onPhase?.({ phase: 'download', label: 'Testing download speed' });
  const download = await measureDownload(onDownload, signal);

  return { ping, download, durationMs: Date.now() - startedAt };
}

/**
 * Run the full test: ping -> download -> upload -> metadata.
 *
 * This is the single-threaded path. It is used when no Web Worker is
 * available, and for the upload phase, which needs XMLHttpRequest (the only
 * browser API that reports upload progress) and therefore must run on the
 * main thread.
 *
 * @param {object} handlers
 * @param {(state: {phase: string, label: string}) => void} handlers.onPhase
 * @param {(data: object) => void} handlers.onPing
 * @param {(data: object) => void} handlers.onDownload
 * @param {(data: object) => void} handlers.onUpload
 * @param {AbortSignal} signal
 * @returns {Promise<object>} The final result payload.
 */
export async function runTest({ onPhase, onPing, onDownload, onUpload }, signal) {
  const startedAt = Date.now();

  /* --- Phase 1: Ping ----------------------------------------------------- */
  onPhase?.({ phase: 'ping', label: 'Measuring latency' });
  const ping = await measurePing(onPing, signal);

  /* --- Phase 2: Download -------------------------------------------------- */
  onPhase?.({ phase: 'download', label: 'Testing download speed' });
  const download = await measureDownload(onDownload, signal);

  /* --- Phase 3: Upload ---------------------------------------------------- */
  onPhase?.({ phase: 'upload', label: 'Testing upload speed' });
  const upload = await measureUpload(onUpload, signal);

  /* --- Metadata ---------------------------------------------------------- */
  onPhase?.({ phase: 'done', label: 'Finishing up' });
  let meta = {};
  try {
    // Seed from the edge headers captured during download so the common
    // case needs no extra request at all.
    meta = await collectMetadata(signal, download.edge);
  } catch {
    meta = {};
  }

  return {
    download: download.mbps,
    upload: upload.mbps,
    ping: ping.pingMs,
    jitter: ping.jitterMs,
    bytesDownloaded: download.bytes,
    bytesUploaded: upload.bytes,
    durationMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
    usedFallback: download.usedFallback || upload.usedFallback,
    meta,
  };
}
