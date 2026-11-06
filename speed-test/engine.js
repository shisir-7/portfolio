export const CONFIG = Object.freeze({
  
  endpoints: Object.freeze({
    download: 'https://speed.cloudflare.com/__down',
    upload: 'https://speed.cloudflare.com/__up',
    meta: 'https://speed.cloudflare.com/meta',
    trace: 'https://speed.cloudflare.com/cdn-cgi/trace',
  }),

  
  fallbacks: Object.freeze({
    ping: Object.freeze([
      
      'https://httpbingo.org/bytes/1',
    ]),
    download: Object.freeze([
      
      'https://cdn.jsdelivr.net/npm/typescript@5.5.4/lib/typescript.js',
    ]),
    upload: Object.freeze([
      
      'https://httpbin.org/post',
    ]),
  }),

  
  ping: Object.freeze({
    samples: 20,
    warmup: 1,
    timeoutMs: 5000,
  }),

  
  download: Object.freeze({
    streams: 5,
    durationMs: 11000,
    ignoreMs: 1800,
    timeoutMs: 30000,
    
    sizes: [100 * 1024, 1024 * 1024, 10 * 1024 * 1024, 25 * 1024 * 1024, 50 * 1024 * 1024],
    
    maxBytes: 99_999_999,
  }),

  
  upload: Object.freeze({
    streams: 3,
    durationMs: 10000,
    ignoreMs: 1500,
    timeoutMs: 45000,
    
    sizes: [1024 * 1024, 5 * 1024 * 1024, 15 * 1024 * 1024, 30 * 1024 * 1024],
  }),

  
  report: Object.freeze({
    intervalMs: 150,   
  }),

  
  net: Object.freeze({
    
    overallTimeoutMs: 90_000,
    
    phaseTimeoutMs: 45_000,
  }),
});

const now = () => performance.now();

