// Inline SVG placeholder art used only to make the local mock/sample data
// look presentable without needing real photos. None of this ships to
// Phase 2 - vendors upload real photos which get background-removed by
// remove.bg server-side.

function svgDataUrl(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const PRODUCT_COLORS = ['#c9a35c', '#a6714b', '#8f9b6b', '#b5654f'];

export function productPlaceholder(label, index = 0) {
  const bg = PRODUCT_COLORS[index % PRODUCT_COLORS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640">
    <rect width="640" height="640" rx="28" fill="${bg}" />
    <circle cx="320" cy="320" r="150" fill="#ffffff" opacity="0.22" />
  </svg>`;
  return svgDataUrl(svg);
}

// A tightly-cropped standing-figure silhouette, similar to what remove.bg
// returns for a full-body selfie: little to no transparent margin around
// the subject, so contain-fit scales it close to the full width of its box.
export function sellerPlaceholder() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="900">
    <ellipse cx="180" cy="115" rx="95" ry="105" fill="#d9b48a" />
    <path d="M 55 380 Q 180 260 305 380 L 340 900 L 20 900 Z" fill="#7a5a41" />
    <path d="M 85 340 Q 180 280 275 340 L 275 430 L 85 430 Z" fill="#c9a35c" />
  </svg>`;
  return svgDataUrl(svg);
}
