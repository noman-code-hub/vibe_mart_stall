import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024;

export const config = {
  port: Number(process.env.PORT) || 3001,
  removeBgApiKey: process.env.REMOVE_BG_API_KEY || '',
  maxUploadBytes: MAX_UPLOAD_BYTES,
  uploadsDir: path.resolve(__dirname, 'uploads'),
  allowedMimeTypes: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
};
