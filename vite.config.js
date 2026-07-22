import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Pin the dev URL so it never drifts to 5174/5175 when a stale process
    // lingers. strictPort makes Vite fail loudly (instead of silently moving
    // ports) so you know to clear the old process.
    port: 3000,
    strictPort: true,
    // Proxy API calls to the Express server so the browser never sees the key
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
