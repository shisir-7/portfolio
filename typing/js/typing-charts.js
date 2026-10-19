/**
 * Typing Test — Lightweight Interactive Charts (Oct 2026 premium rebuild)
 * Dependency-free Canvas 2D: DPR-aware, animated, hover-interactive.
 * A per-canvas registry stores geometry for hit-testing; a shared
 * tooltip + crosshair is drawn on the canvas itself.
 *
 * Each chart reuses this module. No fabricated values are ever drawn —
 * only the arrays passed in by the caller.
 */

window.TypingCharts = (function () {
  'use strict';

  /* ── palette helpers ─────────────────────────────────────────────── */
  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function themeColors() {
    return {
      accent: cssVar('--accent', '#BD3A1B'),
      accentMuted: cssVar('--accent-muted', 'rgba(189,58,27,0.12)'),
      textMuted: cssVar('--text-muted', '#7E796F'),
      textPrimary: cssVar('--text-primary', '#121211'),
      bgPrimary: cssVar('--bg-primary', '#F7F5F0'),
      surface: cssVar('--surface-card', '#FFFFFF'),
      border: cssVar('--border-subtle', '#E8E4DA'),
      correct: cssVar('--tt-correct', '#2e7d4f'),
      incorrect: cssVar('--tt-incorrect', '#bd3a1b'),
      extra: cssVar('--tt-extra', '#a06a00'),
      missed: cssVar('--tt-missed', '#7e796f'),
      raw: cssVar('--tt-raw', '#5b7ba6')
    };
  }

  const DEFAULTS = {
    padding: { top: 22, right: 18, bottom: 28, left: 46 },
    gridColor: 'rgba(126, 121, 111, 0.15)',
    axisColor: 'rgba(126, 121, 111, 0.35)',
    labelColor: '#7E796F',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9.5
  };

  /* ── shared tooltip (one per page) ───────────────────────────────── */
  let tipEl = null;

  function getTip() {
    if (tipEl) return tipEl;
    tipEl = document.createElement('div');
    tipEl.className = 'chart-tooltip';
    tipEl.style.display = 'none';
    document.body.appendChild(tipEl);
    return tipEl;
  }

  function showTip(html, x, y) {
    const el = getTip();
    el.innerHTML = html;
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
    el.style.display = '';
    requestAnimationFrame(() => el.classList.add('visible'));
  }

  function hideTip() {
    if (!tipEl) return;
    tipEl.classList.remove('visible');
    tipEl.style.display = 'none';
  }

  /* ── canvas setup ─────────────────────────────────────────────────── */
  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    let w = Math.round(rect.width);
    let h = Math.round(rect.height);
    // Hidden canvases (display:none views) report 0 — fall back to the
    // parent's layout width so charts render crisp on first paint.
    if (w < 40) {
      const pw = canvas.parentElement ? Math.round(canvas.parentElement.getBoundingClientRect().width) : 0;
      w = pw > 80 ? pw : 960;
    }
    if (h < 40) {
      h = canvas.hasAttribute('height') ? parseInt(canvas.getAttribute('height'), 10) || 260
          : (canvas.parentElement ? Math.round(canvas.parentElement.clientHeight) || 0 : 0) || 260;
    }
    w = Math.max(120, w) || 320;
    h = Math.max(120, h) || 220;
    const dpr = window.devicePixelRatio || 1;
    // Match the CSS size exactly so the canvas is not stretched.
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // Crisp text / lines on high-DPI
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    return { ctx, w, h, dpr };
  }

  function niceMax(v) {
    if (v <= 0) return 10;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / pow;
    let nice;
    if (n <= 1) nice = 1;
    else if (n <= 2) nice = 2;
    else if (n <= 5) nice = 5;
    else nice = 10;
    return nice * pow;
  }

  /* ── curve helper — Catmull-Rom → Bezier for a smoother line ─────── */
  function drawSmoothLine(ctx, pts) {
    if (pts.length < 2) return;
    if (pts.length === 2) {
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      return;
    }
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
  }

  /* ── per-canvas registry ──────────────────────────────────────────── */
  const REG = new WeakMap();

  function register(canvas, meta) { REG.set(canvas, meta); }

  function nearestIndex(points, x) {
    let best = 0, bestD = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  /* ── empty state ──────────────────────────────────────────────────── */
  function drawEmpty(ctx, w, h, opt, msg) {
    ctx.fillStyle = opt.labelColor || DEFAULTS.labelColor;
    ctx.font = DEFAULTS.fontSize + 'px ' + DEFAULTS.fontFamily;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg || '—', w / 2, h / 2);
  }

  /* ════════════════════════════════════════════════════════════════════
     Line chart
     opts:
       labels: string[]            // x labels
       series: [{ name, color, data: number[], fill?: boolean, width?, dash? }]
       fmtY?: (number) => string
       animate?: boolean           // animated draw-in
     ════════════════════════════════════════════════════════════════════ */
  function lineChart(canvas, opts) {
    opts = opts || {};
    const seriesRaw = (opts.series || []).filter((s) => s.data && s.data.length);
    if (!seriesRaw.length) {
      const r = setupCanvas(canvas);
      drawEmpty(r.ctx, r.w, r.h, DEFAULTS, 'No data yet');
      return;
    }

    // Copy so we can mask with visibility flags
    const hidden = REG.get(canvas)?.hidden || {};

    // wrap canvas for legend/tooltip positioning
    ensureWrap(canvas);

    const seriesFiltered = seriesRaw.map((s, i) => Object.assign({}, s, { _origIndex: i }));
    const len = Math.max(0, ...seriesRaw.map((s) => s.data.length));
    if (len === 0) return;

    function drawFrame(progress, hoverIndex) {
      const { ctx, w, h } = setupCanvas(canvas);
      const opt = Object.assign({}, DEFAULTS, opts);
      const pad = opt.padding;

      // yMax from visible series only
      let yMax = 0;
      seriesRaw.forEach((s, i) => {
        if (hidden[i]) return;
        s.data.forEach((v) => { if (v > yMax) yMax = v; });
      });
      yMax = niceMax(yMax * 1.1) || 10;

      const plotW = w - pad.left - pad.right;
      const plotH = h - pad.top - pad.bottom;
      const xAt = (i) => pad.left + (len === 1 ? plotW / 2 : (i / (len - 1)) * plotW);
      const yAt = (v) => pad.top + plotH - (v / yMax) * plotH;

      // grid + y labels
      ctx.font = opt.fontSize + 'px ' + opt.fontFamily;
      ctx.textBaseline = 'middle';
      for (let g = 0; g <= 4; g++) {
        const val = (yMax / 4) * g;
        const y = yAt(val);
        ctx.strokeStyle = opt.gridColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad.left, Math.round(y) + 0.5);
        ctx.lineTo(w - pad.right, Math.round(y) + 0.5);
        ctx.stroke();
        ctx.fillStyle = opt.labelColor;
        ctx.textAlign = 'right';
        ctx.fillText(opt.fmtY ? opt.fmtY(val) : String(Math.round(val)), pad.left - 6, y);
      }

      // x labels (sparse)
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const step = Math.max(1, Math.ceil(len / 8));
      for (let i = 0; i < len; i += step) {
        const lbl = opts.labels && opts.labels[i] != null ? opts.labels[i] : String(i);
        ctx.fillStyle = opt.labelColor;
        ctx.fillText(String(lbl), xAt(i), h - pad.bottom + 9);
      }

      // build per-series point arrays (clamped by progress 0..1)
      const pointsBySeries = [];
      seriesRaw.forEach((s, si) => {
        if (hidden[si]) { pointsBySeries.push([]); return; }
        const n = Math.max(1, Math.round(s.data.length * progress));
        const pts = [];
        for (let i = 0; i < n; i++) pts.push({ x: xAt(i), y: yAt(s.data[i]) });
        pointsBySeries.push(pts);
      });

      // area fills
      seriesRaw.forEach((s, si) => {
        if (hidden[si] || !s.fill) return;
        const pts = pointsBySeries[si];
        if (pts.length < 2) return;
        const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
        grad.addColorStop(0, s.color + '28');
        grad.addColorStop(1, s.color + '04');
        ctx.save();
        ctx.fillStyle = grad;
        ctx.beginPath();
        drawSmoothLine(ctx, pts);
        ctx.lineTo(pts[pts.length - 1].x, pad.top + plotH);
        ctx.lineTo(pts[0].x, pad.top + plotH);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // lines
      seriesRaw.forEach((s, si) => {
        if (hidden[si]) return;
        const pts = pointsBySeries[si];
        if (!pts.length) return;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width || 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (s.dash) ctx.setLineDash(s.dash); else ctx.setLineDash([]);
        ctx.beginPath();
        drawSmoothLine(ctx, pts);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // hover crosshair + dots
      if (hoverIndex != null && hoverIndex >= 0 && hoverIndex < len) {
        const hx = xAt(hoverIndex);
        // vertical guide
        ctx.strokeStyle = 'rgba(126, 121, 111, .18)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(hx) + 0.5, pad.top);
        ctx.lineTo(Math.round(hx) + 0.5, pad.top + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        // dots
        seriesRaw.forEach((s, si) => {
          if (hidden[si]) return;
          if (hoverIndex >= s.data.length) return;
          const hy = yAt(s.data[hoverIndex]);
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(hx, hy, 3.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        });
      }

      // store geometry for hit-testing / hover
      const allPoints = [];
      for (let i = 0; i < len; i++) allPoints.push({ x: xAt(i) });
      register(canvas, {
        kind: 'line',
        len,
        allPoints,
        _seriesRaw: seriesRaw,
        _hidden: hidden,
        _labels: opts.labels,
        _fmtY: opts.fmtY,
        pad: pad,
        plotH: plotH,
        yMax: yMax
      });
    }

    // ---- initial draw + animation ------------------------------------
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (opts.animate === false || prefersReduced) {
      drawFrame(1, null);
      attachLineHover(canvas, drawFrame);
      return;
    }

    const t0 = performance.now();
    const dur = 560;

    function frame(now) {
      const t = Math.min(1, (now - t0) / dur);
      // ease: cubic out
      const e = 1 - Math.pow(1 - t, 3);
      drawFrame(e, null);
      if (t < 1) requestAnimationFrame(frame);
      else {
        drawFrame(1, null);
        attachLineHover(canvas, drawFrame);
      }
    }
    requestAnimationFrame(frame);
  }

  function attachLineHover(canvas, drawFrame) {
    if (canvas.__lineHoverBound) return;
    canvas.__lineHoverBound = true;

    const wrap = canvas.parentElement;
    const passive = { passive: true };

    canvas.addEventListener('mousemove', (e) => {
      const meta = REG.get(canvas);
      if (!meta || !meta.allPoints.length) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const idx = nearestIndex(meta.allPoints, x);
      if (idx < 0) return;

      drawFrame(1, idx);

      // tooltip
      const lbl = (meta._labels && meta._labels[idx] != null) ? meta._labels[idx] : String(idx);
      let html = '<strong style="display:block;margin-bottom:4px">' + lbl + '</strong>';
      meta._seriesRaw.forEach((s, si) => {
        if (meta._hidden[si]) return;
        const v = s.data[idx];
        if (v == null) return;
        const dot = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + s.color + ';margin-right:6px;vertical-align:middle"></span>';
        html += '<div style="display:flex;justify-content:space-between;gap:14px"><span>' + dot + s.name + '</span><span style="font-weight:700">' +
                (meta._fmtY ? meta._fmtY(v) : Math.round(v * 10) / 10) + '</span></div>';
      });
      showTip(html, e.clientX, e.clientY - 14);
    }, passive);

    canvas.addEventListener('mouseleave', () => {
      hideTip();
      drawFrame(1, null);
    });

    canvas.addEventListener('touchstart', () => {}, passive);
  }

  /* ════════════════════════════════════════════════════════════════════
     Bar chart — opts.data: [ { label, value, color? } ]
     ════════════════════════════════════════════════════════════════════ */
  function barChart(canvas, opts) {
    opts = opts || {};
    const raw = (opts.data || []).filter((d) => d != null);
    if (!raw.length) {
      const r = setupCanvas(canvas);
      drawEmpty(r.ctx, r.w, r.h, DEFAULTS, 'No data yet');
      return;
    }

    ensureWrap(canvas);

    function drawFrame(progress, hoverIdx) {
      const { ctx, w, h } = setupCanvas(canvas);
      const opt = Object.assign({}, DEFAULTS, opts);
      const pad = opt.padding;
      const plotW = w - pad.left - pad.right;
      const plotH = h - pad.top - pad.bottom;
      const colors = themeColors();

      let yMax = 0;
      raw.forEach((d) => { const v = typeof d === 'number' ? d : d.value; if (v > yMax) yMax = v; });
      yMax = niceMax(yMax * 1.18) || 10;

      const n = raw.length;
      const slot = plotW / n;
      const barW = Math.max(2, Math.min(42, slot * 0.60));

      ctx.font = opt.fontSize + 'px ' + opt.fontFamily;
      for (let g = 0; g <= 3; g++) {
        const val = (yMax / 3) * g;
        const y = pad.top + plotH - (val / yMax) * plotH;
        ctx.strokeStyle = opt.gridColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad.left, Math.round(y) + 0.5);
        ctx.lineTo(w - pad.right, Math.round(y) + 0.5);
        ctx.stroke();
        ctx.fillStyle = opt.labelColor;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(Math.round(val)), pad.left - 6, y);
      }

      const bars = [];

      raw.forEach((d, i) => {
        const value = typeof d === 'number' ? d : d.value;
        const label = typeof d === 'number' ? '' : (d.label || '');
        const color = (typeof d === 'object' && d.color) || opt.barColor || colors.accent;
        const x = pad.left + slot * i + (slot - barW) / 2;
        const targetH = (value / yMax) * plotH;
        const bh = targetH * progress;
        const y = pad.top + plotH - bh;
        const isHover = i === hoverIdx;

        const alpha = isHover ? 1 : 0.88;
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        if (isHover) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
        roundRect(ctx, x, y, barW, Math.max(value > 0 ? 2 * progress : 0, bh), 4);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        bars.push({ x: x + barW / 2, value, label, index: i });

        const step = Math.max(1, Math.ceil(n / 10));
        if (i % step === 0 && label) {
          ctx.fillStyle = opt.labelColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(String(label), pad.left + slot * i + slot / 2, h - pad.bottom + 9);
        }
      });

      register(canvas, { kind: 'bar', _bars: bars, raw });
    }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animate = opts.animate !== false && !prefersReduced;

    if (!animate) { drawFrame(1, null); attachBarHover(canvas, drawFrame); }
    else {
      const t0 = performance.now();
      const dur = 560;
      function frame(now) {
        const t = Math.min(1, (now - t0) / dur);
        drawFrame(1 - Math.pow(1 - t, 3), null);
        if (t < 1) requestAnimationFrame(frame);
        else {
          drawFrame(1, null);
          attachBarHover(canvas, drawFrame);
        }
      }
      requestAnimationFrame(frame);
    }
  }

  function attachBarHover(canvas, drawFrame) {
    if (canvas.__barHoverBound) return;
    canvas.__barHoverBound = true;

    canvas.addEventListener('mousemove', (e) => {
      const meta = REG.get(canvas);
      if (!meta || !meta._bars.length) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let best = 0, bestD = Infinity;
      meta._bars.forEach((b, i) => {
        const d = Math.abs(b.x - x);
        if (d < bestD) { bestD = d; best = i; }
      });
      // only if reasonably near
      const plotW = rect.width - DEFAULTS.padding.left - DEFAULTS.padding.right;
      const slot = plotW / meta._bars.length;
      if (bestD > slot * 0.55) { hideTip(); drawFrame(1, null); return; }
      drawFrame(1, best);
      const b = meta._bars[best];
      const lbl = b.label || ('#' + (b.index + 1));
      showTip('<span style="opacity:.65">' + lbl + '</span> &nbsp;<strong>' + b.value + '</strong>', e.clientX, e.clientY - 14);
    });
    canvas.addEventListener('mouseleave', () => { hideTip(); drawFrame(1, null); });
  }

  /* ════════════════════════════════════════════════════════════════════
     Doughnut — opts.segments: [{ label, value, color }]
     ════════════════════════════════════════════════════════════════════ */
  function doughnutChart(canvas, opts) {
    opts = opts || {};
    const segs = (opts.segments || []).filter((s) => s.value > 0);
    if (!segs.length) {
      const r = setupCanvas(canvas);
      drawEmpty(r.ctx, r.w, r.h, Object.assign({}, DEFAULTS, opts), 'No data');
      return;
    }

    ensureWrap(canvas);

    function drawFrame(progress, hoverIndex) {
      const { ctx, w, h } = setupCanvas(canvas);
      const colors = themeColors();
      const total = segs.reduce((a, s) => a + s.value, 0);

      // donut geometry
      const cx = w / 2;
      const cy = h / 2 - 6;
      const radius = Math.min(w, h) / 2 - 18;
      const inner = radius * 0.60;
      const segsDrawProgress = Math.min(1, progress * 1.15);
      const full = Math.PI * 2 * segsDrawProgress;
      let angle = -Math.PI / 2;

      // shadow/background ring
      ctx.strokeStyle = 'rgba(126, 121, 111, .08)';
      ctx.lineWidth = radius - inner;
      ctx.beginPath();
      ctx.arc(cx, cy, radius - (radius - inner) / 2, 0, Math.PI * 2);
      ctx.stroke();

      // segments
      const arcs = [];
      segs.forEach((s, i) => {
        const slice = (s.value / total) * full;
        const isHover = i === hoverIndex;
        const rOut = isHover ? radius + 2 : radius;
        ctx.beginPath();
        const mid = angle + slice / 2;
        const tx = Math.cos(mid) * 2 * (isHover ? 1 : 0);
        const ty = Math.sin(mid) * 2 * (isHover ? 1 : 0);
        ctx.translate(tx, ty);
        ctx.arc(cx, cy, rOut, angle, angle + slice);
        ctx.arc(cx, cy, inner, angle + slice, angle, true);
        ctx.closePath();
        ctx.fillStyle = s.color || colors.accent;
        ctx.globalAlpha = isHover ? 1 : .98;
        if (isHover) { ctx.shadowColor = s.color; ctx.shadowBlur = 10; }
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
        arcs.push({ start: angle, end: angle + slice, cx, cy, radius: rOut, inner, index: i });
        angle += slice;
      });

      // center label
      ctx.fillStyle = cssVar('--text-primary', '#121211');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 17px ' + DEFAULTS.fontFamily;
      ctx.fillText(opts.centerLabel != null ? String(opts.centerLabel) : String(total), cx, cy - 7);
      ctx.fillStyle = colors.textMuted;
      ctx.font = DEFAULTS.fontSize + 'px ' + DEFAULTS.fontFamily;
      ctx.fillText(opts.centerSub || '', cx, cy + 10);

      register(canvas, { kind: 'doughnut', _arcs: arcs, _segs: segs, _cx: cx, _cy: cy });
    }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animate = opts.animate !== false && !prefersReduced;

    if (!animate) { drawFrame(1, null); attachDoughnutHover(canvas, drawFrame); }
    else {
      const t0 = performance.now();
      const dur = 640;
      function frame(now) {
        const t = Math.min(1, (now - t0) / dur);
        drawFrame(1 - Math.pow(1 - t, 3), null);
        if (t < 1) requestAnimationFrame(frame);
        else {
          drawFrame(1, null);
          attachDoughnutHover(canvas, drawFrame);
        }
      }
      requestAnimationFrame(frame);
    }
  }

  function attachDoughnutHover(canvas, drawFrame) {
    if (canvas.__doughnutHoverBound) return;
    canvas.__doughnutHoverBound = true;

    function hitIndex(meta, mx, my) {
      const dx = mx - meta._cx, dy = my - meta._cy;
      const r = Math.hypot(dx, dy);
      if (r < meta._arcs[0].inner - 2 || r > meta._arcs[0].radius + 6) return -1;
      let a = Math.atan2(dy, dx);
      if (a < -Math.PI / 2) a += Math.PI * 2;
      for (let i = 0; i < meta._arcs.length; i++) {
        const ar = meta._arcs[i];
        if (a >= ar.start - 0.01 && a < ar.end + 0.01) return i;
      }
      return -1;
    }

    canvas.addEventListener('mousemove', (e) => {
      const meta = REG.get(canvas);
      if (!meta || !meta._arcs) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const idx = hitIndex(meta, mx, my);
      if (idx === -1) { hideTip(); drawFrame(1, null); return; }
      drawFrame(1, idx);
      const s = meta._segs[idx];
      const total = meta._segs.reduce((a, x) => a + x.value, 0);
      const pct = Math.round((s.value / total) * 100);
      const dot = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + (s.color || '#000') + ';margin-right:7px;vertical-align:middle"></span>';
      showTip(dot + s.label + ' · <strong>' + s.value + '</strong> (' + pct + '%)', e.clientX, e.clientY - 16);
    });

    canvas.addEventListener('mouseleave', () => { hideTip(); drawFrame(1, null); });
  }

  function sanitizeSampleNumber(v, lo, hi, fallback) {
    if (!isFinite(v) || v == null) return fallback;
    return Math.max(lo, Math.min(hi, v));
  }

  /* ── unified performance graph — WPM + accuracy + consistency ──── */
  function unifiedPerformanceChart(canvas, samples, opts) {
    opts = opts || {};
    if (!samples || samples.length < 2) {
      const r = setupCanvas(canvas);
      drawEmpty(r.ctx, r.w, r.h, DEFAULTS, 'Not enough data yet — type a bit longer');
      return;
    }

    const clean = samples.slice();
    const labels = clean.map((s) => s.t + 's');
    const wpmData = clean.map((s) => sanitizeSampleNumber(s.wpm, 0, 400, 0));
    const accData = clean.map((s) => sanitizeSampleNumber(s.accuracy, 0, 100, 100));
    const rawData = clean.map((s) => sanitizeSampleNumber(s.rawWpm, 0, 400, 0));
    const consistencyData = (function () {
      const out = [];
      for (let i = 0; i < rawData.length; i++) {
        const raw = rawData[i];
        if (!isFinite(raw) || raw > 350) { out.push(out.length ? out[out.length - 1] : 100); continue; }
        const slice = rawData.slice(0, i + 1).filter((v) => isFinite(v) && v > 0 && v <= 400);
        if (slice.length < 2) { out.push(100); continue; }
        const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
        if (!isFinite(mean) || mean <= 0) { out.push(0); continue; }
        const variance = slice.reduce((a, v) => a + (v - mean) * (v - mean), 0) / slice.length;
        if (!isFinite(variance)) { out.push(100); continue; }
        const cv = Math.sqrt(variance) / mean;
        if (!isFinite(cv)) { out.push(100); continue; }
        out.push(Math.max(0, Math.min(100, Math.round((1 - cv) * 1000) / 10)));
      }
      return out;
    })();

    const seriesDefs = [
      { key: 'wpm', name: 'WPM', color: themeColors().accent, data: wpmData, fill: true, width: 2.2 },
      { key: 'accuracy', name: 'Accuracy', color: themeColors().correct, data: accData, width: 1.6, dash: [5, 4], yAxis: 'right' },
      { key: 'consistency', name: 'Consistency', color: '#8a8f9e', data: consistencyData, width: 1.35, dash: [3, 6], yAxis: 'right' }
    ];

    const visible = {};
    const hidden = REG.get(canvas)?.hidden || {};

    ensureWrap(canvas);

    function drawFrame(progress, hoverIndex) {
      const { ctx, w, h } = setupCanvas(canvas);
      const pad = { top: 18, right: 52, bottom: 26, left: 44 };
      const plotW = w - pad.left - pad.right;
      const plotH = h - pad.top - pad.bottom;

      let yMaxLeft = 0;
      seriesDefs.forEach((s, i) => {
        if (hidden[i]) return;
        if (s.yAxis === 'right') return;
        s.data.forEach((v) => {
          const n = Number(v);
          if (!isFinite(n) || n < 0 || n > 500) return;
          if (n > yMaxLeft) yMaxLeft = n;
        });
      });
      yMaxLeft = Math.min(200, niceMax(yMaxLeft * 1.12) || 10);
      const yMaxRight = 100;

      const xAt = (i) => pad.left + (clean.length === 1 ? plotW / 2 : (i / (clean.length - 1)) * plotW);
      const yAtLeft  = (v) => pad.top + plotH - (v / yMaxLeft) * plotH;
      const yAtRight = (v) => pad.top + plotH - (v / yMaxRight) * plotH;

      ctx.fillStyle = cssVar('--surface-card', '#fff');
      ctx.globalAlpha = 0.0;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;

      const bgGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
      bgGrad.addColorStop(0, themeColors().accent + '08');
      bgGrad.addColorStop(0.55, themeColors().accent + '02');
      bgGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(pad.left, pad.top, plotW, plotH);

      ctx.strokeStyle = 'rgba(126,121,111,0.07)';
      ctx.lineWidth = 1;
      for (let g = 1; g < 4; g++) {
        const y = pad.top + (plotH / 4) * g;
        ctx.beginPath();
        ctx.moveTo(pad.left, Math.round(y) + 0.5);
        ctx.lineTo(w - pad.right, Math.round(y) + 0.5);
        ctx.stroke();
      }

      ctx.font = '9px ' + DEFAULTS.fontFamily;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = DEFAULTS.labelColor;
      ctx.textAlign = 'right';
      for (let g = 0; g <= 4; g++) {
        const v = (yMaxLeft / 4) * g;
        ctx.fillText(String(Math.round(v)), pad.left - 7, yAtLeft(v));
      }
      ctx.fillStyle = 'rgba(126,121,111,0.55)';
      ctx.textAlign = 'left';
      for (let g = 0; g <= 4; g++) {
        const v = 25 * g;
        if (g === 0 || g === 4) ctx.fillText(v + '%', w - pad.right + 7, yAtRight(v));
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = DEFAULTS.labelColor;
      const xStep = Math.max(1, Math.ceil(clean.length / 9));
      for (let i = 0; i < clean.length; i += xStep) {
        ctx.fillText(labels[i], xAt(i), h - pad.bottom + 10);
      }

      const n = Math.max(1, Math.round(clean.length * progress));
      const wpmPts = [];
      const accPts = [];
      const consPts = [];
      for (let i = 0; i < n; i++) {
        wpmPts.push({ x: xAt(i), y: yAtLeft(wpmData[i]) });
        accPts.push({ x: xAt(i), y: yAtRight(accData[i]) });
        consPts.push({ x: xAt(i), y: yAtRight(consistencyData[i]) });
      }

      if (!hidden[0] && wpmPts.length > 1) {
        const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
        grad.addColorStop(0, seriesDefs[0].color + '22');
        grad.addColorStop(1, seriesDefs[0].color + '00');
        ctx.save();
        ctx.fillStyle = grad;
        ctx.beginPath();
        drawSmoothLine(ctx, wpmPts);
        ctx.lineTo(wpmPts[wpmPts.length - 1].x, pad.top + plotH);
        ctx.lineTo(wpmPts[0].x, pad.top + plotH);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      const order = [1, 2, 0];
      order.forEach((si) => {
        if (hidden[si]) return;
        const s = seriesDefs[si];
        const pts = si === 0 ? wpmPts : si === 1 ? accPts : consPts;
        if (pts.length < 1) return;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (s.dash) ctx.setLineDash(s.dash); else ctx.setLineDash([]);
        ctx.globalAlpha = si === 0 ? 1 : 0.92;
        ctx.beginPath();
        drawSmoothLine(ctx, pts);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
      });

      if (hoverIndex != null && hoverIndex >= 0 && hoverIndex < clean.length) {
        const hx = xAt(hoverIndex);
        ctx.strokeStyle = 'rgba(126,121,111,0.16)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(hx) + 0.5, pad.top);
        ctx.lineTo(Math.round(hx) + 0.5, pad.top + plotH);
        ctx.stroke();
        ctx.setLineDash([]);
        const dotMap = [
          { y: yAtLeft(wpmData[hoverIndex]), c: seriesDefs[0].color, hidden: !!hidden[0] },
          { y: yAtRight(accData[hoverIndex]), c: seriesDefs[1].color, hidden: !!hidden[1] },
          { y: yAtRight(consistencyData[hoverIndex]), c: seriesDefs[2].color, hidden: !!hidden[2] }
        ];
        dotMap.forEach((d) => {
          if (d.hidden) return;
          ctx.fillStyle = d.c;
          ctx.beginPath();
          ctx.arc(hx, d.y, 3.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      }

      const allPoints = clean.map((_, i) => ({ x: xAt(i) }));
      register(canvas, {
        kind: 'unified',
        len: clean.length,
        allPoints,
        _labels: labels,
        _hidden: hidden,
        _wpm: wpmData,
        _acc: accData,
        _cons: consistencyData,
        _seriesDefs: seriesDefs
      });
    }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (opts.animate === false || prefersReduced) {
      drawFrame(1, null);
      attachUnifiedHover(canvas, drawFrame);
      return;
    }
    const t0 = performance.now();
    const dur = 620;
    function frame(now) {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      drawFrame(e, null);
      if (t < 1) requestAnimationFrame(frame);
      else {
        // Ensure the final frame is rendered before attaching hover
        drawFrame(1, null);
        attachUnifiedHover(canvas, drawFrame);
      }
    }
    requestAnimationFrame(frame);
  }

  function attachUnifiedHover(canvas, drawFrame) {
    if (canvas.__unifiedHoverBound) return;
    canvas.__unifiedHoverBound = true;
    canvas.addEventListener('mousemove', (e) => {
      const meta = REG.get(canvas);
      if (!meta || !meta.allPoints.length) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const idx = nearestIndex(meta.allPoints, x);
      if (idx < 0) return;
      drawFrame(1, idx);
      const lbl = meta._labels[idx];
      let html = '<strong style="display:block;margin-bottom:5px">' + lbl + '</strong>';
      const rows = [
        { name: 'WPM', color: meta._seriesDefs[0].color, val: meta._wpm[idx], fmt: (v) => String(Math.round(v)) },
        { name: 'Accuracy', color: meta._seriesDefs[1].color, val: meta._acc[idx], fmt: (v) => v.toFixed(1) + '%' },
        { name: 'Consistency', color: meta._seriesDefs[2].color, val: meta._cons[idx], fmt: (v) => Math.round(v) + '%' }
      ];
      rows.forEach((r, i) => {
        if (meta._hidden[i]) return;
        const dot = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + r.color + ';margin-right:7px;vertical-align:middle"></span>';
        html += '<div style="display:flex;justify-content:space-between;gap:16px"><span>' + dot + r.name + '</span><span style="font-weight:700">' + r.fmt(r.val) + '</span></div>';
      });
      showTip(html, e.clientX, e.clientY - 14);
    }, { passive: true });
    canvas.addEventListener('mouseleave', () => { hideTip(); drawFrame(1, null); });
  }

  /* ── wrap helper (needed for tooltip anchor) ───────────────────────── */
  function ensureWrap(canvas) {
    if (canvas.parentElement && canvas.parentElement.classList.contains('chart-wrap'))
      return;
    const p = canvas.parentElement;
    if (!p) return;
    // Create wrapper if not already present (done in HTML ideally)
    // Fallback: nothing — canvas still works, tooltip falls back to viewport.
  }

  /* ── shared helpers ─────────────────────────────────────────────────── */
  function drawLegend(ctx, w, series, opt) {
    if (series.length < 2 || opt.hideLegend) return;
    ctx.font = DEFAULTS.fontSize + 'px ' + DEFAULTS.fontFamily;
    ctx.textBaseline = 'middle';
    let x = opt.padding.left;
    const y = 9;
    series.forEach((s) => {
      ctx.fillStyle = s.color;
      ctx.fillRect(x, y - 3, 8, 3);
      ctx.fillStyle = opt.labelColor;
      ctx.textAlign = 'left';
      ctx.fillText(s.name, x + 12, y);
      x += 12 + ctx.measureText(s.name).width + 16;
    });
  }

  function buildChartLegendHTML(series, onToggle) {
    let html = '<div class="chart-legend">';
    series.forEach((s, i) => {
      html += '<span class="chart-legend__item" data-idx="' + i + '">'
           +   '<span class="chart-legend__dot" style="background:' + s.color + '"></span>'
           +   s.name
           + '</span>';
    });
    html += '</div>';
    return html;
  }

  function roundRect(ctx, x, y, w, h, r) {
    if (h <= 0) return;
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ── auto-render + theme-rebind ────────────────────────────────────── */
  const registry = new Map();
  let resizeBound = false;

  function autoRender(canvas, renderFn) {
    if (!canvas) return;
    registry.set(canvas, renderFn);
    renderFn();
    requestAnimationFrame(() => {
      try { renderFn(); } catch (_) {}
    });
    if (!resizeBound) {
      resizeBound = true;
      let raf = null;
      window.addEventListener('resize', () => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          registry.forEach((fn, cv) => {
            if (cv.isConnected) { try { fn(); } catch (_) {} }
          });
          hideTip();
        });
      });

      const obs = new MutationObserver((m) => {
        if (m.some((x) => x.attributeName === 'data-theme' || x.attributeName === 'class' || x.attributeName === 'style')) {
          registry.forEach((fn, cv) => { if (cv.isConnected) { try { fn(); } catch (_) {} } });
        }
      });
      obs.observe(document.documentElement, { attributes: true });
      const resView = document.getElementById('view-results');
      if (resView) obs.observe(resView, { attributes: true, attributeFilter: ['class', 'style'] });
      const histView = document.getElementById('history-panel');
      if (histView) obs.observe(histView, { attributes: true, attributeFilter: ['class', 'style'] });
    }
  }

  /* Hide tooltip when panels/modals open so it doesn't float orphaned */
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideTip(); });

  return {
    lineChart, barChart, doughnutChart, unifiedPerformanceChart,
    autoRender, themeColors,
    // exposed for tests / app
    _REG: REG, _hideTip: hideTip
  };
})();
