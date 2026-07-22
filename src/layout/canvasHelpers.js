// Shared canvas drawing helpers, ported 1:1 (by name and behaviour) from
// vibemart-stall-generator.html so the layout math stays identical between
// the client-side React preview and the eventual PHP/Imagick server render.

/**
 * Draws a rounded-rectangle path (does not fill/stroke - caller decides).
 * `r` may be a single number or {tl, tr, br, bl} per-corner radii.
 */
export function roundRect(ctx, x, y, w, h, r = 8) {
  const radii =
    typeof r === 'number'
      ? { tl: r, tr: r, br: r, bl: r }
      : { tl: 0, tr: 0, br: 0, bl: 0, ...r };

  const maxR = Math.min(w, h) / 2;
  const tl = Math.min(radii.tl, maxR);
  const tr = Math.min(radii.tr, maxR);
  const br = Math.min(radii.br, maxR);
  const bl = Math.min(radii.bl, maxR);

  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

/**
 * Draws (fills) a five-pointed star centered at (cx, cy).
 */
export function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  let x;
  let y;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

/**
 * Wraps `text` to fit within `maxWidth`, drawing each line starting at
 * (x, y) and advancing by `lineHeight`. Stops after `maxLines` (if given)
 * and appends an ellipsis to the last visible line when truncated.
 * Returns the y position just below the last line drawn.
 */
export function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = Infinity) {
  if (!text) return y;

  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  let cursorY = y;
  const truncated = lines.length > maxLines;
  const visibleLines = lines.slice(0, maxLines);

  visibleLines.forEach((line, i) => {
    let out = line;
    if (truncated && i === visibleLines.length - 1) {
      while (ctx.measureText(`${out}…`).width > maxWidth && out.length > 0) {
        out = out.slice(0, -1).trimEnd();
      }
      out += '…';
    }
    ctx.fillText(out, x, cursorY);
    cursorY += lineHeight;
  });

  return cursorY;
}

/**
 * Truncates `text` with an ellipsis so it fits within `maxWidth` at the
 * context's current font. Used for single-line labels (e.g. the business
 * name banner) where wrapping isn't appropriate.
 */
export function truncateToWidth(ctx, text, maxWidth) {
  if (!text) return text;
  if (ctx.measureText(text).width <= maxWidth) return text;

  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1).trimEnd();
  }
  return `${out}…`;
}

/**
 * Draws `img` inside the box (x, y, w, h) using "contain" fit: the whole
 * image is always visible, letterboxed, never cropped.
 * `anchor` controls alignment within the box when the scaled image is
 * smaller than the box on one axis. Accepts any combination of
 * 'top'/'bottom' (vertical) and 'left'/'right' (horizontal) in one string,
 * e.g. 'bottom', 'bottom-left', 'center' (default, both axes centered).
 */
export function drawImageContain(ctx, img, x, y, w, h, anchor = 'center') {
  if (!img || !img.width || !img.height) return;

  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;

  let dx = x + (w - dw) / 2;
  if (anchor.includes('left')) dx = x;
  else if (anchor.includes('right')) dx = x + (w - dw);

  let dy = y + (h - dh) / 2;
  if (anchor.includes('top')) dy = y;
  else if (anchor.includes('bottom')) dy = y + (h - dh);

  ctx.drawImage(img, dx, dy, dw, dh);
}

/**
 * Draws `img` inside the box (x, y, w, h) using "cover" fit: the box is
 * always fully filled, cropping any overflow. Centered crop.
 */
export function drawImageCover(ctx, img, x, y, w, h) {
  if (!img || !img.width || !img.height) return;

  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;

  ctx.drawImage(img, dx, dy, dw, dh);
}

// Cached alpha bounding-box per loaded image element (WeakMap so entries
// are GC'd when the Image is no longer referenced).
const alphaBoundsCache = new WeakMap();

/**
 * Returns the tight bounding box of non-transparent pixels in `img`.
 * remove.bg PNGs often have large empty margins; trimming before scale
 * stops the figure rendering as a tiny sliver in the corner.
 */
export function getImageAlphaBounds(img, alphaThreshold = 8) {
  if (!img?.width || !img?.height) return null;
  if (alphaBoundsCache.has(img)) return alphaBoundsCache.get(img);

  const maxScan = 640;
  const scanScale = Math.min(1, maxScan / Math.max(img.width, img.height));
  const sw = Math.max(1, Math.round(img.width * scanScale));
  const sh = Math.max(1, Math.round(img.height * scanScale));

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const scan = canvas.getContext('2d', { willReadFrequently: true });
  scan.drawImage(img, 0, 0, sw, sh);
  const data = scan.getImageData(0, 0, sw, sh).data;

  let minX = sw;
  let minY = sh;
  let maxX = -1;
  let maxY = -1;

  for (let py = 0; py < sh; py++) {
    for (let px = 0; px < sw; px++) {
      if (data[(py * sw + px) * 4 + 3] > alphaThreshold) {
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }
  }

  const bounds =
    maxX < minX
      ? { sx: 0, sy: 0, sw: img.width, sh: img.height }
      : {
          sx: Math.floor(minX / scanScale),
          sy: Math.floor(minY / scanScale),
          sw: Math.min(img.width, Math.ceil((maxX - minX + 1) / scanScale)),
          sh: Math.min(img.height, Math.ceil((maxY - minY + 1) / scanScale)),
        };

  alphaBoundsCache.set(img, bounds);
  return bounds;
}

/**
 * Like drawImageContain but crops transparent margins first (remove.bg
 * cutouts). The visible subject is scaled to fill the box.
 */
export function drawImageContainTrimmed(ctx, img, x, y, w, h, anchor = 'center') {
  if (!img || !img.width || !img.height) return;

  const bounds = getImageAlphaBounds(img);
  if (!bounds) return;

  const scale = Math.min(w / bounds.sw, h / bounds.sh);
  const dw = bounds.sw * scale;
  const dh = bounds.sh * scale;

  let dx = x + (w - dw) / 2;
  if (anchor.includes('left')) dx = x;
  else if (anchor.includes('right')) dx = x + (w - dw);

  let dy = y + (h - dh) / 2;
  if (anchor.includes('top')) dy = y;
  else if (anchor.includes('bottom')) dy = y + (h - dh);

  ctx.drawImage(img, bounds.sx, bounds.sy, bounds.sw, bounds.sh, dx, dy, dw, dh);
}
