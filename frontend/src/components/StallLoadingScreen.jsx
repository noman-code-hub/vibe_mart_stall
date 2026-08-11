import styles from './StallLoadingScreen.module.css';

export default function StallLoadingScreen() {
  return (
    <div className={styles.screen} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.card}>
        <div className={styles.awning} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.title}>Building your stall…</p>
        <p className={styles.hint}>Loading the market cart artwork</p>
      </div>
    </div>
  );
}
