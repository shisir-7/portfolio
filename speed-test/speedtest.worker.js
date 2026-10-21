/**
 * speedtest.worker.js — Web Worker wrapper for the measurement engine.
 *
 * Running the latency and download phases in a worker keeps the main thread
 * free, so the gauge, graph and animations stay perfectly smooth even while
 * multi-megabyte payloads are moving.
 *
 * The upload phase deliberately does NOT run here: it needs
 * XMLHttpRequest, which is the only browser API that reports upload
 * progress, and XMLHttpRequest does not exist in Web Workers. The main
 * thread runs that phase (see app.js).
 *
 * Protocol
 * --------
 *   main -> worker : { type: 'start' } | { type: 'cancel' }
 *   worker -> main : { type: 'phase' | 'ping' | 'download' | 'result' | 'error' }
 */

import { runDownloadPhases } from './engine.js';

/** Abort controller for the currently running test, if any. */
let activeController = null;

self.addEventListener('message', async (event) => {
  const message = event.data || {};

  switch (message.type) {
    case 'start': {
      // A second start while a test is running cancels the first.
      if (activeController) activeController.abort();
      activeController = new AbortController();
      const { signal } = activeController;

      try {
        const { ping, download } = await runDownloadPhases(
          {
            onPhase: (payload) => self.postMessage({ type: 'phase', ...payload }),
            onPing: (payload) => self.postMessage({ type: 'ping', ...payload }),
            onDownload: (payload) => self.postMessage({ type: 'download', ...payload }),
          },
          signal,
        );
        self.postMessage({
          type: 'result',
          // The same shape the main-thread path returns, so the UI can
          // consume either without caring where the work happened.
          result: {
            ping: {
              pingMs: ping.pingMs,
              jitterMs: ping.jitterMs,
              samples: ping.samples,
            },
            download: {
              mbps: download.mbps,
              bytes: download.bytes,
              durationMs: download.durationMs,
              usedFallback: download.usedFallback,
              edge: download.edge,
            },
          },
        });
      } catch (err) {
        const aborted = signal.aborted || err?.name === 'AbortError';
        self.postMessage({
          type: 'error',
          aborted,
          message: err?.message || 'The test failed unexpectedly.',
        });
      } finally {
        activeController = null;
      }
      break;
    }

    case 'cancel': {
      activeController?.abort();
      activeController = null;
      break;
    }

    default:
      break;
  }
});
