import styles from './AmbitionPanel.module.css';

/** Separate ambition box — title/graphic comes from stall artwork */
export default function AmbitionPanel({ ambition, style }) {
  if (!ambition) return null;

  return (
    <aside className={styles.panel} style={style} aria-label="My ambition">
      <p className={styles.text}>{ambition}</p>
    </aside>
  );
}
