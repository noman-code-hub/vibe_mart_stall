const ALPHA_THRESHOLD = 12;
const TRIM_PADDING = 4;
const MAX_SCAN_SIZE = 900;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function findContentBounds(imageData, width, height) {
  const { data } = imageData;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;

  return {
    x: Math.max(0, minX - TRIM_PADDING),
    y: Math.max(0, minY - TRIM_PADDING),
    width: Math.min(width, maxX + TRIM_PADDING + 1) - Math.max(0, minX - TRIM_PADDING),
    height: Math.min(height, maxY + TRIM_PADDING + 1) - Math.max(0, minY - TRIM_PADDING),
  };
}

/**
 * Crops transparent padding from cutout PNGs so layout fits the person, not the canvas.
 * Returns a blob URL, or the original src if trimming isn't needed/possible.
 */
export async function trimImageToContent(src) {
  const img = await loadImage(src);
  const { naturalWidth: nw, naturalHeight: nh } = img;
  if (!nw || !nh) return { url: src, revoke: false };

  const scanScale = Math.min(1, MAX_SCAN_SIZE / Math.max(nw, nh));
  const scanW = Math.max(1, Math.round(nw * scanScale));
  const scanH = Math.max(1, Math.round(nh * scanScale));

  const scanCanvas = document.createElement('canvas');
  scanCanvas.width = scanW;
  scanCanvas.height = scanH;
  const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });
  if (!scanCtx) return { url: src, revoke: false };

  scanCtx.drawImage(img, 0, 0, scanW, scanH);
  const scanBounds = findContentBounds(scanCtx.getImageData(0, 0, scanW, scanH), scanW, scanH);
  if (!scanBounds) return { url: src, revoke: false };

  const bounds = {
    x: Math.round(scanBounds.x / scanScale),
    y: Math.round(scanBounds.y / scanScale),
    width: Math.round(scanBounds.width / scanScale),
    height: Math.round(scanBounds.height / scanScale),
  };

  // Already tight — no meaningful trim
  if (bounds.width >= nw * 0.98 && bounds.height >= nh * 0.98) {
    return { url: src, revoke: false };
  }

  const out = document.createElement('canvas');
  out.width = bounds.width;
  out.height = bounds.height;
  const outCtx = out.getContext('2d');
  if (!outCtx) return { url: src, revoke: false };

  outCtx.drawImage(img, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);

  const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/png'));
  if (!blob) return { url: src, revoke: false };

  return { url: URL.createObjectURL(blob), revoke: true };
}
