/** Free-tier max stalls per trader (mirrors plugin STALL_MAX_FREE). */
export const MAX_FREE_STALLS = 5

export const STALL_LIMIT_MESSAGE = 'Maximum 5 Free Stalls.'

/**
 * Convert a File/Blob (or pass-through string URL) into a storable data URL / URL string.
 */
export function fileToDataUrl(source) {
  if (!source) return Promise.resolve('')
  if (typeof source === 'string') return Promise.resolve(source)

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('Could not read image file.'))
    reader.readAsDataURL(source)
  })
}

/**
 * Build API payload from Stall Generator form state.
 * Quantity = product slot count; trust badges derived from rating / reviews (+ optional labels).
 */
export async function buildStallCreatePayload({ data, selfieFile, productSlots, status = 'published' }) {
  const sellerPhoto = await fileToDataUrl(selfieFile)
  const products = await Promise.all(
    (productSlots || []).map(async (slot, index) => {
      const files = Array.isArray(slot?.files)
        ? slot.files.filter(Boolean)
        : slot?.file
          ? [slot.file]
          : []
      const image_urls = (
        await Promise.all(files.map((file) => fileToDataUrl(file)))
      ).filter(Boolean)
      return {
        name: slot?.name || `Product ${index + 1}`,
        condition: slot?.variation || '',
        label: slot?.variation || '',
        variation: slot?.variation || '',
        price: slot?.price || '',
        description: slot?.description || '',
        image_url: image_urls[0] || '',
        image_urls,
      }
    })
  )

  const quantity = products.length
  const rating = Number(data?.pitch?.rating) || 0
  const reviewCount = Number(data?.pitch?.review_count) || 0

  const badges = []
  if (rating > 0) badges.push(`${rating}★ trusted`)
  if (reviewCount > 0) badges.push(`${reviewCount} reviews`)
  if (Array.isArray(data?.badges)) {
    for (const badge of data.badges) {
      const label = String(badge || '').trim()
      if (label && !badges.includes(label)) badges.push(label)
    }
  }

  return {
    brand_name: data?.business_name || '',
    business_name: data?.business_name || '',
    seller_name: data?.seller?.name || '',
    seller_photo: sellerPhoto,
    seller_bio: data?.seller?.about || '',
    ambition: data?.seller?.ambition || '',
    seller: {
      name: data?.seller?.name || '',
      about: data?.seller?.about || '',
      ambition: data?.seller?.ambition || '',
    },
    pitch_number: data?.pitch?.number || '',
    pitch_location: data?.pitch?.location || '',
    member_since: data?.pitch?.member_since || '',
    quantity,
    product_count: quantity,
    products,
    badges,
    status,
  }
}
