/**
 * Cart-only background (1024×576) — boxes are coded in HTML/CSS.
 * Each product has independent panel (image) and board (price) boxes.
 */
export const STALL_IMAGE = {
  width: 1024,
  height: 576,
  aspectRatio: '1024 / 576',
};

export const OVERLAY = {
  arch: { left: 14, top: 16.5, width: 56, height: 9.5 },

  products: [
    {
      panel: { left: 10.6, top: 34.5, width: 13, height: 24 },
      board: { left: 12.7, top: 65.5, width: 8, height: 6.5 },
    },
    {
      panel: { left: 23.6, top: 34.5, width: 13, height: 24 },
      board: { left: 25.7, top: 65.5, width: 8, height: 6.5 },
    },
    {
      panel: { left: 36.6, top: 34.5, width: 13, height: 24 },
      board: { left: 38.7, top: 65.5, width: 8, height: 6.5 },
    },
    {
      panel: { left: 49.6, top: 34.5, width: 13, height: 24 },
      board: { left: 51.7, top: 65.5, width: 8, height: 6.5 },
    },
  ],

  /* Keep selfie left of the right info board */
  seller: { left: 62, top: 17, width: 18, height: 80 },

  /* Blank middle of right board (below WHO'S BEHIND art) */
  infoPanel: { left: 80.5, top: 27, width: 14.5, height: 22 },

  /* Above MY AMBITION graphic */
  ambition: { left: 80.5, top: 52, width: 14.5, height: 12 },

  /* Separate pitch fields (PITCH NO: title + icons are in artwork) */
  pitchNumber: { left: 83.5, top: 76.5, width: 9, height: 3.2 },
  pitchLocation: { left: 84.5, top: 81.5, width: 9, height: 2.6 },
  pitchCount: { left: 83.5, top: 86.8, width: 9, height: 2.6 },
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

/** Combined hit area covering panel + board for one product. */
export function productHitStyle(zone) {
  const top = Math.min(zone.panel.top, zone.board.top);
  const bottom = Math.max(
    zone.panel.top + zone.panel.height,
    zone.board.top + zone.board.height
  );
  const left = Math.min(zone.panel.left, zone.board.left);
  const right = Math.max(
    zone.panel.left + zone.panel.width,
    zone.board.left + zone.board.width
  );

  return overlayStyle({
    left,
    top,
    width: right - left,
    height: bottom - top,
  });
}
