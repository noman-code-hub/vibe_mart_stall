import styles from './StallInfoPanel.module.css';

export default function StallInfoPanel({ seller = {}, style }) {
  const { name, about, ambition } = seller;
  if (!name && !about && !ambition) return null;

  return (
    <aside className={styles.panel} style={style} aria-label="Vendor information">
      {(name || about) && (
        <section className={styles.section}>
          <h2 className={styles.heading}>Who&apos;s behind this stall?</h2>
          {name && <p className={styles.greeting}>Hi, I&apos;m {name}!</p>}
          {about && <p className={styles.about}>{about}</p>}
        </section>
      )}

      {ambition && (
        <section className={styles.section}>
          <h3 className={styles.ambitionHeading}>My ambition</h3>
          <p className={styles.ambitionText}>{ambition}</p>
        </section>
      )}
    </aside>
  );
}
