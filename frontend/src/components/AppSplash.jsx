/**
 * Splash overlay — first load, then again on image-heavy routes until page images are ready.
 * Splash is hidden/shown (kept in the DOM), not removed after first dismiss.
 */
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const MIN_VISIBLE_MS = 900
const NAV_MIN_VISIBLE_MS = 450
const IMAGE_SETTLE_MS = 180
const MAX_WAIT_MS = 20000

/** Routes with large artwork / product media — show splash while images load. */
const HEAVY_PATHS = ['/market', '/contact', '/my-trolley', '/login', '/register', '/my-account']

function normalizePath(pathname) {
  const p = (pathname || '/').replace(/\/+$/, '')
  return p || '/'
}

function isHeavyPath(pathname) {
  const p = normalizePath(pathname)
  return HEAVY_PATHS.some((base) => p === base || p.startsWith(`${base}/`))
}

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

function waitMinTime(startedAt, minMs) {
  const remaining = Math.max(0, minMs - (Date.now() - startedAt))
  return new Promise((resolve) => setTimeout(resolve, remaining))
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function waitForImageElement(img) {
  if (!img) return Promise.resolve()
  if (img.complete && img.naturalWidth > 0) return Promise.resolve()
  if (img.complete && img.naturalWidth === 0 && img.src) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const done = () => {
      img.removeEventListener('load', done)
      img.removeEventListener('error', done)
      resolve()
    }
    img.addEventListener('load', done)
    img.addEventListener('error', done)
  })
}

function waitForUrl(url) {
  if (!url || url === 'none') return Promise.resolve()
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = resolve
    image.onerror = resolve
    image.src = url
  })
}

function extractUrlsFromCssValue(value) {
  if (!value || value === 'none') return []
  const urls = []
  const re = /url\(\s*(['"]?)(.*?)\1\s*\)/gi
  let match
  while ((match = re.exec(value))) {
    const url = match[2]?.trim()
    if (url && !url.startsWith('data:')) urls.push(url)
  }
  return urls
}

function collectBackgroundUrls(root) {
  const urls = new Set()
  const nodes = root.querySelectorAll('*')
  nodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) return
    const inline = node.getAttribute('style') || ''
    extractUrlsFromCssValue(inline).forEach((url) => urls.add(url))

    ;['--vm-header-bg', '--vm-footer-bg'].forEach((name) => {
      const raw = node.style?.getPropertyValue?.(name)
      extractUrlsFromCssValue(raw).forEach((url) => urls.add(url))
    })
  })
  return [...urls]
}

function getAppRoot() {
  return (
    document.getElementById('vibe-mart-root') ||
    document.getElementById('stall-root') ||
    document.body
  )
}

function isSplashImage(img) {
  return Boolean(img.closest('#vm-splash'))
}

async function waitForCurrentImages(root) {
  const imgs = [...root.querySelectorAll('img')].filter((img) => !isSplashImage(img))
  const bgUrls = collectBackgroundUrls(root)
  await Promise.all([
    ...imgs.map((img) => waitForImageElement(img)),
    ...bgUrls.map((url) => waitForUrl(url)),
  ])
  return imgs.length + bgUrls.length
}

/**
 * Keep waiting while React mounts more images / CSS backgrounds.
 * Splash stays until the page image set is stable and loaded.
 */
async function waitForWebsiteImages(signal) {
  const root = getAppRoot()
  const deadline = Date.now() + MAX_WAIT_MS
  let lastCount = -1
  let stableRounds = 0

  while (!signal.cancelled && Date.now() < deadline) {
    const count = await waitForCurrentImages(root)
    if (signal.cancelled) return

    if (count === lastCount) {
      stableRounds += 1
    } else {
      stableRounds = 0
      lastCount = count
    }

    if (stableRounds >= 2 && count > 0) return
    if (stableRounds >= 3 && count === 0) return

    await wait(IMAGE_SETTLE_MS)
  }
}

function ensureSplashElement() {
  let splash = document.getElementById('vm-splash')
  if (splash) return splash

  splash = document.createElement('div')
  splash.id = 'vm-splash'
  splash.setAttribute('role', 'status')
  splash.setAttribute('aria-live', 'polite')
  splash.setAttribute('aria-busy', 'true')
  splash.setAttribute('aria-label', 'Loading Vibe Mart')
  splash.innerHTML = `
    <div class="vm-splash__card">
      <img class="vm-splash__logo" src="/vibe-mart-logo.png?v=2" alt="Vibe Mart" width="380" height="168" decoding="async" />
      <div class="vm-splash__dots" aria-hidden="true">
        <span class="vm-splash__dot"></span>
        <span class="vm-splash__dot"></span>
        <span class="vm-splash__dot"></span>
      </div>
      <p class="vm-splash__copy">Opening the market…</p>
    </div>
  `
  document.body.prepend(splash)
  return splash
}

/** Hide splash — keep node for later route loads. */
export function dismissAppSplash() {
  const splash = document.getElementById('vm-splash')
  if (!splash) return

  splash.classList.add('is-done')
  splash.setAttribute('aria-busy', 'false')
  document.documentElement.classList.remove('vm-splash-lock')
}

export function showAppSplash() {
  const splash = ensureSplashElement()
  // Retrigger fade-in if we were mid-fade.
  splash.classList.remove('is-done')
  // Force style reflow so opacity transition applies cleanly.
  void splash.offsetWidth
  splash.setAttribute('aria-busy', 'true')
  document.documentElement.classList.add('vm-splash-lock')
  window.__vmSplashStartedAt = Date.now()
}

export default function AppSplash() {
  const location = useLocation()
  const firstLoadRef = useRef(true)
  const runIdRef = useRef(0)

  useEffect(() => {
    const runId = ++runIdRef.current
    const signal = { cancelled: false }
    const isFirst = firstLoadRef.current
    firstLoadRef.current = false

    const heavy = isHeavyPath(location.pathname)

    // After first paint, only image-heavy pages reopen the splash.
    if (!isFirst && !heavy) {
      dismissAppSplash()
      return () => {
        signal.cancelled = true
      }
    }

    if (!isFirst && heavy) {
      showAppSplash()
    }

    const startedAt = Number(window.__vmSplashStartedAt) || Date.now()
    const minMs = isFirst ? MIN_VISIBLE_MS : NAV_MIN_VISIBLE_MS

    ;(async () => {
      try {
        if (isFirst) {
          await Promise.all([waitForWindowLoad(), waitForFonts(), waitMinTime(startedAt, minMs)])
        } else {
          // Let the route mount so imgs appear under the splash.
          await wait(80)
          await waitMinTime(startedAt, minMs)
        }
        if (signal.cancelled || runId !== runIdRef.current) return

        await waitForWebsiteImages(signal)
      } catch {
        // Dismiss after failures / max wait path.
      }

      if (!signal.cancelled && runId === runIdRef.current) {
        dismissAppSplash()
      }
    })()

    return () => {
      signal.cancelled = true
    }
  }, [location.pathname])

  return null
}
