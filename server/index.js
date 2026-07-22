import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import removeBackgroundRouter from './routes/removeBackground.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    removeBgConfigured: Boolean(config.removeBgApiKey),
  });
});

app.use('/api/remove-background', removeBackgroundRouter);

app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`Vibe Mart API listening on http://localhost:${config.port}`);
  if (!config.removeBgApiKey) {
    console.warn('WARNING: REMOVE_BG_API_KEY is not set. Background removal will fail.');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `Port ${config.port} is already in use. Stop the other process (or the other npm run dev) and try again.`
    );
    process.exit(1);
  }
  throw err;
});
