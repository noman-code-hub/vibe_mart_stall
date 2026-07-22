import rateLimit from 'express-rate-limit';

/** Soft limit to protect the remove.bg quota and this server. */
export const removeBackgroundLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many background-removal requests. Please wait and try again.',
    code: 'RATE_LIMITED',
  },
});
