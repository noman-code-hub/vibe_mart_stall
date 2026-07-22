import ProductCard from './ProductCard.jsx';
import styles from './ProductArea.module.css';

/** Four-slot product grid — 4 / 2 / 1 columns responsive. */
export default function ProductArea({ products = [], className = '', onProductClick }) {
  const slots = Array.from({ length: 4 }, (_, i) => products[i] ?? null);

  return (
    <section className={`${styles.area} ${className}`} aria-label="Products">
      {slots.map((product, index) => (
        <ProductCard
          key={product?.id ?? `slot-${index}`}
          index={index}
          title={product?.title}
          image={product?.image}
          price={product?.price}
          description={product?.description}
          button={product?.button}
          onClick={onProductClick ? () => onProductClick(index, product) : undefined}
        >
          {!product && 'Coming soon'}
        </ProductCard>
      ))}
    </section>
  );
}