function cacheBuster() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${rand}`;
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function filterStalls(values, factor = 2.5, slack = 20) {
  if (values.length < 4) return values;
  const ceiling = median(values) * factor + slack;
  const kept = values.filter((v) => v <= ceiling);
  
  return kept.length >= 4 ? kept : values;
}

export function jitter(values) {
  if (values.length < 2) return 0;

  const kept = filterStalls(values);
  if (kept.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < kept.length; i++) total += Math.abs(kept[i] - kept[i - 1]);
  return total / (kept.length - 1);
}

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

function isAbort(err, signal) {
  return signal?.aborted || err?.name === 'AbortError';
}

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

export async function measurePing(onProgress, signal) {
  const { samples: totalSamples, warmup, timeoutMs } = CONFIG.ping;
  const samples = [];
  const deadline = now() + CONFIG.net.overallTimeoutMs;

  
  const sources = [
    { build: () => `${CONFIG.endpoints.download}?bytes=0&cb=${cacheBuster()}` },
    ...CONFIG.fallbacks.ping.map((url) => ({ build: () => `${url}?cb=${cacheBuster()}` })),
  ];
  let sourceIndex = 0;

  for (let i = 0; i < totalSamples; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    
    
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
      
      if (sourceIndex < sources.length - 1) {
        sourceIndex += 1;
        i -= 1; 
        continue;
      }
      
      
      if (i > totalSamples - 4 && samples.length === 0) {
        throw new Error('Could not reach the test server. Check your connection or try again.');
      }
      continue;
    }

    
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
    
    
    pingMs: stats.pingMs,
    jitterMs: stats.jitterMs,
    minMs: stats.minMs,
    maxMs: stats.maxMs,
    samples: samples.map((v) => round(v, 2)),
  };
}

function downloadUrls(source, size) {
  if (source === CONFIG.endpoints.download) {
    return [`${source}?bytes=${size}&cb=${cacheBuster()}`];
  }
  return [`${source}?cb=${cacheBuster()}`];
}

function pickChunkSize(step, mbps, ladder) {
  const maxIndex = ladder.length - 1;
  let index = Math.min(step, maxIndex);

  if (mbps > 0) {
    
    const seconds = 4;
    const affordable = Math.floor((mbps * 1e6 * seconds) / 8);
    let capIndex = 0;
    ladder.forEach((size, i) => { if (size <= affordable) capIndex = i; });
    index = Math.min(index, capIndex);
  }
  return ladder[Math.max(0, index)];
}

export async function measureDownload(onProgress, signal) {
  const { streams, durationMs, ignoreMs, sizes } = CONFIG.download;
  const startedAt = now();

  
  
  
  const scope = createPhaseScope(signal, durationMs + ignoreMs);

  
  const totals = new Array(streams).fill(0);
  
  let baseBytes = 0;
  let baseTime = 0;
  let stopped = false;
  
  let activeSource = CONFIG.endpoints.download;
  
  let edge = null;
  
  let bestChunkBps = 0;

  
  const recordChunkSpeed = (bytesPerSecond) => {
    if (bytesPerSecond > bestChunkBps) bestChunkBps = bytesPerSecond;
  };

  
  const runStream = async (index) => {
    let step = 0;
    while (!stopped) {
      
      
      
      const size = pickChunkSize(step, (bestChunkBps * 8) / 1e6, sizes);
      step += 1;
      const url = downloadUrls(activeSource, size)[0];
      const chunkStart = now();

      try {
        
        
        
        
        const response = await fetchWithTimeout(
          url,
          { method: 'GET', cache: 'no-store', mode: 'cors', credentials: 'omit' },
          CONFIG.net.phaseTimeoutMs,
          scope.signal,
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        
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
        
        
        if (scope.timedOut()) return;
        if (isAbort(err, signal)) throw err;
        
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

export async function measureUpload(onProgress, signal) {
  const { streams, durationMs, ignoreMs, timeoutMs, sizes } = CONFIG.upload;
  const startedAt = now();

  
  const scope = createPhaseScope(signal, durationMs + ignoreMs);

  
  const totals = new Array(streams).fill(0);
  
  const completed = new Array(streams).fill(0);
  
  const inFlight = new Array(streams).fill(0);

  let baseBytes = 0;
  let baseTime = 0;
  let stopped = false;
  let activeSource = CONFIG.endpoints.upload;

  
  const canUseXhr = typeof XMLHttpRequest !== 'undefined';

  
  const makeBlob = (size) => {
    const buffer = new ArrayBuffer(size);
    const view = new Uint8Array(buffer);
    
    
    for (let offset = 0; offset < size; offset += 32768) {
      const chunk = new Uint8Array(Math.min(32768, size - offset));
      crypto.getRandomValues(chunk);
      view.set(chunk, offset);
    }
    return new Blob([buffer], { type: 'application/octet-stream' });
  };

  
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
        try { xhr.abort(); } catch {  }
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      };

      if (scope.signal.aborted) { onAbort(); return; }
      scope.signal.addEventListener('abort', onAbort, { once: true });

      xhr.open('POST', url, true);
      xhr.withCredentials = false;
      
      
      xhr.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
      
      
      
      xhr.timeout = Math.max(timeoutMs, CONFIG.net.phaseTimeoutMs);

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        
        
        inFlight[index] = event.loaded;
        totals[index] = completed[index] + inFlight[index];
      };

      xhr.onload = () => {
        if (settled) return;
        settled = true;
        cleanup();
        
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
      
      
      inFlight[index] = 0;
      totals[index] = completed[index];
      response = await post(buffer, {});
    }

    await response.text().catch(() => {});

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    
    completed[index] += size;
    inFlight[index] = 0;
    totals[index] = completed[index];
  };

  
  let bestChunkBps = 0;

  const runStream = async (index) => {
    let step = 0;
    while (!stopped) {
      
      
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
        
        
        if (scope.timedOut()) return;
        if (isAbort(err, signal)) throw err;
        
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
      
    }
  }

  
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
    
  }

  
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
      
    }
  }

  meta.connectionType = describeConnectionType();
  return meta;
}

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

export function distanceKm(meta) {
  const userLat = Number(meta.latitude);
  const userLon = Number(meta.longitude);
  const edgeLat = Number(meta.coloLat);
  const edgeLon = Number(meta.coloLon);

  if (!Number.isFinite(userLat) || !Number.isFinite(userLon)) return null;
  if (!Number.isFinite(edgeLat) || !Number.isFinite(edgeLon)) return null;

  const R = 6371; 
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(edgeLat - userLat);
  const dLon = toRad(edgeLon - userLon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(userLat)) * Math.cos(toRad(edgeLat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export async function runDownloadPhases({ onPhase, onPing, onDownload }, signal) {
  const startedAt = Date.now();

  
  onPhase?.({ phase: 'ping', label: 'Measuring latency' });
  const ping = await measurePing(onPing, signal);

  
  onPhase?.({ phase: 'download', label: 'Testing download speed' });
  const download = await measureDownload(onDownload, signal);

  return { ping, download, durationMs: Date.now() - startedAt };
}

export async function runTest({ onPhase, onPing, onDownload, onUpload }, signal) {
  const startedAt = Date.now();

  
  onPhase?.({ phase: 'ping', label: 'Measuring latency' });
  const ping = await measurePing(onPing, signal);

  
  onPhase?.({ phase: 'download', label: 'Testing download speed' });
  const download = await measureDownload(onDownload, signal);

  
  onPhase?.({ phase: 'upload', label: 'Testing upload speed' });
  const upload = await measureUpload(onUpload, signal);

  
  onPhase?.({ phase: 'done', label: 'Finishing up' });
  let meta = {};
  try {
    
    
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
