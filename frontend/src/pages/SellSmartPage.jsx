import sellArt from '../assets/SELL.png'
import './SellSmartPage.css'

/**
 * Sell Smart guide — full-page rules artwork (stall builder lives on My Account).
 */
export default function SellSmartPage() {
  return (
    <section className="vm-sell" aria-label="Sell Smart">
      <img
        className="vm-sell__image"
        src={sellArt}
        alt="Sell Smart — what you can and cannot sell on Vibe Mart"
        draggable={false}
      />
    </section>
  )
}
