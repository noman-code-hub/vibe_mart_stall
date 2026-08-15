/**
 * Map a stall API record → props for the Live Preview MarketStall component.
 */

/** Strip currency marks so the form can store a plain amount. */
export function priceAmount(price) {
  return String(price ?? '')
    .replace(/£/g, '')
    .trim()
}

/** Stall face / shopper display — £ on the left (e.g. £6.50). */
export function formatStallPrice(price) {
  const amount = priceAmount(price)
  return amount ? `£${amount}` : ''
}

/**
 * Split size vs condition for buyer UI.
 * Legacy stalls only stored one value (as condition) — treat that as size.
 */
export function productSizeAndCondition(product) {
  const size = String(product?.variation || product?.size || '').trim()
  const condition = String(product?.condition || '').trim()
  if (!size && condition) {
    return { size: condition, condition: '' }
  }
  if (size && condition && size === condition) {
    return { size, condition: '' }
  }
  return { size, condition }
}

export function stallToMarketStallProps(stall) {
  if (!stall) return null

  const products = Array.isArray(stall.products)
    ? stall.products.map((product, index) => {
        const images = (
          Array.isArray(product.image_urls) && product.image_urls.length
            ? product.image_urls
            : Array.isArray(product.images) && product.images.length
              ? product.images
              : [product.image_url || product.image]
        )
          .map((item) => (typeof item === 'string' ? item : ''))
          .filter(Boolean)

        const { size, condition } = productSizeAndCondition(product)
        return {
          id: product.id ?? index,
          title: product.name || `Product ${index + 1}`,
          name: product.name || '',
          label: size,
          variation: size,
          condition,
          description: product.description || '',
          image: images[0] || null,
          images,
          image_urls: images,
          price: product.price || '',
        }
      })
    : []

  return {
    businessName: stall.brand_name || '',
    seller: {
      name: stall.seller?.name || stall.seller_name || stall.brand_name || '',
      about: stall.seller_bio || stall.seller?.about || '',
      ambition: stall.ambition || stall.seller?.ambition || '',
    },
    pitch: {
      number: stall.pitch_number || '',
      location: stall.pitch_location || '',
      member_since: stall.member_since || '',
      product_count: stall.product_count || products.length,
    },
    selfieUrl: stall.seller_photo || '',
    selfieAlt: stall.brand_name || 'Trader',
    products,
  }
}

/**
 * Map a stall API record → Stall Generator editor state (dashboard autofill).
 */
export function stallToEditorState(stall) {
  if (!stall) return null

  const productSlots = (Array.isArray(stall.products) ? stall.products : [])
    .slice(0, 4)
    .map((product) => {
      const urls = (
        Array.isArray(product.image_urls) && product.image_urls.length
          ? product.image_urls
          : Array.isArray(product.images) && product.images.length
            ? product.images
            : [product.image_url || product.image]
      )
        .map((item) => (typeof item === 'string' ? item : ''))
        .filter(Boolean)

      const files = Array.from({ length: 6 }, () => null)
      urls.slice(0, 6).forEach((url, index) => {
        files[index] = url
      })

      const { size, condition } = productSizeAndCondition(product)
      return {
        name: product.name || '',
        description: product.description || '',
        variation: size,
        condition,
        price: product.price || '',
        files,
      }
    })

  return {
    savedStallId: stall.id ?? null,
    status: stall.status === 'published' ? 'published' : 'draft',
    data: {
      business_name: stall.brand_name || stall.business_name || '',
      seller: {
        name: stall.seller?.name || stall.seller_name || '',
        about: stall.seller_bio || stall.seller?.about || '',
        ambition: stall.ambition || stall.seller?.ambition || '',
      },
      pitch: {
        number: stall.pitch_number || '',
        location: stall.pitch_location || '',
        member_since: stall.member_since || '',
        rating: Number(stall.rating) || 0,
        review_count: Number(stall.review_count) || 0,
      },
    },
    selfieFile: stall.seller_photo || null,
    productSlots,
  }
}
