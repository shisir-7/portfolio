const BRAND = 'SpeedPulse';

const STORAGE = Object.freeze({
  theme: 'speedpulse:theme',
  history: 'speedpulse:history',
  unit: 'speedpulse:unit',
});

const HISTORY_LIMIT = 10;

const SPEED_LADDER = [25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
const PING_LADDER = [25, 50, 100, 200, 500, 1000];

const SMOOTH_WINDOW = 5;

const COUNT_UP_MS = 900;

const MAX_RAF_FRAME = 1000;

const $ = (id) => document.getElementById(id);

const dom = {
  html: document.documentElement,
  body: document.body,

  header: document.querySelector('.site-header'),
  themeToggle: $('theme-toggle'),
  unitToggle: document.querySelector('.unit-toggle'),
  unitButtons: Array.from(document.querySelectorAll('.unit-btn')),

  testCard: $('test-card'),
  stepper: $('stepper'),
  steps: Array.from(document.querySelectorAll('.step')),
  phaseLabel: $('phase-label'),
  phaseText: $('phase-text'),
  liveRegion: $('live-region'),

  gauge: $('gauge'),
  gaugeTrack: $('gauge-track'),
  gaugeValue: $('gauge-value'),
  gaugeCap: $('gauge-cap'),
  gaugeValueText: $('gauge-value-text'),
  gaugeUnit: $('gauge-unit'),
  gaugeScaleMax: $('gauge-scale-max'),
  gaugeScaleMin: $('gauge-scale-min'),

  startBtn: $('start-btn'),
  cancelBtn: $('cancel-btn'),
  againBtn: $('again-btn'),
  retryBtn: $('retry-btn'),

  graph: $('graph'),
  graphTitle: $('graph-title'),
  graphPeak: $('graph-peak'),

  alert: $('alert'),
  alertTitle: $('alert-title'),
  alertText: $('alert-text'),

  results: $('results'),
  resultTime: $('result-time'),
  verdict: $('verdict'),
  verdictIcon: $('verdict-icon'),
  verdictTitle: $('verdict-title'),
  verdictDesc: $('verdict-desc'),

  mDownload: $('m-download'),
  mUpload: $('m-upload'),
  mPing: $('m-ping'),
  mJitter: $('m-jitter'),
  mDownloadUnit: $('m-download-unit'),
  mUploadUnit: $('m-upload-unit'),
  mDownloadNote: $('m-download-note'),
  mUploadNote: $('m-upload-note'),
  mPingNote: $('m-ping-note'),
  mJitterNote: $('m-jitter-note'),

  infoIp: $('info-ip'),
  infoIsp: $('info-isp'),
  infoLocation: $('info-location'),
  infoServer: $('info-server'),
  infoDistance: $('info-distance'),
  infoType: $('info-type'),

  shareBtn: $('share-btn'),
  downloadImgBtn: $('download-img-btn'),
  resultsAgainBtn: $('results-again-btn'),
  copySummaryBtn: $('copy-summary-btn'),
  shareCanvas: $('share-canvas'),

  history: $('history'),
  historyList: $('history-list'),
  historyEmpty: $('history-empty'),
  clearHistoryBtn: $('clear-history-btn'),
};

const state = {
  
  phase: 'idle',
  
  unit: 'mbps',
  
  result: null,
  
  scaleMax: 100,
  
  ladder: SPEED_LADDER,
  
  liveValue: 0,
  
  rawValue: 0,
  
  samples: [],
  
  run: null,
  
  isPingPhase: false,
  
  peak: { download: 0, upload: 0 },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

function formatNumber(value, decimals) {
  if (decimals !== undefined) return value.toFixed(decimals);
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

const mbpsToMBps = (mbps) => mbps / 8;

function formatSpeed(mbps, { unit = state.unit, decimals } = {}) {
  const value = unit === 'mbs' ? mbpsToMBps(mbps) : mbps;
  return formatNumber(value, decimals);
}

const unitLabel = () => (state.unit === 'mbs' ? 'MB/s' : 'Mbps');

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function announce(message) {
  if (!dom.liveRegion) return;
  
  dom.liveRegion.textContent = '';
  window.setTimeout(() => {
    dom.liveRegion.textContent = message;
  }, 60);
}

function applyTheme(theme) {
  dom.html.dataset.theme = theme;
  const isLight = theme === 'light';

  if (dom.themeToggle) {
    dom.themeToggle.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
    dom.themeToggle.title = isLight ? 'Switch to dark theme' : 'Switch to light theme';
  }

  
  const meta = document.querySelector('meta[name="theme-color"]:not([media])')
    || document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isLight ? '#f5f7fc' : '#070b16');
}

function initTheme() {
  const stored = readStorage(STORAGE.theme, null);
  const systemLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(stored || (systemLight ? 'light' : 'dark'));

  dom.themeToggle?.addEventListener('click', () => {
    const next = dom.html.dataset.theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    writeStorage(STORAGE.theme, next);
    
    gauge.redraw();
  });

  
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (event) => {
    if (readStorage(STORAGE.theme, null)) return;
    applyTheme(event.matches ? 'light' : 'dark');
    gauge.redraw();
  });
}

function applyUnit(unit) {
  state.unit = unit;
  dom.unitToggle?.classList.toggle('is-mbs', unit === 'mbs');

  dom.unitButtons.forEach((button) => {
    const isActive = button.dataset.unit === unit;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  dom.gaugeUnit.textContent = unitLabel();
  if (dom.mDownloadUnit) dom.mDownloadUnit.textContent = unitLabel();
  if (dom.mUploadUnit) dom.mUploadUnit.textContent = unitLabel();

  
  if (state.result) {
    dom.mDownload.textContent = formatSpeed(state.result.download);
    dom.mUpload.textContent = formatSpeed(state.result.upload);
  }
  if (state.result) updateVerdict(state.result);
  writeStorage(STORAGE.unit, unit);
}

function initUnitToggle() {
  const stored = readStorage(STORAGE.unit, 'mbps');
  applyUnit(stored === 'mbs' ? 'mbs' : 'mbps');

  dom.unitButtons.forEach((button) => {
    button.addEventListener('click', () => {
      applyUnit(button.dataset.unit === 'mbs' ? 'mbs' : 'mbps');
    });
  });
}

const gauge = (() => {
  const cx = 160;
  const cy = 160;
  const radius = 128;
  const startAngle = 135;   
  const sweepAngle = 270;   

  const totalLength = 2 * Math.PI * radius * (sweepAngle / 360);

  
  function pointAt(angle) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  
  function arcPath(fromAngle, toAngle) {
    const start = pointAt(fromAngle);
    const end = pointAt(toAngle);
    const largeArc = Math.abs(toAngle - fromAngle) > 180 ? 1 : 0;
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  }

  let scaleMax = 100;
  let displayedRatio = 0;

  
  function redraw() {
    if (!dom.gaugeTrack) return;
    const d = arcPath(startAngle, startAngle + sweepAngle);
    dom.gaugeTrack.setAttribute('d', d);
    dom.gaugeValue.setAttribute('d', d);
    paint(displayedRatio);
  }

  
  function paint(ratio) {
    displayedRatio = clamp(ratio, 0, 1);
    const length = totalLength * displayedRatio;
    dom.gaugeValue.setAttribute('stroke-dasharray', `${length} ${totalLength}`);

    
    const angle = startAngle + sweepAngle * displayedRatio;
    const cap = pointAt(angle);
    dom.gaugeCap.setAttribute('cx', cap.x.toFixed(2));
    dom.gaugeCap.setAttribute('cy', cap.y.toFixed(2));
    
    dom.gaugeCap.style.opacity = displayedRatio > 0.01 ? '1' : '0';
  }

  
  function ensureScale(value) {
    const ladder = state.ladder;

    
    let index = ladder.findIndex((rung) => rung >= value);
    if (index === -1) index = ladder.length - 1;

    
    while (index < ladder.length - 1 && value > ladder[index] * 0.75) index += 1;

    
    while (index > 0 && value < ladder[index - 1] * 0.25) index -= 1;

    if (ladder[index] !== scaleMax) {
      scaleMax = ladder[index];
      state.scaleMax = scaleMax;
      updateScaleLabels();
    }
    return scaleMax;
  }

  
  function updateScaleLabels() {
    if (!dom.gaugeScaleMax) return;
    dom.gaugeScaleMax.textContent = formatNumber(scaleMax, 0);
    dom.gaugeScaleMin.textContent = '0';
  }

  
  function resetScale() {
    scaleMax = state.ladder[0];
    state.scaleMax = scaleMax;
    displayedRatio = 0;
    updateScaleLabels();
    paint(0);
  }

  
  function setLadder(ladder) {
    state.ladder = ladder;
    resetScale();
  }

  return { redraw, paint, ensureScale, resetScale, setLadder, totalLength, sweepAngle };
})();

function updateGauge(rawValue) {
  state.rawValue = rawValue;
  state.samples.push(rawValue);
  if (state.samples.length > SMOOTH_WINDOW) state.samples.shift();
  const smoothed = state.samples.reduce((a, b) => a + b, 0) / state.samples.length;
  state.liveValue = smoothed;

  const max = gauge.ensureScale(smoothed);
  gauge.paint(smoothed / max);

  if (state.isPingPhase) {
    
    dom.gaugeValueText.textContent = formatNumber(smoothed, smoothed >= 100 ? 0 : 1);
    dom.gaugeUnit.textContent = 'ms';
  } else {
    dom.gaugeValueText.textContent = formatSpeed(smoothed);
    dom.gaugeUnit.textContent = unitLabel();
  }
}

const graph = (() => {
  const canvas = dom.graph;
  const ctx = canvas.getContext('2d');
  
  let points = [];
  let cssWidth = 0;
  let cssHeight = 0;
  let dpr = 1;

  const PHASE_COLOR = {
    download: () => getComputedStyle(dom.html).getPropertyValue('--c-download').trim() || '#22d3ee',
    upload: () => getComputedStyle(dom.html).getPropertyValue('--c-upload').trim() || '#a855f7',
  };

  
  function resize() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssWidth = rect.width;
    cssHeight = rect.height;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function reset() {
    points = [];
    resize();
    draw();
  }

  
  function push(t, mbps, phase) {
    points.push({ t, mbps, phase });
    
    if (points.length > 800) points = points.filter((_, i) => i % 2 === 0 || i > points.length - 200);
    draw();
  }

  
  function peak() {
    return points.reduce((max, p) => Math.max(max, p.mbps), 0);
  }

  function draw() {
    if (!ctx) return;
    if (!cssWidth) resize();
    if (!cssWidth) return;

    const w = cssWidth;
    const h = cssHeight;
    const padLeft = 46;
    const padRight = 12;
    const padTop = 14;
    const padBottom = 22;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    ctx.clearRect(0, 0, w, h);

    
    const styles = getComputedStyle(dom.html);
    const textColor = styles.getPropertyValue('--text-3').trim() || '#6f7b94';
    const gridColor = styles.getPropertyValue('--border').trim() || 'rgba(255,255,255,0.1)';

    const elapsed = points.length ? points[points.length - 1].t : 0;
    const xMax = Math.max(8000, elapsed);
    const yMax = niceCeiling(peak() || 1);

    
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = padTop + (plotH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, Math.round(y) + 0.5);
      ctx.lineTo(padLeft + plotW, Math.round(y) + 0.5);
      ctx.stroke();
      const value = yMax - (yMax / gridLines) * i;
      ctx.fillText(`${Math.round(value)}`, padLeft - 8, y);
    }

    
    ctx.textAlign = 'left';
    ctx.fillText('0s', padLeft, h - padBottom + 11);
    ctx.textAlign = 'right';
    ctx.fillText(`${(xMax / 1000).toFixed(0)}s`, padLeft + plotW, h - padBottom + 11);

    if (points.length < 2) return;

    
    const toX = (t) => padLeft + (t / xMax) * plotW;
    const toY = (v) => padTop + plotH - (clamp(v, 0, yMax) / yMax) * plotH;

    
    const segments = [];
    let current = null;
    for (const point of points) {
      if (!current || current.phase !== point.phase) {
        current = { phase: point.phase, points: [point] };
        segments.push(current);
      } else {
        current.points.push(point);
      }
    }

    
    segments.forEach((segment) => {
      if (segment.points.length < 2) return;
      const color = PHASE_COLOR[segment.phase]?.() || '#22d3ee';
      const gradient = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
      gradient.addColorStop(0, withAlpha(color, 0.35));
      gradient.addColorStop(1, withAlpha(color, 0.02));

      ctx.beginPath();
      ctx.moveTo(toX(segment.points[0].t), padTop + plotH);
      segment.points.forEach((p) => ctx.lineTo(toX(p.t), toY(p.mbps)));
      ctx.lineTo(toX(segment.points[segment.points.length - 1].t), padTop + plotH);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    });

    
    ctx.lineWidth = 2.25;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    segments.forEach((segment) => {
      if (segment.points.length < 2) return;
      const color = PHASE_COLOR[segment.phase]?.() || '#22d3ee';
      ctx.beginPath();
      segment.points.forEach((p, i) => {
        const x = toX(p.t);
        const y = toY(p.mbps);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.stroke();
    });

    
    const last = points[points.length - 1];
    const lastColor = PHASE_COLOR[last.phase]?.() || '#22d3ee';
    ctx.beginPath();
    ctx.arc(toX(last.t), toY(last.mbps), 4, 0, Math.PI * 2);
    ctx.fillStyle = lastColor;
    ctx.fill();
  }

  
  function niceCeiling(value) {
    if (value <= 0) return 10;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    const normalized = value / magnitude;
    let step;
    if (normalized <= 1) step = 1;
    else if (normalized <= 2) step = 2;
    else if (normalized <= 5) step = 5;
    else step = 10;
    return step * magnitude;
  }

  
  function withAlpha(color, alpha) {
    const trimmed = color.trim();
    if (trimmed.startsWith('#')) {
      const hex = trimmed.slice(1);
      const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
      const num = parseInt(full.slice(0, 6), 16);
      return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
    }
    if (trimmed.startsWith('rgb(')) return trimmed.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
    return trimmed;
  }

  window.addEventListener('resize', () => {
    resize();
    draw();
  });

  return { reset, push, draw, peak, resize };
})();

const PHASE_ORDER = ['ping', 'download', 'upload', 'done'];

function setPhase(phase, label) {
  state.phase = phase;
  const activeIndex = PHASE_ORDER.indexOf(phase);

  dom.steps.forEach((step) => {
    const index = PHASE_ORDER.indexOf(step.dataset.step);
    step.classList.toggle('is-active', index === activeIndex);
    step.classList.toggle('is-done', index < activeIndex);
  });

  if (label) {
    
    
    if (dom.phaseText) dom.phaseText.textContent = label;
    dom.phaseLabel.classList.toggle('is-busy', phase !== 'done' && phase !== 'idle');
  }

  dom.testCard.dataset.state = phase === 'idle' ? 'idle' : phase === 'done' ? 'done' : 'running';
}

async function startTest() {
  if (state.phase === 'running') return;

  
  hideAlert();
  state.result = null;
  state.samples = [];
  state.peak = { download: 0, upload: 0 };
  state.isPingPhase = true;
  gauge.setLadder(PING_LADDER);
  updateGauge(0);
  dom.gaugeValueText.textContent = '0';
  graph.reset();
  dom.graphTitle.textContent = 'Live speed';
  dom.graphPeak.textContent = 'Peak 0 Mbps';

  
  dom.results.hidden = true;

  setPhase('ping', 'Measuring latency');
  announce('Starting speed test. Measuring latency.');

  dom.startBtn.classList.add('is-running');
  dom.startBtn.setAttribute('aria-hidden', 'true');
  dom.startBtn.disabled = true;
  dom.againBtn.hidden = true;
  dom.cancelBtn.hidden = false;
  dom.cancelBtn.focus({ preventScroll: true });

  const handlers = {
    onPhase: ({ phase, label }) => {
      state.isPingPhase = phase === 'ping';
      if (phase === 'ping') gauge.setLadder(PING_LADDER);
      if (phase === 'download' || phase === 'upload') gauge.setLadder(SPEED_LADDER);
      if (phase === 'download') dom.graphTitle.textContent = 'Download speed';
      if (phase === 'upload') dom.graphTitle.textContent = 'Upload speed';
      setPhase(phase, label);
      announce(label);
    },
    onPing: ({ medianMs }) => {
      updateGauge(medianMs);
    },
    onDownload: ({ mbps }) => {
      state.peak.download = Math.max(state.peak.download, mbps);
      updateGauge(mbps);
      dom.graphPeak.textContent = `Peak ${formatSpeed(state.peak.download)} ${unitLabel()}`;
      graph.push(testElapsed(), mbps, 'download');
    },
    onUpload: ({ mbps }) => {
      state.peak.upload = Math.max(state.peak.upload, mbps);
      updateGauge(mbps);
      dom.graphPeak.textContent = `Peak ${formatSpeed(state.peak.upload)} ${unitLabel()}`;
      graph.push(testElapsed(), mbps, 'upload');
    },
  };

  const startedAt = performance.now();
  state.testStartedAt = startedAt;

  try {
    
    
    
    
    
    
    
    const { ping, download } = await runDownloadPhases(handlers);

    handlers.onPhase({ phase: 'upload', label: 'Testing upload speed' });
    const upload = await runUploadPhase(handlers.onUpload);

    handlers.onPhase({ phase: 'done', label: 'Finishing up' });
    const meta = await collectMeta(download.edge);

    finishTest({
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
    });
  } catch (error) {
    if (error?.aborted) {
      handleCancel();
    } else {
      handleError(error);
    }
  }
}

function testElapsed() {
  return state.testStartedAt ? performance.now() - state.testStartedAt : 0;
}

async function runDownloadPhases(handlers) {
  let worker = null;
  let receivedMessage = false;

  try {
    worker = new Worker(new URL('./speedtest.worker.js', import.meta.url), { type: 'module' });
  } catch {
    
    return runDownloadPhasesOnMainThread(handlers);
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      if (worker) worker.terminate();
      state.run = null;
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const succeed = (result) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    worker.onmessage = (event) => {
      const message = event.data || {};
      receivedMessage = true;

      switch (message.type) {
        case 'phase': handlers.onPhase(message); break;
        case 'ping': handlers.onPing(message); break;
        case 'download': handlers.onDownload(message); break;
        case 'result': succeed(message.result); break;
        case 'error':
          fail({ aborted: message.aborted, message: message.message });
          break;
        default: break;
      }
    };

    worker.onerror = (event) => {
      event.preventDefault?.();
      
      
      if (!receivedMessage) {
        fail(new Error('__WORKER_FALLBACK__'));
      } else {
        fail(new Error(event.message || 'The test worker stopped unexpectedly.'));
      }
    };

    state.run = {
      cancel: () => {
        try { worker.postMessage({ type: 'cancel' }); } catch {  }
        fail({ aborted: true });
      },
    };

    worker.postMessage({ type: 'start' });
  }).catch((error) => {
    if (error?.message === '__WORKER_FALLBACK__') {
      return runDownloadPhasesOnMainThread(handlers);
    }
    throw error;
  });
}

async function runDownloadPhasesOnMainThread(handlers) {
  const { runDownloadPhases: run } = await import('./engine.js');
  const controller = new AbortController();
  state.run = {
    cancel: () => {
      controller.abort();
    },
  };
  try {
    const { ping, download } = await run(handlers, controller.signal);
    return { ping, download };
  } catch (error) {
    if (controller.signal.aborted || error?.name === 'AbortError') {
      throw { aborted: true };
    }
    throw error;
  }
}

async function runUploadPhase(onProgress) {
  const { measureUpload } = await import('./engine.js');
  const controller = new AbortController();
  state.run = {
    cancel: () => {
      controller.abort();
    },
  };
  try {
    return await measureUpload(onProgress, controller.signal);
  } catch (error) {
    if (controller.signal.aborted || error?.name === 'AbortError') {
      throw { aborted: true };
    }
    throw error;
  }
}

async function collectMeta(edge) {
  const { collectMetadata } = await import('./engine.js');
  try {
    return await collectMetadata(undefined, edge);
  } catch {
    return {};
  }
}

function finishTest(result) {
  state.result = result;
  state.phase = 'done';

  setPhase('done', 'Test complete');
  dom.startBtn.classList.remove('is-running');
  dom.startBtn.removeAttribute('aria-hidden');
  dom.startBtn.disabled = false;
  dom.cancelBtn.hidden = true;
  dom.againBtn.hidden = false;

  
  const finalMbps = result.download;
  const max = gauge.ensureScale(finalMbps);
  animateGauge(finalMbps, max, () => {
    dom.gaugeValueText.textContent = formatSpeed(finalMbps);
  });

  renderResults(result);
  saveHistory(result);

  dom.results.hidden = false;
  dom.history.hidden = false;
  dom.results.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });

  announce(
    `Test complete. Download ${formatSpeed(result.download, { unit: 'mbps' })} megabits per second, ` +
    `upload ${formatSpeed(result.upload, { unit: 'mbps' })} megabits per second, ` +
    `ping ${result.ping} milliseconds, jitter ${result.jitter} milliseconds.`,
  );
}

function animateGauge(target, max, onDone) {
  if (prefersReducedMotion()) {
    gauge.paint(target / max);
    onDone?.();
    return;
  }

  const from = state.liveValue || 0;
  const start = performance.now();
  let frame = 0;

  const step = (now) => {
    frame += 1;
    if (frame > MAX_RAF_FRAME) {
      gauge.paint(target / max);
      onDone?.();
      return;
    }
    const t = clamp((now - start) / COUNT_UP_MS, 0, 1);
    const eased = 1 - (1 - t) ** 3;   
    const value = from + (target - from) * eased;
    gauge.paint(value / max);
    dom.gaugeValueText.textContent = formatSpeed(value);
    if (t < 1) requestAnimationFrame(step);
    else onDone?.();
  };
  requestAnimationFrame(step);
}

function renderResults(result) {
  const meta = result.meta || {};

  dom.mDownload.textContent = formatSpeed(result.download);
  dom.mUpload.textContent = formatSpeed(result.upload);
  dom.mPing.textContent = formatNumber(result.ping, result.ping >= 100 ? 0 : 1);
  dom.mJitter.textContent = formatNumber(result.jitter, result.jitter >= 100 ? 0 : 1);

  dom.mDownloadNote.textContent = describeDownload(result.download);
  dom.mUploadNote.textContent = describeUpload(result.upload);
  dom.mPingNote.textContent = describePing(result.ping);
  dom.mJitterNote.textContent = describeJitter(result.jitter);

  dom.resultTime.textContent = new Date(result.timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  
  dom.infoIp.textContent = meta.ip || 'Unavailable';
  dom.infoIsp.textContent = [meta.isp, meta.asn ? `AS${meta.asn}` : null].filter(Boolean).join(' · ') || 'Unavailable';
  dom.infoLocation.textContent = [meta.city, meta.country].filter(Boolean).join(', ') || 'Unavailable';
  dom.infoServer.textContent = meta.colo
    ? `${meta.colo}${meta.coloCity ? ` · ${meta.coloCity}` : ''}`
    : 'Unavailable';
  dom.infoType.textContent = meta.connectionType || 'Unavailable';

  const distance = distanceKm(meta);
  dom.infoDistance.textContent = distance !== null ? `~${distance} km` : 'Unavailable';

  updateVerdict(result);
}

function distanceKm(meta) {
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

const VERDICT_ICONS = {
  excellent: '<path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z" fill="currentColor"/>',
  great: '<path d="M13 2 4.5 13.5H11L9.8 22 19 10h-6.6L13 2z" fill="currentColor"/>',
  good: '<path d="M4 13.5h3.2l1.8-5.6 2.6 10.4 2.2-7.4 1.6 2.6H20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  fair: '<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.6V12l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  slow: '<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.6 8.6l6.8 6.8M15.4 8.6l-6.8 6.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
};

function buildVerdict(result) {
  const down = result.download;
  const up = result.upload;
  const ping = result.ping;

  if (down >= 300) {
    return {
      key: 'excellent',
      title: 'Excellent connection',
      desc: 'Outstanding — 4K on multiple screens, large game downloads and HD video calls all run without a hitch.',
      color: 'var(--c-green)',
    };
  }
  if (down >= 100) {
    return {
      key: 'great',
      title: 'Great connection',
      desc: 'Great for 4K streaming, gaming, video calls and big downloads. You will not notice it struggling.',
      color: 'var(--c-cyan)',
    };
  }
  if (down >= 25) {
    return {
      key: 'good',
      title: 'Good connection',
      desc: 'Comfortable for HD streaming, browsing and video calls. 4K on one screen is usually fine.',
      color: 'var(--c-blue)',
    };
  }
  if (down >= 10) {
    return {
      key: 'fair',
      title: 'Fair connection',
      desc: 'Fine for everyday browsing and HD video, but 4K streaming and large downloads may feel slow.',
      color: 'var(--c-amber)',
    };
  }
  if (up >= 10 && ping <= 80) {
    return {
      key: 'fair',
      title: 'Modest connection',
      desc: 'Usable for browsing and calls, but expect buffering on HD video and slow uploads.',
      color: 'var(--c-amber)',
    };
  }
  return {
    key: 'slow',
    title: 'Slow connection',
    desc: 'Expect buffering on video and slow page loads. A wired connection or a closer router may help a lot.',
    color: 'var(--c-rose)',
  };
}

function updateVerdict(result) {
  const verdict = buildVerdict(result);
  dom.verdictTitle.textContent = verdict.title;
  dom.verdictDesc.textContent = verdict.desc;
  dom.verdictIcon.innerHTML = `<svg viewBox="0 0 24 24" focusable="false">${VERDICT_ICONS[verdict.key]}</svg>`;
  dom.verdictIcon.style.color = verdict.color;
  dom.verdictIcon.style.background = `color-mix(in srgb, ${verdict.color} 16%, transparent)`;
}

function describeDownload(mbps) {
  if (mbps >= 300) {
    const streams = Math.floor(mbps / 25);
    return `Enough for ${streams}+ simultaneous 4K streams`;
  }
  if (mbps >= 100) {
    const streams = Math.floor(mbps / 25);
    return `Enough for ${streams} 4K stream${streams === 1 ? '' : 's'}`;
  }
  if (mbps >= 25) return 'Enough for 1 HD stream plus browsing';
  if (mbps >= 10) return 'HD streaming works, 4K will buffer';
  if (mbps >= 5) return 'One HD stream at a time';
  return 'Basic browsing only';
}

function describeUpload(mbps) {
  if (mbps >= 50) return 'Great for cloud backup and HD video calls';
  if (mbps >= 10) return 'Fine for video calls and photo uploads';
  if (mbps >= 2) return 'OK for messaging, slow for large uploads';
  return 'Limited — expect stalled uploads';
}

function describePing(ms) {
  if (ms <= 30) return 'Excellent for gaming and video calls';
  if (ms <= 60) return 'Good for calls, noticeable in games';
  if (ms <= 100) return 'Usable, but lag is noticeable in calls';
  return 'High — calls and games will feel sluggish';
}

function describeJitter(ms) {
  if (ms <= 10) return 'Very stable connection';
  if (ms <= 30) return 'Acceptable for calls';
  if (ms <= 60) return 'Some instability — audio may wobble';
  return 'Unstable — expect stutter in calls';
}

function loadHistory() {
  const stored = readStorage(STORAGE.history, []);
  return Array.isArray(stored) ? stored.slice(0, HISTORY_LIMIT) : [];
}

function saveHistory(result) {
  const history = loadHistory();
  const entry = {
    timestamp: result.timestamp,
    download: result.download,
    upload: result.upload,
    ping: result.ping,
    jitter: result.jitter,
    colo: result.meta?.colo || null,
    country: result.meta?.country || null,
  };
  history.unshift(entry);
  const trimmed = history.slice(0, HISTORY_LIMIT);
  writeStorage(STORAGE.history, trimmed);
  renderHistory(trimmed);
}

function renderHistory(history) {
  const list = dom.historyList;
  list.innerHTML = '';

  if (!history.length) {
    dom.historyEmpty.hidden = false;
    return;
  }
  dom.historyEmpty.hidden = true;

  const maxDownload = Math.max(...history.map((h) => h.download), 1);

  history.forEach((entry) => {
    const item = document.createElement('li');
    item.className = 'history-item';

    const when = new Date(entry.timestamp);
    const timeLabel = when.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    item.innerHTML = `
      <div>
        <p class="history-when">${escapeHtml(timeLabel)}</p>
        <p class="history-stats">
          <span class="history-stat"><i class="history-dot" style="background:var(--c-download)"></i>↓ <b>${formatSpeed(entry.download)}</b> ${unitLabel()}</span>
          <span class="history-stat"><i class="history-dot" style="background:var(--c-upload)"></i>↑ <b>${formatSpeed(entry.upload)}</b> ${unitLabel()}</span>
          <span class="history-stat"><i class="history-dot" style="background:var(--c-ping)"></i>⌁ <b>${formatNumber(entry.ping, 1)}</b> ms</span>
        </p>
      </div>
      <div>
        <div class="history-bar"><i style="width:${clamp((entry.download / maxDownload) * 100, 3, 100).toFixed(1)}%"></i></div>
      </div>`;
    list.appendChild(item);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function buildSummary(result) {
  const meta = result.meta || {};
  const lines = [
    `${BRAND} result — ${new Date(result.timestamp).toLocaleString()}`,
    '',
    `Download: ${formatSpeed(result.download, { unit: 'mbps' })} Mbps`,
    `Upload:   ${formatSpeed(result.upload, { unit: 'mbps' })} Mbps`,
    `Ping:     ${result.ping} ms`,
    `Jitter:   ${result.jitter} ms`,
  ];
  if (meta.ip) lines.push(`IP:       ${meta.ip}`);
  if (meta.isp) lines.push(`ISP:      ${meta.isp}`);
  if (meta.colo) lines.push(`Server:   ${meta.colo}${meta.coloCity ? ` (${meta.coloCity})` : ''}`);
  lines.push('', buildVerdict(result).desc);
  return lines.join('\n');
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function flashButton(button, message, original) {
  if (!button) return;
  const originalText = original ?? button.textContent;
  button.textContent = message;
  window.setTimeout(() => {
    button.textContent = originalText;
  }, 1800);
}

async function renderShareImage(result) {
  const { renderShareImage: draw } = await import('./share.js');

  const styles = getComputedStyle(dom.html);
  const isLight = dom.html.dataset.theme === 'light';
  const accentA = styles.getPropertyValue('--c-cyan').trim() || '#22d3ee';
  const accentB = styles.getPropertyValue('--c-violet').trim() || '#a855f7';
  const meta = result.meta || {};

  const theme = {
    brand: BRAND,
    text: isLight ? '#0d1526' : '#eef2fb',
    sub: isLight ? '#4a5568' : '#a8b2c8',
    accentA,
    accentB,
    isLight,
    downloadText: formatSpeed(result.download, { unit: 'mbps' }),
    chips: [
      { label: 'Upload', value: `${formatSpeed(result.upload, { unit: 'mbps' })} Mbps`, color: accentB },
      { label: 'Ping', value: `${result.ping} ms`, color: styles.getPropertyValue('--c-amber').trim() || '#fbbf24' },
      { label: 'Jitter', value: `${result.jitter} ms`, color: styles.getPropertyValue('--c-green').trim() || '#34d399' },
    ],
    verdict: buildVerdict(result).desc,
    footerLeft: [meta.ip, meta.isp, meta.colo ? `Edge ${meta.colo}` : null].filter(Boolean).join('  ·  '),
    footerRight: new Date(result.timestamp).toLocaleString(),
  };

  return draw(dom.shareCanvas, result, theme);
}

async function downloadResultImage() {
  if (!state.result) return;
  const canvas = await renderShareImage(state.result);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `speedpulse-${new Date(state.result.timestamp).toISOString().replace(/[:.]/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}

async function shareResult() {
  if (!state.result) return;
  const summary = buildSummary(state.result);
  const copied = await copyToClipboard(summary);

  if (navigator.share) {
    try {
      const canvas = await renderShareImage(state.result);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      const file = blob ? new File([blob], 'speedpulse-result.png', { type: 'image/png' }) : null;
      await navigator.share({
        title: `${BRAND} result`,
        text: summary,
        ...(file ? { files: [file] } : {}),
      });
      return;
    } catch {
      
    }
  }

  flashButton(dom.shareBtn, copied ? 'Copied to clipboard' : 'Could not copy', 'Share result');
}

function showAlert(title, message) {
  dom.alertTitle.textContent = title;
  dom.alertText.textContent = message;
  dom.alert.hidden = false;
}

function hideAlert() {
  dom.alert.hidden = true;
}

function handleError(error) {
  state.phase = 'error';
  setPhase('idle', 'Test failed');

  dom.startBtn.classList.remove('is-running');
  dom.startBtn.removeAttribute('aria-hidden');
  dom.startBtn.disabled = false;
  dom.cancelBtn.hidden = true;

  const offline = !navigator.onLine;
  let title = 'Test failed';
  let message = error?.message || 'Something went wrong while running the test.';

  if (offline) {
    title = 'You appear to be offline';
    message = 'Connect to a network and try again.';
  } else if (/Failed to fetch|NetworkError|load failed/i.test(message)) {
    title = 'Could not reach the test server';
    message = 'The request was blocked or the server did not respond. This can happen with a firewall, a VPN or a strict privacy extension. Please try again.';
  } else if (/CORS/i.test(message)) {
    title = 'The request was blocked';
    message = 'A browser extension or network policy is blocking cross-origin requests to the test server. Please try again or disable the blocking extension.';
  }

  showAlert(title, message);
  announce(`${title}. ${message}`);
  dom.retryBtn.focus({ preventScroll: true });
}

function handleCancel() {
  state.phase = 'idle';
  setPhase('idle', 'Test cancelled');

  dom.startBtn.classList.remove('is-running');
  dom.startBtn.removeAttribute('aria-hidden');
  dom.startBtn.disabled = false;
  dom.cancelBtn.hidden = true;

  showAlert('Test cancelled', 'The test was stopped. Run it again whenever you are ready.');
  announce('Test cancelled.');
  dom.startBtn.focus({ preventScroll: true });
}

function initTooltips() {
  let tooltip = null;

  const ensureTooltip = () => {
    if (tooltip) return tooltip;
    tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.hidden = true;
    document.body.appendChild(tooltip);
    return tooltip;
  };

  const show = (trigger) => {
    const el = ensureTooltip();
    const text = trigger.dataset.tip;
    if (!text) return;
    el.textContent = text;
    el.hidden = false;

    const rect = trigger.getBoundingClientRect();
    const tipRect = el.getBoundingClientRect();
    const left = clamp(
      rect.left + rect.width / 2 - tipRect.width / 2,
      12,
      window.innerWidth - tipRect.width - 12,
    );
    const above = rect.top - tipRect.height - 10;
    el.style.left = `${left}px`;
    el.style.top = `${above > 12 ? above : rect.bottom + 10}px`;
  };

  const hide = () => {
    if (tooltip) tooltip.hidden = true;
  };

  document.querySelectorAll('.tip').forEach((trigger) => {
    trigger.addEventListener('mouseenter', () => show(trigger));
    trigger.addEventListener('mouseleave', hide);
    trigger.addEventListener('focus', () => show(trigger));
    trigger.addEventListener('blur', hide);
    
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      const isVisible = tooltip && !tooltip.hidden;
      if (isVisible) {
        hide();
      } else {
        show(trigger);
        window.setTimeout(hide, 4000);
      }
    });
  });
}

function initReveal() {
  const targets = document.querySelectorAll('.section, .site-footer');
  targets.forEach((el) => el.classList.add('reveal'));

  if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
  );

  targets.forEach((el) => observer.observe(el));
}

function initEvents() {
  dom.startBtn.addEventListener('click', startTest);
  dom.againBtn.addEventListener('click', startTest);
  dom.resultsAgainBtn.addEventListener('click', () => {
    document.getElementById('test')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    window.setTimeout(startTest, prefersReducedMotion() ? 0 : 450);
  });

  dom.cancelBtn.addEventListener('click', () => {
    state.run?.cancel();
  });

  dom.retryBtn.addEventListener('click', () => {
    hideAlert();
    startTest();
  });

  dom.shareBtn.addEventListener('click', () => { shareResult(); });
  dom.downloadImgBtn.addEventListener('click', () => { downloadResultImage(); });
  dom.copySummaryBtn.addEventListener('click', async () => {
    if (!state.result) return;
    const ok = await copyToClipboard(buildSummary(state.result));
    flashButton(dom.copySummaryBtn, ok ? 'Copied!' : 'Copy failed', 'Copy summary');
  });

  dom.clearHistoryBtn.addEventListener('click', () => {
    writeStorage(STORAGE.history, []);
    renderHistory([]);
    announce('History cleared.');
  });

  
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.phase === 'running') {
      state.run?.cancel();
    }
  });

  
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.phase === 'running') {
      state.run?.cancel();
    }
  });

  
  const onScroll = () => {
    dom.header?.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function init() {
  initTheme();
  initUnitToggle();
  initEvents();
  initTooltips();
  initReveal();

  gauge.redraw();
  graph.reset();
  renderHistory(loadHistory());

  
  dom.history.hidden = false;

  
  window.addEventListener('offline', () => {
    if (state.phase === 'idle') showAlert('You appear to be offline', 'Connect to a network and try again.');
  });
  window.addEventListener('online', () => {
    if (state.phase === 'idle') hideAlert();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
