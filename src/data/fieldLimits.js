/**
 * Character / word caps that fit the stall overlay boxes.
 * Keep in sync with stallImageLayout.js panel sizes.
 */
export const FIELD_LIMITS = {
  businessName: { maxChars: 28, label: 'characters' },
  sellerName: { maxChars: 22, label: 'characters' },
  /** Decreased so text stays readable in the Who's Behind panel */
  about: { maxWords: 20, label: 'words' },
  /** Decreased for the smaller Ambition panel */
  ambition: { maxWords: 16, label: 'words' },
  pitchNumber: { maxChars: 12, label: 'characters' },
  pitchLocation: { maxChars: 20, label: 'characters' },
  memberSince: { maxChars: 14, label: 'characters' },
  productName: { maxChars: 26, label: 'characters' },
  productDescription: { maxChars: 16, label: 'characters' },
  productPrice: { maxChars: 10, label: 'characters' },
};

export function countWords(text) {
  const trimmed = String(text ?? '').trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function countChars(text) {
  return String(text ?? '').length;
}
