/**
 * First-load splash only — stays until fonts, DOM images, all page art,
 * and marketplace stall images are preloaded in the background.
 * Does not reopen on later navigations.
 */
import { useEffect, useRef } from 'react'
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx'
import { preloadAllSiteImages } from '../config/siteImagePreload.js'

const MIN_VISIBLE_MS = 900
const IMAGE_SETTLE_MS = 250
const MAX_WAIT_MS = 30000
const FADE_MS = 420
const STABLE_ROUNDS_WITH_IMAGES = 4
const STABLE_ROUNDS_EMPTY = 5

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

    try {
      const bg = getComputedStyle(node).backgroundImage
      extractUrlsFromCssValue(bg).forEach((url) => urls.add(url))
    } catch {
      // Ignore
    }
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

/** Wait until currently mounted page images settle (Market after redirect, chrome, etc.). */
async function waitForMountedImages(signal) {
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

    if (stableRounds >= STABLE_ROUNDS_WITH_IMAGES && count > 0) return
    if (stableRounds >= STABLE_ROUNDS_EMPTY && count === 0) return

    await wait(IMAGE_SETTLE_MS)
  }
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
  const config = useRuntimeConfig()
  const configRef = useRef(config)
  configRef.current = config

  useEffect(() => {
    const startedAt = Number(window.__vmSplashStartedAt) || Date.now()
    const signal = { cancelled: false }

    ;(async () => {
      try {
        await Promise.all([waitForWindowLoad(), waitForFonts(), waitMinTime(startedAt)])
        if (signal.cancelled) return

        // Mounted UI images + background preload of every main page + market media.
        await Promise.all([
          waitForMountedImages(signal),
          preloadAllSiteImages(configRef.current, signal),
        ])
      } catch {
        // Still dismiss after failures / max wait.
      }

      if (!signal.cancelled) dismissAppSplash()
    })()

    return () => {
      signal.cancelled = true
    }
  }, [])

  return null
}
