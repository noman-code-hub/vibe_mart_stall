import styles from './Background.module.css';

/** Sepia blurred marketplace scene — pure CSS/SVG, no images. */
export default function Background({ className = '' }) {
  return (
    <div className={`${styles.background} ${className}`} aria-hidden="true">
      <div className={styles.sky} />
      <div className={styles.buildings}>
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className={styles.building} style={{ '--i': i }} />
        ))}
      </div>
      <div className={styles.crowd}>
        {Array.from({ length: 18 }, (_, i) => (
          <div key={i} className={styles.figure} style={{ '--i': i }} />
        ))}
      </div>
      <div className={styles.ground} />
      <div className={styles.vignette} />
    </div>
  );
}
