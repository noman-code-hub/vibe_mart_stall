import { useState } from 'react'

export default function ContactPage() {
  const [sent, setSent] = useState(false)

  return (
    <section className="vm-page">
      <h1>Contact</h1>
      <p className="vm-lead">Questions about trading, stalls, or the market floor? Send a note.</p>
      <form
        className="vm-panel"
        onSubmit={(event) => {
          event.preventDefault()
          setSent(true)
        }}
      >
        <label className="vm-field">
          Name
          <input className="vm-input" name="name" required />
        </label>
        <label className="vm-field">
          Email
          <input className="vm-input" type="email" name="email" required />
        </label>
        <label className="vm-field">
          Message
          <textarea className="vm-input" name="message" rows={5} required />
        </label>
        <button className="vm-btn vm-btn--primary" type="submit">
          Send message
        </button>
        {sent && <p className="vm-success">Thanks — we will wire this to the plugin inbox next.</p>}
      </form>
    </section>
  )
}
