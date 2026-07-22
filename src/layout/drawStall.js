import { CANVAS_WIDTH, CANVAS_HEIGHT, POS } from './pos';
import {
  wrapText,
  drawImageContain,
  drawImageContainTrimmed,
  truncateToWidth,
} from './canvasHelpers';

const BODY_FONT = "'Segoe UI', system-ui, sans-serif";
const SCRIPT_FONT = "'Brush Script MT', 'Segoe Script', 'Palatino Linotype', cursive";
const DISPLAY_FONT = "'Georgia', 'Times New Roman', serif";

const PALETTE = {
  ink: '#1e1208',
  inkSoft: '#4a3828',
  price: '#a82e22',
  bannerText: '#1a1008',
};

function clear(ctx) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawTemplate(ctx, templateImg) {
  if (templateImg?.width) {
    ctx.drawImage(templateImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    return;
  }

  ctx.fillStyle = '#c8b8a0';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function fitFontSize(ctx, text, maxWidth, startSize, fontBuilder, minSize = 14) {
  let size = startSize;
  ctx.font = fontBuilder(size);
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = fontBuilder(size);
  }
  return size;
}

function drawBanner(ctx, businessName) {
  const { x, y, w, h } = POS.banner;
  const text = businessName?.trim();
  if (!text) return;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.bannerText;
  const size = fitFontSize(ctx, text, w - 20, 36, (s) => `700 ${s}px ${SCRIPT_FONT}`, 16);
  ctx.font = `700 ${size}px ${SCRIPT_FONT}`;
  ctx.fillText(truncateToWidth(ctx, text, w - 20), x + w / 2, y + h / 2 + 1);
}

function drawProductOverlays(ctx, products, images) {
  POS.products.forEach((slot, index) => {
    const product = products[index];
    const img = images[index];
    const { x, y, w, h } = slot.image;
    const board = slot.board;

    if (product && img) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      drawImageContain(ctx, img, x, y, w, h, 'center');
      ctx.restore();
    }

    if (!product) return;

    const cx = board.x + board.w / 2;
    const textW = board.w - 12;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    const name = product.name || '';
    const desc = product.description || '';
    const price = product.price || '';
    const combined = [name, desc, price].filter(Boolean).join('  ');

    ctx.fillStyle = PALETTE.ink;
    ctx.font = `700 15px ${BODY_FONT}`;
    const line = truncateToWidth(ctx, combined, textW);
    ctx.fillText(line, cx, board.y + board.h / 2 + 5);
  });
}

function drawSeller(ctx, selfieImg) {
  if (!selfieImg) return;
  const { x, y, w, h } = POS.sellerArea;
  drawImageContainTrimmed(ctx, selfieImg, x, y, w, h, 'bottom-center');
}

function drawInfoTopCard(ctx, seller) {
  const { x, y, w, h } = POS.infoTopCard;
  if (!seller?.name && !seller?.about) return;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  let cursorY = y + 8;
  if (seller?.name) {
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `700 18px ${BODY_FONT}`;
    ctx.fillText(truncateToWidth(ctx, `Hi, I'm ${seller.name}!`, w), x, cursorY + 16);
    cursorY += 28;
  }

  if (seller?.about) {
    ctx.fillStyle = PALETTE.inkSoft;
    ctx.font = `15px ${BODY_FONT}`;
    wrapText(ctx, seller.about, x, cursorY + 14, w, 20, Math.floor((y + h - cursorY) / 20));
  }
}

function drawAmbitionCard(ctx, seller) {
  const { x, y, w, h } = POS.ambitionSection;
  if (!seller?.ambition) return;

  ctx.fillStyle = PALETTE.inkSoft;
  ctx.font = `15px ${BODY_FONT}`;
  ctx.textAlign = 'left';
  wrapText(ctx, seller.ambition, x, y + 16, w, 18, Math.floor(h / 18));
}

function drawPitchCard(ctx, pitch) {
  const { x, y, w, h } = POS.pitchCard;
  const p = pitch || {};
  const innerW = w - 8;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = PALETTE.ink;
  ctx.font = `700 20px ${DISPLAY_FONT}`;
  ctx.fillText(truncateToWidth(ctx, p.number || '', innerW), x, y + 28);

  ctx.font = `13px ${BODY_FONT}`;
  ctx.fillText(truncateToWidth(ctx, p.location || '', innerW), x + 4, y + 52);

  const productCount = Number(p.product_count) || 0;
  if (productCount > 0) {
    ctx.fillText(`${productCount} product${productCount === 1 ? '' : 's'}`, x + 4, y + 72);
  }
}

export function drawStall(ctx, data, images = {}) {
  const products = data?.products || [];
  const productImages = images.products || [];

  clear(ctx);
  drawTemplate(ctx, images.template || null);
  drawBanner(ctx, data?.business_name);
  drawProductOverlays(ctx, products, productImages);
  drawInfoTopCard(ctx, data?.seller);
  drawAmbitionCard(ctx, data?.seller);
  drawPitchCard(ctx, data?.pitch);
  drawSeller(ctx, images.selfie || null);
}
