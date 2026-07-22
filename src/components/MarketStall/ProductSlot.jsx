import styles from './ProductSlot.module.css';

const HEADER_COLORS = ['var(--teal)', 'var(--red)', 'var(--teal)', 'var(--red)'];

function truncate(text, max = 34) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default function ProductSlot({
  index,
  title,
  image,
  name,
  label,
  price,
  selected = false,
  onClick,
  style,
}) {
  const detail = truncate([name, label].filter(Boolean).join(' - '));
  const headerColor = HEADER_COLORS[index % HEADER_COLORS.length];

  return (
    <article
      className={`${styles.card}${selected ? ` ${styles.selected}` : ''}`}
      style={style}
      aria-label={name || title}
    >
      <button
        type="button"
        className={styles.hitArea}
        onClick={onClick}
        aria-label={name || title}
      />

      <div className={styles.header} style={{ backgroundColor: headerColor }}>
        <span>{title.toUpperCase()}</span>
      </div>

      <div className={styles.body}>
        {image ? (
          <img src={image} alt={name || title} className={styles.image} />
        ) : (
          <span className={styles.placeholder}>Add photo</span>
        )}
      </div>

      <div className={styles.tag}>
        {detail && <span className={styles.detail}>{detail}</span>}
        {price && <span className={styles.price}>{price}</span>}
      </div>
    </article>
  );
}
