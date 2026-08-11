/**
 * First-load splash — dismisses the #vm-splash markup from index.html
 * once the document, fonts, and app shell are ready.
 */
import { useEffect } from 'react'

const MIN_VISIBLE_MS = 750
const FADE_MS = 420

function waitForWindowLoad() {
  if (document.readyState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    window.addEventListener('load', resolve, { once: true })
  })
}

function waitForFonts() {
  if (document.fonts?.ready) return document.fonts.ready.catch(() => undefined)
  return Promise.resolve()
}

function waitMinTime(startedAt) {
  const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt))
  return new Promise((resolve) => setTimeout(resolve, remaining))
}

export function dismissAppSplash() {
  const splash = document.getElementById('vm-splash')
  if (!splash) return

  splash.classList.add('is-done')
  splash.setAttribute('aria-busy', 'false')
  document.documentElement.classList.remove('vm-splash-lock')

  window.setTimeout(() => {
    splash.remove()
  }, FADE_MS)
}

export default function AppSplash() {
  useEffect(() => {
    const startedAt = Number(window.__vmSplashStartedAt) || Date.now()
    let cancelled = false

    ;(async () => {
      try {
        await Promise.all([waitForWindowLoad(), waitForFonts(), waitMinTime(startedAt)])
      } catch {
        // Still dismiss so users are never stuck behind the splash.
      }
      if (!cancelled) dismissAppSplash()
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
