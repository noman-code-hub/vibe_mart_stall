import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { config } from '../config.js';

/**
 * Calls the official remove.bg API with a local image file and returns
 * a Buffer containing the transparent PNG response body.
 */
export async function removeBackgroundFromFile(filePath) {
  if (!config.removeBgApiKey) {
    const err = new Error('Server is missing REMOVE_BG_API_KEY. Add it to your .env file.');
    err.status = 500;
    err.code = 'MISSING_API_KEY';
    throw err;
  }

  const form = new FormData();
  form.append('size', 'auto');
  form.append('format', 'png');
  form.append('image_file', await fs.readFile(filePath), {
    filename: path.basename(filePath),
  });

  let response;
  try {
    response = await axios.post('https://api.remove.bg/v1.0/removebg', form, {
      responseType: 'arraybuffer',
      headers: {
        ...form.getHeaders(),
        'X-Api-Key': config.removeBgApiKey,
      },
      // Generous timeout — large images can take a few seconds
      timeout: 60_000,
      maxContentLength: 50 * 1024 * 1024,
      maxBodyLength: 50 * 1024 * 1024,
      validateStatus: () => true,
    });
  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      const err = new Error('The remove.bg request timed out. Please try again.');
      err.status = 504;
      err.code = 'TIMEOUT';
      throw err;
    }

    if (error.response) {
      const err = new Error('remove.bg rejected the request.');
      err.status = error.response.status || 502;
      err.code = 'REMOVE_BG_HTTP_ERROR';
      throw err;
    }

    const detail = error.code ? ` (${error.code})` : '';
    const err = new Error(`Could not reach the remove.bg API${detail}. Check your network connection.`);
    err.status = 503;
    err.code = 'NETWORK_ERROR';
    throw err;
  }

  if (response.status === 200) {
    return Buffer.from(response.data);
  }

  // remove.bg returns JSON errors even when we asked for an image body
  let message = 'Background removal failed.';
  let code = 'REMOVE_BG_ERROR';
  try {
    const parsed = JSON.parse(Buffer.from(response.data).toString('utf8'));
    message = parsed?.errors?.[0]?.title || parsed?.errors?.[0]?.detail || message;
    code = parsed?.errors?.[0]?.code || code;
  } catch {
    // keep defaults
  }

  if (code === 'insufficient_credits') {
    message =
      'remove.bg has no credits left on this API key. Add credits at remove.bg, then try again.';
  }

  const err = new Error(message);
  err.status = response.status >= 400 && response.status < 600 ? response.status : 502;
  err.code = code;
  throw err;
}
