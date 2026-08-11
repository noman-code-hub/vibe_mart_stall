import styles from './Boxes.module.css';

/** Single cardboard box with tape and optional label. */
export function Box({ width = 80, height = 70, rotation = 0, label, className = '' }) {
  return (
    <div
      className={`${styles.box} ${className}`}
      style={{ width, height, transform: `rotate(${rotation}deg)` }}
      aria-label={label || 'Cardboard box'}
    >
      <div className={styles.flap} aria-hidden="true" />
      <div className={styles.tapeH} aria-hidden="true" />
      <div className={styles.tapeV} aria-hidden="true" />
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}

/** Three ground boxes beneath the stall. */
export default function Boxes({ boxes = [], className = '' }) {
  const defaults = [
    { width: 84, height: 68, rotation: -4, label: 'VIBE MART' },
    { width: 76, height: 88, rotation: 2, label: null },
    { width: 80, height: 70, rotation: -2, label: null },
  ];
  const items = boxes.length ? boxes : defaults;

  return (
    <div className={`${styles.boxes} ${className}`} aria-hidden="true">
      {items.map((b, i) => (
        <Box key={i} {...b} />
      ))}
    </div>
  );
}
