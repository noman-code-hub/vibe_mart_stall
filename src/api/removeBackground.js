/**
 * Uploads an image to the local Express proxy which calls remove.bg
 * server-side. The API key never leaves the backend.
 *
 * @param {File|Blob} file
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<Blob>} transparent PNG blob
 */
export async function removeBackground(file, options = {}) {
  if (!file) {
    throw new Error('Please choose an image first.');
  }

  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('That file is not an image. Please choose a JPEG, PNG, or WebP.');
  }

  const body = new FormData();
  body.append('image', file, file.name || 'upload.png');

  let response;
  try {
    response = await fetch('/api/remove-background', {
      method: 'POST',
      body,
      signal: options.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new Error('Could not reach the background-removal service. Is the API server running?', {
      cause: error,
    });
  }

  if (!response.ok) {
    let message = 'Background removal failed.';
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {
      // non-JSON error body
    }
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  return response.blob();
}

/** Turns a PNG blob into a downloadable File for stall uploads / previews. */
export function blobToPngFile(blob, baseName = 'cutout') {
  const safe = String(baseName).replace(/\.[^.]+$/, '') || 'cutout';
  return new File([blob], `${safe}-no-bg.png`, { type: 'image/png' });
}
