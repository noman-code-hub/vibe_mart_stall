/**
 * Sell Smart “YOU CAN SELL!” categories — only these may be chosen for products.
 */
export const PRODUCT_CATEGORIES = [
  'Clothing',
  'Trainers',
  'Vintage fashion',
  'Handmade items',
  'Art & crafts',
  'Jewellery',
  'Toys',
  'Books',
  'Homeware',
  'Collectables',
  'Electronics (where permitted)',
]

export const CATEGORY_REQUIRED_MESSAGE = 'Select the category'

export function isAllowedProductCategory(value) {
  return PRODUCT_CATEGORIES.includes(String(value || '').trim())
}
