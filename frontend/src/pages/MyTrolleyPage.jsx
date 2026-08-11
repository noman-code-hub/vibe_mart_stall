import { Link } from 'react-router-dom'
import { useTrolley } from '../context/TrolleyContext.jsx'
import { formatStallPrice } from '../services/stallDisplay.js'
import trolleyBanner from '../assets/TRAN.png'
import './MyTrolleyPage.css'

export default function MyTrolleyPage() {
  const { items, count, removeItem, setQuantity, clear } = useTrolley()

  return (
    <section className="vm-page vm-page--trolley vm-trolley">
      <header className="vm-trolley__banner" aria-label="My Trolley">
        <img
          className="vm-trolley__banner-img"
          src={trolleyBanner}
          alt="My Trolley shopping cart"
          draggable={false}
        />
      </header>

      <div className="vm-trolley__body">
        <header className="vm-trolley__head">
          <div>
            <h1>My Trolley</h1>
            <p className="vm-lead">
              {count
                ? `${count} item${count === 1 ? '' : 's'} ready from the market.`
                : 'Products you buy from market stalls land here, ready for checkout.'}
            </p>
          </div>
          {items.length ? (
            <button type="button" className="vm-trolley__clear" onClick={clear}>
              Clear trolley
            </button>
          ) : null}
        </header>

        {!items.length ? (
          <div className="vm-trolley__empty">
            <p>Your trolley is empty.</p>
            <Link className="vm-btn vm-btn--primary" to="/market">
              Browse the Market
            </Link>
          </div>
        ) : (
          <>
            <ul className="vm-trolley__list">
              {items.map((item) => (
                <li key={item.key} className="vm-trolley__item">
                  <div className="vm-trolley__media">
                    {item.image ? (
                      <img src={item.image} alt="" draggable={false} />
                    ) : (
                      <span className="vm-trolley__media-fallback">No photo</span>
                    )}
                  </div>

                  <div className="vm-trolley__copy">
                    <h2 className="vm-trolley__name">{item.name}</h2>
                    {item.stallName ? (
                      <p className="vm-trolley__stall">From {item.stallName}</p>
                    ) : null}
                    {item.size ? <p className="vm-trolley__meta">Size {item.size}</p> : null}
                    {item.price ? (
                      <p className="vm-trolley__price">{formatStallPrice(item.price)}</p>
                    ) : null}
                  </div>

                  <div className="vm-trolley__controls">
                    <label className="vm-trolley__qty">
                      <span>Qty</span>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={item.quantity}
                        onChange={(event) => setQuantity(item.key, event.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="vm-trolley__remove"
                      onClick={() => removeItem(item.key)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="vm-trolley__footer">
              <p className="vm-trolley__note">Payment checkout can be connected next.</p>
              <button type="button" className="vm-trolley__checkout" disabled>
                Checkout soon
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
