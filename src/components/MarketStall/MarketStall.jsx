import stallCart from '../../assets/stall-cart.png';
import { STALL_IMAGE, OVERLAY, overlayStyle, productHitStyle } from './stallImageLayout.js';
import ProductSlot from './ProductSlot.jsx';
import StallInfoPanel from './StallInfoPanel.jsx';
import AmbitionPanel from './AmbitionPanel.jsx';
import { PitchNumber, PitchLocation, PitchCount } from './PitchBoxes.jsx';
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

        {slots.map((slot, index) => {
          const zone = OVERLAY.products[index];
          return (
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
              panelStyle={overlayStyle(zone.panel)}
              boardStyle={overlayStyle(zone.board)}
              hitStyle={productHitStyle(zone)}
            />
          );
        })}

        <SelfieSlot
          src={selfieUrl}
          alt={selfieAlt ?? seller?.name ?? 'Vendor'}
          style={overlayStyle(OVERLAY.seller)}
        />

        <StallInfoPanel seller={seller} style={overlayStyle(OVERLAY.infoPanel)} />

        <AmbitionPanel ambition={seller?.ambition} style={overlayStyle(OVERLAY.ambition)} />

        <PitchNumber number={pitch?.number} style={overlayStyle(OVERLAY.pitchNumber)} />
        <PitchLocation location={pitch?.location} style={overlayStyle(OVERLAY.pitchLocation)} />
        <PitchCount count={pitch?.product_count} style={overlayStyle(OVERLAY.pitchCount)} />
      </div>
    </div>
  );
}

export { Box } from './Boxes.jsx';
