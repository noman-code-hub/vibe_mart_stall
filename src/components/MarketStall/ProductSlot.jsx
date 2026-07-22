import styles from './ProductSlot.module.css';

export default function ProductSlot({
  title,
  image,
  name,
  label,
  price,
  selected = false,
  onClick,
  panelStyle,
  boardStyle,
  hitStyle,
}) {
  const detail = [name, label].filter(Boolean).join(' - ');

  return (
    <div className={`${styles.group}${selected ? ` ${styles.selected}` : ''}`} aria-label={name || title}>
      <button
        type="button"
        className={styles.hitArea}
        style={hitStyle}
        onClick={onClick}
        aria-label={name || title}
      />

      <div className={styles.panel} style={panelStyle}>
        <div className={styles.body}>
          {image ? (
            <img src={image} alt={name || title} className={styles.image} />
          ) : (
            <span className={styles.placeholder}>Add photo</span>
          )}
        </div>
      </div>

      <div className={styles.tag} style={boardStyle}>
        {detail && <span className={styles.detail}>{detail}</span>}
        {price && <span className={styles.price}>{price}</span>}
      </div>
    </div>
  );
}
