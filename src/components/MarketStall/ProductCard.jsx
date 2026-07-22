import TopLabel from './TopLabel.jsx';
import KraftPaper from './KraftPaper.jsx';
import styles from './ProductCard.module.css';

const LABEL_COLORS = ['var(--blue-label)', 'var(--red)', 'var(--blue-label)', 'var(--red)'];

/**
 * Reusable product card — cream body, coloured label, kraft price tag.
 */
export default function ProductCard({
  title,
  image,
  price,
  description,
  button,
  children,
  index = 0,
  className = '',
  onClick,
}) {
  const labelColor = LABEL_COLORS[index % LABEL_COLORS.length];

  return (
    <article
      className={`${styles.card} ${className}`}
      aria-label={title || 'Product card'}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      role={onClick ? 'button' : undefined}
    >
      {title && <TopLabel color={labelColor} text={title} className={styles.label} />}

      <div className={styles.body}>
        <div className={styles.imageWell}>
          {image ? (
            typeof image === 'string' ? (
              <img src={image} alt={title || 'Product'} className={styles.image} />
            ) : (
              image
            )
          ) : (
            <span className={styles.placeholder}>{children || null}</span>
          )}
        </div>

        <KraftPaper rotation={index % 2 === 0 ? -1.5 : 1.2}>
          {price && <strong className={styles.price}>{price}</strong>}
          {description && <span className={styles.desc}>{description}</span>}
          {!price && !description && children}
        </KraftPaper>
      </div>

      {button && <div className={styles.action}>{button}</div>}
    </article>
  );
}
