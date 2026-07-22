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

/** Product count line */
export function PitchCount({ count, style }) {
  if (!count) return null;
  return (
    <div className={styles.box} style={style} aria-label="Product count">
      <p className={styles.line}>
        {count} product{count === 1 ? '' : 's'}
      </p>
    </div>
  );
}
