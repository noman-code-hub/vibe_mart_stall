import { useEffect, useMemo, useRef, useState } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, POS } from '../layout/pos';
import { drawStall } from '../layout/drawStall';
import stallTemplateUrl from '../assets/stall-template.jpg';
import './StallCanvasPreview.css';

// Loads a URL string (object URL or data-URI) into an HTMLImageElement.
function useImageFromUrl(url) {
  const [loaded, setLoaded] = useState({ url: null, img: null });

  useEffect(() => {
    if (!url) return undefined;
    let cancelled = false;
    const img = new Image();
    img.onload = () => { if (!cancelled) setLoaded({ url, img }); };
    img.onerror = () => { if (!cancelled) setLoaded({ url, img: null }); };
    img.src = url;
    return () => { cancelled = true; };
  }, [url]);

  return loaded.url === url ? loaded.img : null;
}

/**
 * Renders the stall canvas. Receives pre-resolved URL strings from App so
 * the URLs survive the edit→finished step transition (App never unmounts,
 * the editor form does — that was revoking object URLs before the canvas
 * could load them).
 *
 * Props:
 *  selfieUrl       - string URL for the seller photo
 *  productUrls     - [url0, url1, url2, url3] string URLs for product photos
 *  variant         - 'edit' | 'finished'
 */
export default function StallCanvasPreview({
  data,
  productSlots,
  selfieUrl,
  productUrls = [],
  variant = 'edit',
}) {
  const canvasRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);

  const templateImage = useImageFromUrl(stallTemplateUrl);
  const selfieImage = useImageFromUrl(selfieUrl);
  const productImage0 = useImageFromUrl(productUrls[0] ?? null);
  const productImage1 = useImageFromUrl(productUrls[1] ?? null);
  const productImage2 = useImageFromUrl(productUrls[2] ?? null);
  const productImage3 = useImageFromUrl(productUrls[3] ?? null);

  const products = productSlots.map((p) => ({ name: p.name, description: p.description, price: p.price }));

  const hotspots = useMemo(() => buildHotspots(productSlots), [productSlots]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    drawStall(
      ctx,
      { ...data, products },
      {
        template: templateImage,
        selfie: selfieImage,
        products: [productImage0, productImage1, productImage2, productImage3],
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, JSON.stringify(products), templateImage, selfieImage, productImage0, productImage1, productImage2, productImage3]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const safeName = (data.business_name || 'stall').trim().toLowerCase().replace(/\s+/g, '-') || 'stall';
    link.href = url;
    link.download = `${safeName}-preview.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const interactive = variant === 'finished';

  return (
    <div className={`stall-preview stall-preview--${variant}`}>
      <div className="stall-preview__canvas-wrap">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="stall-preview__canvas"
        />
        <button
          type="button"
          className="stall-preview__download-icon"
          onClick={handleDownload}
          title="Download PNG (client-side preview, for testing only)"
          aria-label="Download PNG preview"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 4v11" strokeLinecap="round" />
            <path d="M7 11l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 20h14" strokeLinecap="round" />
          </svg>
        </button>

        {interactive && (
          <div className="stall-hotspots" onClick={() => setSelectedId(null)} role="presentation">
            {hotspots.map((h) => {
              const isSelected = selectedId === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  className={`stall-hotspot${isSelected ? ' is-selected' : ''}`}
                  style={{
                    left: `${(h.box.x / CANVAS_WIDTH) * 100}%`,
                    top: `${(h.box.y / CANVAS_HEIGHT) * 100}%`,
                    width: `${(h.box.w / CANVAS_WIDTH) * 100}%`,
                    height: `${(h.box.h / CANVAS_HEIGHT) * 100}%`,
                  }}
                  title={h.label}
                  aria-label={h.label}
                  aria-pressed={isSelected}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId((prev) => (prev === h.id ? null : h.id));
                  }}
                >
                  <span className="stall-hotspot__label">{h.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {interactive && (
        <p className="stall-preview__hint">
          {selectedId
            ? `Selected: ${hotspots.find((h) => h.id === selectedId)?.label}`
            : 'Click any element on the stall to highlight it.'}
        </p>
      )}
    </div>
  );
}

function buildHotspots(productSlots = []) {
  const spots = [
    { id: 'vibeMart', label: 'Vibe Mart', box: POS.vibeMartArch },
    { id: 'banner', label: 'Business name', box: POS.banner },
    { id: 'selfie', label: 'Seller photo', box: POS.sellerArea },
    { id: 'who', label: "Who's behind this stall", box: POS.whoCard },
    { id: 'ambition', label: 'My ambition', box: POS.ambitionCard },
    { id: 'pitch', label: 'Pitch info', box: POS.pitchCard },
    { id: 'signLeft', label: 'Thanks sign', box: POS.signBoardLeft },
    { id: 'signRight', label: 'Shop independent sign', box: POS.supportCrate },
  ];
  POS.products.forEach((box, i) => {
    if (productSlots[i]) {
      spots.push({ id: `product-${i}`, label: productSlots[i].name || `Product ${i + 1}`, box });
    }
  });
  return spots;
}
