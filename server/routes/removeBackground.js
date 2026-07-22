import { Router } from 'express';
import { uploadImage } from '../middleware/upload.js';
import { removeBackgroundLimiter } from '../middleware/rateLimiter.js';
import { removeBackgroundController } from '../controllers/removeBackgroundController.js';

const router = Router();

router.post(
  '/',
  removeBackgroundLimiter,
  (req, res, next) => {
    uploadImage(req, res, (err) => {
      if (err) return next(err);
      return next();
    });
  },
  removeBackgroundController
);

export default router;
