import vibesArt from '../assets/OUR VIBES POP ART EXTRA.png'
import './OurVibesPage.css'

export default function OurVibesPage() {
  return (
    <section className="vm-vibes" aria-label="Our Vibes">
      <img
        className="vm-vibes__image"
        src={vibesArt}
        alt="Our Vibes pop art"
        draggable={false}
      />
    </section>
  )
}
