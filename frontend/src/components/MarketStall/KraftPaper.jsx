import styles from './KraftPaper.module.css';

/** Kraft paper price tag — taped look with slight rotation. */
export default function KraftPaper({ children, rotation = -1, className = '' }) {
  return (
    <div className={`${styles.kraft} ${className}`} style={{ '--rotate': `${rotation}deg` }}>
      <div className={styles.tape} aria-hidden="true" />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
