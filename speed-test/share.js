/**
 * share.js — result image renderer.
 *
 * Loaded on demand the first time the user shares or downloads a result, so
 * the code never weighs down the initial page load.
 *
 * The image is a 1200x630 PNG sized for social preview cards.
 */

/**
 * Render a result as a shareable image.
 *
 * @param {HTMLCanvasElement} canvas Target canvas (1200x630).
 * @param {object} result           The completed test result.
 * @param {object} theme             Colour tokens + helpers.
 * @param {string} theme.brand      Product name shown in the header.
 * @param {string} theme.text        Primary text colour.
 * @param {string} theme.sub         Secondary text colour.
 * @param {string} theme.accentA     Cyan accent.
 * @param {string} theme.accentB     Violet accent.
 * @param {boolean} theme.isLight    True when the light theme is active.
 * @param {object} theme.chips       Pre-formatted metric chips.
 * @param {string} theme.verdict     The one-line verdict text.
 * @returns {HTMLCanvasElement} The canvas that was drawn on.
 */
export function renderShareImage(canvas, result, theme) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const { brand, text, sub, accentA, accentB, isLight, chips, verdict } = theme;

  /* ---- Background ------------------------------------------------------ */
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, isLight ? '#ffffff' : '#070b16');
  bg.addColorStop(0.55, isLight ? '#f2f5ff' : '#0c1226');
  bg.addColorStop(1, isLight ? '#eaf0ff' : '#121a35');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Accent glow in the top-right corner.
  const glow = ctx.createRadialGradient(W * 0.86, H * 0.1, 10, W * 0.86, H * 0.1, 520);
  glow.addColorStop(0, `${accentB}55`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  /* ---- Header ---------------------------------------------------------- */
  ctx.fillStyle = accentA;
  ctx.font = '700 34px Outfit, Segoe UI, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(brand, 72, 92);

  ctx.fillStyle = sub;
  ctx.font = '400 22px Inter, system-ui, sans-serif';
  ctx.fillText('Internet speed test result', 72, 128);

  // Gradient rule under the header.
  const rule = ctx.createLinearGradient(72, 0, 420, 0);
  rule.addColorStop(0, accentA);
  rule.addColorStop(1, accentB);
  ctx.fillStyle = rule;
  ctx.fillRect(72, 150, 220, 6);

  /* ---- Hero number ----------------------------------------------------- */
  const downText = theme.downloadText;
  ctx.fillStyle = text;
  ctx.font = '700 168px Outfit, Segoe UI, system-ui, sans-serif';
  ctx.fillText(downText, 68, 330);

  const heroWidth = ctx.measureText(downText).width;
  ctx.fillStyle = accentA;
  ctx.font = '600 40px Inter, system-ui, sans-serif';
  ctx.fillText('Mbps', 80 + heroWidth, 330);

  ctx.fillStyle = sub;
  ctx.font = '400 26px Inter, system-ui, sans-serif';
  ctx.fillText('Download speed', 74, 372);

  /* ---- Metric chips ---------------------------------------------------- */
  const chipY = 440;
  const chipH = 118;
  const chipW = 300;
  const gap = 26;

  chips.forEach((chip, index) => {
    const x = 72 + index * (chipW + gap);

    ctx.fillStyle = isLight ? 'rgba(15,23,42,0.05)' : 'rgba(255,255,255,0.06)';
    roundRect(ctx, x, chipY, chipW, chipH, 20);
    ctx.fill();

    ctx.fillStyle = chip.color;
    ctx.fillRect(x, chipY, 5, chipH);

    ctx.fillStyle = sub;
    ctx.font = '600 19px Inter, system-ui, sans-serif';
    ctx.fillText(chip.label.toUpperCase(), x + 28, chipY + 44);

    ctx.fillStyle = text;
    ctx.font = '700 40px Outfit, Segoe UI, system-ui, sans-serif';
    ctx.fillText(chip.value, x + 28, chipY + 92);
  });

  /* ---- Verdict --------------------------------------------------------- */
  ctx.fillStyle = sub;
  ctx.font = '400 21px Inter, system-ui, sans-serif';
  wrapText(ctx, verdict, 72, 600, 720, 30);

  /* ---- Footer ---------------------------------------------------------- */
  ctx.fillStyle = sub;
  ctx.font = '400 19px Inter, system-ui, sans-serif';
  ctx.fillText(theme.footerLeft, 72, H - 44);

  ctx.textAlign = 'right';
  ctx.fillText(theme.footerRight, W - 72, H - 44);

  return canvas;
}

/** Draw a rounded rectangle path. */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draw text that wraps at a given width. */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(' ');
  let line = '';
  let cursorY = y;

  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = test;
    }
  });
  if (line) ctx.fillText(line, x, cursorY);
}
