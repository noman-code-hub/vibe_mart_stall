import styles from './Frame.module.css';

/** Dark teal stall frame — vertical/horizontal beams and rear braces. */
export default function Frame({ children, className = '' }) {
  return (
    <div className={`${styles.frame} ${className}`}>
      <div className={styles.cornerTL} aria-hidden="true" />
      <div className={styles.cornerTR} aria-hidden="true" />
      <div className={styles.cornerBL} aria-hidden="true" />
      <div className={styles.cornerBR} aria-hidden="true" />
      <div className={styles.topBeam} aria-hidden="true" />
      <div className={styles.bottomBeam} aria-hidden="true" />
      <div className={styles.rearLeft} aria-hidden="true" />
      <div className={styles.rearRight} aria-hidden="true" />
      <div className={styles.crossBraceL} aria-hidden="true" />
      <div className={styles.crossBraceR} aria-hidden="true" />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
