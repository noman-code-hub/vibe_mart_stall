import styles from './Platform.module.css';

/** Dark brown wood platform with grain texture and drop shadow. */
export default function Platform({ children, className = '' }) {
  return (
    <div className={`${styles.platform} ${className}`}>
      <div className={styles.surface}>{children}</div>
    </div>
  );
}
