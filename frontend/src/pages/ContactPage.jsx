import contactArt from '../assets/CONTACT FORM.png'
import './ContactPage.css'

export default function ContactPage() {
  return (
    <section className="vm-contact" aria-label="Contact">
      <img
        className="vm-contact__image"
        src={contactArt}
        alt="Contact form"
        draggable={false}
      />
    </section>
  )
}
