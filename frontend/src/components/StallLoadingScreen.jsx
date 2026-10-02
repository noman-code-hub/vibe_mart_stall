import loadingLogo from '../assets/loading-logo.webp'
import styles from './StallLoadingScreen.module.css'

/**
 * Loading placeholder while stall / market art boots.
 * Market uses the same logo + bouncing dots as the site onboarding splash.
 */
export default function StallLoadingScreen({ variant = 'default' }) {
  if (variant === 'market') {
    return (
      <div
        className="vm-market-onboarding"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Loading market"
      >
        <div className="vm-splash__card">
          <img
            className="vm-splash__logo"
            src={loadingLogo}
            alt="Vibe Mart"
            width={380}
            height={253}
            decoding="async"
            draggable={false}
          />
          <div className="vm-splash__dots" aria-hidden="true">
            <span className="vm-splash__dot" />
            <span className="vm-splash__dot" />
            <span className="vm-splash__dot" />
          </div>
        </div>
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
