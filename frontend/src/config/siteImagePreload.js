/**
 * First-load preload list — static page/layout art + published market media.
 * Splash stays until these finish (failures do not block forever).
 */
import footerBg from '../assets/d8770035-4dca-4c22-aef3-f2d92299155f.png'
import headerBg from '../assets/399f487b-9e42-4393-8c24-72bf2418072d.png'
import brandLogo from '../assets/96b97ec6-2221-44b3-b791-966c3b89491c.png'
import iconHome from '../assets/1 HOME.png'
import iconVibes from '../assets/2 VIBES.png'
import iconSell from '../assets/3 SELL.png'
import iconAccount from '../assets/4 ACCOUNT.png'
import iconMarket from '../assets/5 MARKET.png'
import iconLogin from '../assets/6 LOGIN.png'
import iconCart from '../assets/7 MY CART.png'
import iconContact from '../assets/8 CONTACT.png'
import iconLogout from '../assets/LOG OUT.png'
import marketHeader from '../assets/VIBMART POP TOP MARKET.png'
import loginArt from '../assets/LOG IN CLEAN.png'
import signUpArt from '../assets/NEW SIGN UP A.png'
import contactArt from '../assets/CONTACT FORM.png'
import trolleyBanner from '../assets/TRAN.png'
import vibesArt from '../assets/OUR VIBES POP ART EXTRA.png'
import sellArt from '../assets/SELL.png'
import stallCart from '../assets/stall-cart.png'
import dashArt from '../assets/MY DASH.png'
import selfieTipsArt from '../assets/SELFIE PAGE.png'
import selfieTipsBtn from '../assets/SELFIE TIPS.png'
import marketStallTipsBtn from '../assets/market-stall-tips-transparent.png'
import marketStallTipsArt from '../assets/MARKET STALL FLOW.png'
import stallTemplateUrl from '../assets/stall-template.jpg'
import home1 from '../assets/homepage/1.png'
import home2 from '../assets/homepage/2.png'
import home3 from '../assets/homepage/3.png'
import home4 from '../assets/homepage/4.png'
import home5 from '../assets/homepage/5.png'
import home6 from '../assets/homepage/6.png'
import { listMarketplace } from '../services/stallApi.js'

/** Bundled assets used across main routes + chrome. */
export const STATIC_SITE_IMAGES = [
  footerBg,
  headerBg,
  brandLogo,
  iconHome,
  iconVibes,
  iconSell,
  iconAccount,
  iconMarket,
  iconLogin,
  iconCart,
  iconContact,
  iconLogout,
  marketHeader,
  loginArt,
  signUpArt,
  contactArt,
  trolleyBanner,
  vibesArt,
  sellArt,
  stallCart,
  dashArt,
  selfieTipsArt,
  selfieTipsBtn,
  marketStallTipsBtn,
  marketStallTipsArt,
  stallTemplateUrl,
  home1,
  home2,
  home3,
  home4,
  home5,
  home6,
  '/vibe-mart-logo.png?v=2',
]

export function preloadUrl(url) {
  if (!url || typeof url !== 'string' || url.startsWith('data:')) {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = resolve
    image.onerror = resolve
    image.src = url
  })
}

export function preloadUrls(urls) {
  const unique = [...new Set(urls.filter(Boolean))]
  return Promise.all(unique.map((url) => preloadUrl(url)))
}

function pushUrl(set, value) {
  if (typeof value === 'string' && value && !value.startsWith('data:')) {
    set.add(value)
  }
}

/** Collect seller + product image URLs from marketplace stalls. */
export function collectMarketplaceImageUrls(items = []) {
  const urls = new Set()
  for (const stall of items) {
    if (!stall || typeof stall !== 'object') continue
    pushUrl(urls, stall.seller_photo)
    pushUrl(urls, stall.banner_url)
    pushUrl(urls, stall.cover_image)

    const products = Array.isArray(stall.products) ? stall.products : []
    for (const product of products) {
      if (!product || typeof product !== 'object') continue
      pushUrl(urls, product.image_url)
      pushUrl(urls, product.image)
      if (Array.isArray(product.image_urls)) {
        product.image_urls.forEach((item) => pushUrl(urls, item))
      }
      if (Array.isArray(product.images)) {
        product.images.forEach((item) => {
          if (typeof item === 'string') pushUrl(urls, item)
          else if (item && typeof item.url === 'string') pushUrl(urls, item.url)
        })
      }
    }
  }
  return [...urls]
}

/**
 * Preload every main page asset in the background, plus market stall media.
 * Safe to call once on first load under the splash.
 */
export async function preloadAllSiteImages(config, signal = { cancelled: false }) {
  const staticTask = preloadUrls(STATIC_SITE_IMAGES)

  let marketTask = Promise.resolve()
  if (config) {
    marketTask = (async () => {
      try {
        const data = await listMarketplace(config)
        if (signal.cancelled) return
        const items = Array.isArray(data?.items) ? data.items : []
        await preloadUrls(collectMarketplaceImageUrls(items))
      } catch {
        // API/offline — still allow splash to finish after static assets.
      }
    })()
  }

  await Promise.all([staticTask, marketTask])
}
