/**
 * Character / word caps that fit the stall overlay boxes.
 * Keep in sync with stallImageLayout.js panel sizes.
 */
export const FIELD_LIMITS = {
  businessName: { maxChars: 28, label: 'characters' },
  sellerName: { maxChars: 22, label: 'characters' },
  /** Fits the Who's Behind panel — hard stop at 60 letters */
  about: { maxChars: 60, label: 'letters' },
  /** Fits the ambition panel — hard stop at 50 letters */
  ambition: { maxChars: 50, label: 'letters' },
  pitchNumber: { maxChars: 12, label: 'characters' },
  pitchLocation: { maxChars: 20, label: 'characters' },
  memberSince: { maxChars: 14, label: 'characters' },
  productName: { maxChars: 26, label: 'characters' },
  productDescription: { maxChars: 50, label: 'letters' },
  productVariation: { maxChars: 10, label: 'characters' },
  productPrice: { maxChars: 10, label: 'characters' },
};

export function countWords(text) {
  const trimmed = String(text ?? '').trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function countChars(text) {
  return String(text ?? '').length;
}
