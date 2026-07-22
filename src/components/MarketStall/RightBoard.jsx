import Pole from './SVG/Pole.svg.jsx';
import styles from './RightBoard.module.css';

/**
 * Right information boards — top (who/ambition) and bottom (pitch) panels.
 */
export default function RightBoard({
  topTitle,
  topContent,
  ambitionTitle,
  ambitionContent,
  pitchTitle,
  pitchContent,
  className = '',
}) {
  return (
    <aside className={`${styles.boards} ${className}`} aria-label="Vendor information">
      <div className={styles.topPanel}>
        <div className={styles.panelFrame}>
          {topTitle && <h2 className={styles.topHeading}>{topTitle}</h2>}
          {topContent && <div className={styles.topBody}>{topContent}</div>}
          {ambitionTitle && (
            <h3 className={styles.ambitionHeading}>
              <span className={styles.target} aria-hidden="true">◎</span>
              {ambitionTitle}
            </h3>
          )}
          {ambitionContent && <div className={styles.ambitionBody}>{ambitionContent}</div>}
        </div>
        <Pole width={8} height={40} className={styles.pole} />
      </div>

      <div className={styles.bottomPanel}>
        <div className={styles.pitchFrame}>
          {pitchTitle && <h3 className={styles.pitchHeading}>{pitchTitle}</h3>}
          {pitchContent && <div className={styles.pitchBody}>{pitchContent}</div>}
        </div>
        <div className={styles.aFrame} aria-hidden="true">
          <div className={styles.aLegL} />
          <div className={styles.aLegR} />
        </div>
      </div>
    </aside>
  );
}
