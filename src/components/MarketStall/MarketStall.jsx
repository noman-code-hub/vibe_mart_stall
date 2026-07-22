import stallCart from '../../assets/stall-cart.png';
import { STALL_IMAGE, OVERLAY, overlayStyle } from './stallImageLayout.js';
import ProductSlot from './ProductSlot.jsx';
import StallInfoPanel from './StallInfoPanel.jsx';
import PitchSign from './PitchSign.jsx';
import SelfieSlot from './SelfieSlot.jsx';
import styles from './MarketStall.module.css';

export default function MarketStall({
  businessName,
  products = [],
  seller = {},
  pitch = {},
  selfieUrl,
  selfieAlt,
  className = '',
  onProductClick,
  selectedProductIndex = null,
}) {
  const slots = Array.from({ length: 4 }, (_, i) => {
    const p = products[i];
    return {
      id: i,
      image: p?.image ?? null,
      name: p?.name ?? '',
      label: p?.label ?? p?.description ?? '',
      price: p?.price ?? '',
      title: p?.title ?? `Product ${i + 1}`,
    };
  });

  return (
    <div className={`${styles.stall} ${className}`} style={{ aspectRatio: STALL_IMAGE.aspectRatio }}>
      <img
        src={stallCart}
        alt=""
        className={styles.stallImage}
        width={STALL_IMAGE.width}
        height={STALL_IMAGE.height}
        draggable={false}
      />

      <div className={styles.overlayLayer}>
        {businessName && (
          <div className={styles.arch} style={overlayStyle(OVERLAY.arch)}>
            <span className={styles.archText}>{businessName}</span>
          </div>
        )}

        {slots.map((slot, index) => (
          <ProductSlot
            key={slot.id}
            index={index}
            title={slot.title}
            image={slot.image}
            name={slot.name}
            label={slot.label}
            price={slot.price}
            selected={selectedProductIndex === index}
            onClick={onProductClick ? () => onProductClick(index, products[index]) : undefined}
            style={overlayStyle(OVERLAY.products[index])}
          />
        ))}

        <SelfieSlot
          src={selfieUrl}
          alt={selfieAlt ?? seller?.name ?? 'Vendor'}
          style={overlayStyle(OVERLAY.seller)}
        />

        <StallInfoPanel seller={seller} style={overlayStyle(OVERLAY.infoPanel)} />

        <PitchSign pitch={pitch} style={overlayStyle(OVERLAY.pitchSign)} />
      </div>

      {selectedProductIndex != null && (
        <p className={styles.selectionHint} aria-live="polite">
          Selected: Product {selectedProductIndex + 1}
        </p>
      )}
    </div>
  );
}

export { Box } from './Boxes.jsx';
