import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { RuntimeConfigProvider } from './context/RuntimeConfigContext.jsx'

// Theme prints #vibe-mart-root; index.html uses the same id for local Vite.
const container =
  document.getElementById('vibe-mart-root') || document.getElementById('stall-root')

if (container) {
  // Prefer BrowserRouter basename from WP when the site is in a subdirectory.
  const basename = window.vibeMartConfig?.basename || '/'

  createRoot(container).render(
    <StrictMode>
      <RuntimeConfigProvider>
        <AuthProvider>
          <BrowserRouter basename={basename}>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </RuntimeConfigProvider>
    </StrictMode>
  )
} else if (import.meta.env.DEV) {
  console.warn('[vibe-mart] No #vibe-mart-root element found — app was not mounted.')
}
