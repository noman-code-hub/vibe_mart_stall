import StallGeneratorApp from '../StallGeneratorApp.jsx'
import DashboardTraderMenu from './DashboardTraderMenu.jsx'

/**
 * Dashboard tab — stall generator laid over MY DASH artwork.
 */
export default function CreateStallPanel({ limitMessage = '', stallId = null }) {
  if (limitMessage) {
    return (
      <div className="vm-account-stack vm-account-stack--generator vm-account-stack--dash-limit">
        <div className="vm-dash-limit">
          <DashboardTraderMenu />
          <header className="vm-section-head">
            <div>
              <h2 className="vm-section-head__title">Dashboard</h2>
              <p className="vm-error" role="alert">
                {limitMessage}
              </p>
            </div>
          </header>
          <div className="vm-panel">
            <p className="vm-muted">
              Delete an existing stall from Folder before creating another free listing.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="vm-account-stack vm-account-stack--generator">
      <StallGeneratorApp variant="dashboard" stallId={stallId} />
    </div>
  )
}
