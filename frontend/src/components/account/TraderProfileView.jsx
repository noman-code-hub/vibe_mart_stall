import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import DashboardTraderMenu from './DashboardTraderMenu.jsx'
import { formatDisplayDate } from '../../utils/dateFormat.js'
import './TraderProfileView.css'

function Row({ label, value }) {
  const text = String(value || '').trim()
  return (
    <div className="vm-trader-profile__row">
      <dt className="vm-trader-profile__label">{label}</dt>
      <dd className="vm-trader-profile__value">{text || '—'}</dd>
    </div>
  )
}

/**
 * Read-only professional profile — data saved from the My Account form.
 */
export default function TraderProfileView() {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ')

  return (
    <section className="vm-trader-profile" aria-label="Trader profile">
      <DashboardTraderMenu variant="profile" />

      <header className="vm-trader-profile__head">
        <p className="vm-trader-profile__kicker">Your vibe · Your stall</p>
        <h1 className="vm-trader-profile__title">My Profile</h1>
        <p className="vm-trader-profile__lead">
          Details you saved on My Account — ready for the market.
        </p>
      </header>

      <div className="vm-trader-profile__grid">
        <section className="vm-trader-profile__panel vm-trader-profile__panel--personal">
          <h2 className="vm-trader-profile__panel-title">Personal details</h2>
          <dl className="vm-trader-profile__list">
            <Row label="Full name" value={fullName} />
            <Row label="Display name" value={user.display_name} />
            <Row label="Username" value={user.username} />
            <Row label="Email" value={user.email} />
            <Row label="Mobile" value={user.phone} />
          </dl>
        </section>

        <section className="vm-trader-profile__panel vm-trader-profile__panel--age">
          <h2 className="vm-trader-profile__panel-title">Age verification</h2>
          <dl className="vm-trader-profile__list">
            <Row label="Date of birth" value={formatDisplayDate(user.date_of_birth)} />
            <Row label="Over 17" value={user.over_17 ? 'Yes' : 'No'} />
          </dl>
        </section>

        <section className="vm-trader-profile__panel vm-trader-profile__panel--location">
          <h2 className="vm-trader-profile__panel-title">Location</h2>
          <dl className="vm-trader-profile__list">
            <Row label="Town / City" value={user.town} />
            <Row label="County" value={user.county} />
            <Row label="Country" value={user.country} />
          </dl>
        </section>

        <section className="vm-trader-profile__panel vm-trader-profile__panel--terms">
          <h2 className="vm-trader-profile__panel-title">Terms accepted</h2>
          <ul className="vm-trader-profile__checks">
            <li className={user.terms_accepted ? 'is-yes' : 'is-no'}>
              <span className="vm-trader-profile__check-mark" aria-hidden="true" />
              Terms &amp; Conditions
            </li>
            <li className={user.selling_rules_accepted ? 'is-yes' : 'is-no'}>
              <span className="vm-trader-profile__check-mark" aria-hidden="true" />
              Marketplace Selling Rules
            </li>
            <li className={user.privacy_accepted ? 'is-yes' : 'is-no'}>
              <span className="vm-trader-profile__check-mark" aria-hidden="true" />
              Privacy Policy
            </li>
          </ul>
        </section>
      </div>

      <div className="vm-trader-profile__actions">
        <button
          type="button"
          className="vm-trader-profile__cta"
          onClick={() => navigate('/my-account?tab=create')}
        >
          Go to Dashboard
        </button>
      </div>
    </section>
  )
}
