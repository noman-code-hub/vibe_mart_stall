export function errorHandler(err, _req, res, next) {
  // Express requires 4 args to treat this as an error middleware.
  void next;
  // Multer file-size / unexpected-field errors
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'Image is too large. Maximum size is 10 MB.',
      code: 'FILE_TOO_LARGE',
    });
  }

  if (err?.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Unexpected file field. Upload the image as "image".',
      code: 'UNEXPECTED_FIELD',
    });
  }

  const status = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message =
    status >= 500 && !err.code
      ? 'Something went wrong while removing the background.'
      : err.message || 'Request failed.';

  if (status >= 500) {
    console.error('[remove-background]', err);
  }

  return res.status(status).json({ error: message, code });
}
