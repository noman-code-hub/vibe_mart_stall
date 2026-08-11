import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <section className="vm-page vm-hero">
      <div className="vm-hero__copy">
        <p className="vm-kicker">Vibe Mart Marketplace</p>
        <h1>Build your stall. Meet your market.</h1>
        <p>
          Create a personal market stall, remove photo backgrounds, and publish to the Vibe Mart
          floor — all from one custom marketplace.
        </p>
        <div className="vm-hero__actions">
          <Link className="vm-btn vm-btn--primary" to="/sell-smart">
            Sell Smart
          </Link>
          <Link className="vm-btn vm-btn--ghost" to="/market">
            Browse the Market
          </Link>
        </div>
      </div>
    </section>
  )
}
