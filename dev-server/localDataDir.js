/**
 * Shared data directory for local Vite mocks and Vercel serverless handlers.
 *
 * Local: `.local-data/` in the repo
 * Vercel: `/tmp/vibe-mart-local-data` (ephemeral — resets on cold starts)
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function isVercelRuntime() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV)
}

export function getLocalDataDir() {
  if (isVercelRuntime()) {
    // Bump this folder when wiping Vercel test accounts (old /tmp files stay unused).
    return path.join('/tmp', 'vibe-mart-local-data-v2')
  }
  return path.join(__dirname, '..', '.local-data')
}
