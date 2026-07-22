import styles from './PitchSign.module.css';

export default function PitchSign({ pitch = {}, style }) {
  const { number, location, product_count } = pitch;
  if (!number && !location && !product_count) return null;

  return (
    <div className={styles.sign} style={style} aria-label="Pitch information">
      <div className={styles.frame} aria-hidden="true">
        <span className={styles.ring} />
        <span className={styles.ring} />
      </div>

      <div className={styles.board}>
        <p className={styles.heading}>Pitch no:</p>
        {number && <p className={styles.number}>{number}</p>}
        {location && <p className={styles.line}>{location}</p>}
        {product_count > 0 && (
          <p className={styles.line}>
            {product_count} product{product_count === 1 ? '' : 's'}
          </p>
        )}
      </div>

      <div className={styles.base} aria-hidden="true" />
    </div>
  );
}
