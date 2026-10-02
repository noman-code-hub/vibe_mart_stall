import loadingLogo from '../assets/loading-logo.webp'
import styles from './StallLoadingScreen.module.css'

/**
 * Loading placeholder while stall / market art boots.
 * Market: Hang Loose graphic centered over the market scene (no white card).
 */
export default function StallLoadingScreen({ variant = 'default' }) {
  if (variant === 'market') {
    return (
      <div
        className="vm-market-onboarding"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Hang Loose! We're opening up the market for you!"
      >
        <img
          className="vm-market-onboarding__logo"
          src={loadingLogo}
          alt="Hang Loose! We're opening up the market for you!"
          width={380}
          height={253}
          decoding="async"
          draggable={false}
        />
      </div>
    )
  }

  return (
    <div className={styles.screen} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.card}>
        <div className={styles.awning} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.title}>Building your stall…</p>
        <p className={styles.hint}>Loading the market cart artwork</p>
      </div>
    </div>
  )
}
