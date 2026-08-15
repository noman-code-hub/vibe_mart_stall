import FitBoxText from './FitBoxText.jsx'
import styles from './AmbitionPanel.module.css'

/** Separate ambition box — title/graphic comes from stall artwork */
export default function AmbitionPanel({ ambition, style }) {
  if (!ambition) return null

  return (
    <aside className={styles.panel} style={style} aria-label="My ambition">
      <FitBoxText className={styles.text} maxPx={14} minPx={6}>
        {ambition}
      </FitBoxText>
    </aside>
  )
}
