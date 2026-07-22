import fs from 'fs/promises';
import { removeBackgroundFromFile } from '../services/removeBgService.js';

async function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch {
    // ignore missing/already-deleted temp files
  }
}

/**
 * POST /api/remove-background
 * multipart field: "image"
 * success: image/png binary
 */
export async function removeBackgroundController(req, res, next) {
  const uploadedPath = req.file?.path;

  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image uploaded. Attach a file using the "image" form field.',
        code: 'MISSING_IMAGE',
      });
    }

    const pngBuffer = await removeBackgroundFromFile(uploadedPath);

    res.set({
      'Content-Type': 'image/png',
      'Content-Length': pngBuffer.length,
      'Cache-Control': 'no-store',
    });
    return res.status(200).send(pngBuffer);
  } catch (error) {
    return next(error);
  } finally {
    await safeUnlink(uploadedPath);
  }
}
