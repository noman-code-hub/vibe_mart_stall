import FitBoxText from './FitBoxText.jsx'
import styles from './StallInfoPanel.module.css'

/** About panel only — heading comes from stall artwork */
export default function StallInfoPanel({ seller = {}, style }) {
  const { name, about } = seller
  if (!name && !about) return null

  return (
    <aside className={styles.panel} style={style} aria-label="Vendor information">
      {name ? (
        <FitBoxText className={styles.greeting} maxPx={18} minPx={8}>
          {`Hi, I'm ${name}!`}
        </FitBoxText>
      ) : null}
      {about ? (
        <FitBoxText className={styles.about} maxPx={14} minPx={6}>
          {about}
        </FitBoxText>
      ) : null}
    </aside>
  )
}
