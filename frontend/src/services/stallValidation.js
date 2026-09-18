import { validateProductsNotIllegal } from './illegalProducts.js'
import {
  CATEGORY_REQUIRED_MESSAGE,
  isAllowedProductCategory,
} from '../data/productCategories.js'

export const PRODUCT_IMAGE_REQUIRED_MESSAGE = 'Add at least one product image.'

function productHasImage(product) {
  if (!product) return false
  if (Array.isArray(product.files) && product.files.some(Boolean)) return true
  if (product.file) return true
  if (Array.isArray(product.image_urls) && product.image_urls.some(Boolean)) return true
  if (Array.isArray(product.images) && product.images.some(Boolean)) return true
  if (product.image_url || product.image) return true
  return false
}

/**
 * Stall publish checks — banned products + required Sell Smart categories + images.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateStallForPublish({ products = [] } = {}) {
  const illegal = validateProductsNotIllegal(products)
  if (!illegal.ok) return illegal

  const errors = []
  ;(Array.isArray(products) ? products : []).forEach((product, index) => {
    if (!product) return
    const hasContent =
      product.name ||
      product.description ||
      product.variation ||
      product.condition ||
      product.price ||
      productHasImage(product)
    if (!hasContent) return

    const label =
      String(product?.name || `Product ${index + 1}`).trim() || `Product ${index + 1}`

    if (!isAllowedProductCategory(product.category)) {
      errors.push(`${label}: ${CATEGORY_REQUIRED_MESSAGE}`)
    }
    if (!productHasImage(product)) {
      errors.push(`${label}: ${PRODUCT_IMAGE_REQUIRED_MESSAGE}`)
    }
  })

  return { ok: errors.length === 0, errors }
}
