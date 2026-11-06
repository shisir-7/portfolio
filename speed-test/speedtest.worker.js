import { runDownloadPhases } from './engine.js';

let activeController = null;

self.addEventListener('message', async (event) => {
  const message = event.data || {};

  switch (message.type) {
    case 'start': {
      
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
