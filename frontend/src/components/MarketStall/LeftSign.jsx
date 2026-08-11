import Pole from './SVG/Pole.svg.jsx';
import styles from './LeftSign.module.css';

/** Standing thank-you sign with pole and cream board. */
export default function LeftSign({ children, className = '' }) {
  return (
    <aside className={`${styles.sign} ${className}`} aria-label="Supporting message">
      <div className={styles.board}>
        <div className={styles.border}>
          {children}
        </div>
      </div>
      <Pole width={10} height={72} className={styles.pole} />
      <div className={styles.base} aria-hidden="true" />
    </aside>
  );
}
