import styles from './StallInfoPanel.module.css';

/** About panel only — heading comes from stall artwork */
export default function StallInfoPanel({ seller = {}, style }) {
  const { name, about } = seller;
  if (!name && !about) return null;

  return (
    <aside className={styles.panel} style={style} aria-label="Vendor information">
      {name && <p className={styles.greeting}>Hi, I&apos;m {name}!</p>}
      {about && <p className={styles.about}>{about}</p>}
    </aside>
  );
}
