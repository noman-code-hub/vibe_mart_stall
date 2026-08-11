import styles from './PitchBoxes.module.css';

/** Pitch number only — "PITCH NO:" title comes from artwork */
export function PitchNumber({ number, style }) {
  if (!number) return null;
  return (
    <div className={styles.box} style={style} aria-label="Pitch number">
      <p className={styles.number}>{number}</p>
    </div>
  );
}

/** Location line */
export function PitchLocation({ location, style }) {
  if (!location) return null;
  return (
    <div className={styles.box} style={style} aria-label="Pitch location">
      <p className={styles.line}>{location}</p>
    </div>
  );
}

/** Product count next to the box icon on the pitch board */
export function PitchCount({ count, style }) {
  const n = Number(count);
  if (!Number.isFinite(n) || n <= 0) return null;

  return (
    <div className={styles.box} style={style} aria-label="Product count">
      <p className={styles.count}>{n}</p>
    </div>
  );
}
