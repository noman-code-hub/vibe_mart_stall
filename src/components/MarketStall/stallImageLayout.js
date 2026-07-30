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
  /* Slightly taller banner box so larger trader names stay centered */
  arch: { left: 14, top: 15.8, width: 56, height: 11 },

  products: [
    {
      panel: { left: 10.2, top: 33.5, width: 13.8, height: 26.5 },
      board: { left: 12, top: 62.5, width: 9.4, height: 12 },
    },
    {
      panel: { left: 23.2, top: 33.5, width: 13.8, height: 26.5 },
      board: { left: 25.2, top: 62.5, width: 9.4, height: 12 },
    },
    {
      panel: { left: 36.2, top: 33.5, width: 13.8, height: 26.5 },
      board: { left: 38.4, top: 62.5, width: 9.4, height: 12 },
    },
    {
      panel: { left: 49.2, top: 33.5, width: 13.8, height: 26.5 },
      board: { left: 51.5, top: 62.5, width: 9.4, height: 12 },
    },
  ],

  /* Slightly shorter trader photo so it sits more naturally */
  seller: { left: 61.5, top: 18, width: 19, height: 80 },

  /* Blank middle of right board (below WHO'S BEHIND art) */
  infoPanel: { left: 80.2, top: 26.5, width: 15, height: 23 },

  /* Above MY AMBITION graphic */
  ambition: { left: 80.2, top: 52.5, width: 15, height: 13 },

  /* Separate pitch fields (PITCH NO: title + icons are in artwork) */
  pitchNumber: { left: 83, top: 74.2, width: 10, height: 3.5 },
  pitchLocation: { left: 85.5, top: 81.2, width: 10, height: 3 },
  /* Beside the box icon on the pitch board */
  pitchCount: { left: 85.5, top: 85.9, width: 7, height: 3.2 },
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
