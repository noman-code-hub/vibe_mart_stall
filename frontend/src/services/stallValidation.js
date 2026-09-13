import { validateProductsNotIllegal } from './illegalProducts.js'
import {
  CATEGORY_REQUIRED_MESSAGE,
  isAllowedProductCategory,
} from '../data/productCategories.js'

/**
 * Stall publish checks — banned products + required Sell Smart categories.
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
      (Array.isArray(product.files) && product.files.some(Boolean)) ||
      product.file
    if (!hasContent) return
    if (!isAllowedProductCategory(product.category)) {
      const label =
        String(product?.name || `Product ${index + 1}`).trim() || `Product ${index + 1}`
      errors.push(`${label}: ${CATEGORY_REQUIRED_MESSAGE}`)
    }
  })

  return { ok: errors.length === 0, errors }
}
