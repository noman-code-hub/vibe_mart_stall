// Layout coordinates mapped from stall-template.jpg (1024×576)
// and scaled to the 1920×1080 canvas.

export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
export const TEMPLATE_WIDTH = 1024;
export const TEMPLATE_HEIGHT = 576;

const SX = CANVAS_WIDTH / TEMPLATE_WIDTH;
const SY = CANVAS_HEIGHT / TEMPLATE_HEIGHT;

function box(x, y, w, h) {
  return {
    x: Math.round(x * SX),
    y: Math.round(y * SY),
    w: Math.round(w * SX),
    h: Math.round(h * SY),
  };
}

const PRODUCT_COLS = [
  { x: 52, imageY: 138, w: 218, imageH: 202, boardY: 348, boardH: 38 },
  { x: 278, imageY: 138, w: 218, imageH: 202, boardY: 348, boardH: 38 },
  { x: 504, imageY: 138, w: 218, imageH: 202, boardY: 348, boardH: 38 },
  { x: 730, imageY: 138, w: 218, imageH: 202, boardY: 348, boardH: 38 },
];

export const POS = {
  banner: box(210, 58, 604, 34),
  products: PRODUCT_COLS.map((col) => {
    const image = box(col.x, col.imageY, col.w, col.imageH);
    const board = box(col.x, col.boardY, col.w, col.boardH);
    const slot = box(col.x, col.imageY, col.w, col.boardY + col.boardH - col.imageY);
    return { image, board, x: slot.x, y: slot.y, w: slot.w, h: slot.h };
  }),
  sellerArea: box(598, 128, 218, 420),
  infoTopCard: box(832, 148, 168, 188),
  ambitionSection: box(832, 338, 168, 72),
  pitchCard: box(858, 422, 148, 98),
  vibeMartArch: box(318, 10, 388, 48),
  signBoardLeft: box(18, 418, 118, 118),
  supportCrate: box(430, 468, 168, 52),
};

export const SELFIE_RENDER_WIDTH = POS.sellerArea.w;

POS.whoCard = POS.infoTopCard;
POS.ambitionCard = POS.ambitionSection;
POS.signBoardRight = POS.supportCrate;
