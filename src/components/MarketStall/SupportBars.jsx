import styles from './SupportBars.module.css';

/** Metal rods, beam supports, and diagonal braces. */
export default function SupportBars({ className = '' }) {
  return (
    <div className={`${styles.supports} ${className}`} aria-hidden="true">
      <svg className={styles.svg} viewBox="0 0 920 120" preserveAspectRatio="none">
        <line x1="60" y1="10" x2="60" y2="110" stroke="var(--metal)" strokeWidth="4" />
        <line x1="860" y1="10" x2="860" y2="110" stroke="var(--metal)" strokeWidth="4" />
        <line x1="60" y1="30" x2="860" y2="30" stroke="var(--outline)" strokeWidth="3" opacity="0.4" />
        <line x1="120" y1="20" x2="280" y2="100" stroke="var(--outline)" strokeWidth="2.5" opacity="0.3" />
        <line x1="800" y1="20" x2="640" y2="100" stroke="var(--outline)" strokeWidth="2.5" opacity="0.3" />
        <circle cx="60" cy="30" r="6" fill="var(--metal-light)" stroke="var(--outline)" strokeWidth="1.5" />
        <circle cx="860" cy="30" r="6" fill="var(--metal-light)" stroke="var(--outline)" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
