/**
 * Cart-only background (1024×576) — boxes are coded in HTML/CSS.
 */
export const STALL_IMAGE = {
  width: 1024,
  height: 576,
  aspectRatio: '1024 / 576',
};

export const OVERLAY = {
  arch: { left: 22, top: 3.5, width: 56, height: 9.5 },

  products: [
    { left: 16, top: 31.5, width: 11, height: 36.5 },
    { left: 28, top: 31.5, width: 11, height: 36.5 },
    { left: 40, top: 31.5, width: 11, height: 36.5 },
    { left: 52, top: 31.5, width: 11, height: 36.5 },
  ],

  seller: { left: 63, top: 24, width: 21, height: 75 },

  infoPanel: { left: 84, top: 29, width: 15, height: 50 },

  pitchSign: { left: 83, top: 79, width: 17, height: 28 },
};

export function overlayStyle(box) {
  return {
    position: 'absolute',
    left: `${box.left}%`,
    top: `${box.top}%`,
    width: `${box.width}%`,
    height: `${box.height}%`,
  };
}
