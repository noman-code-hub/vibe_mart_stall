import { useState } from 'react'
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx'
import { submitContact } from '../services/contactApi.js'
import contactArt from '../assets/CONTACT FORM.png'
import './ContactPage.css'

const INITIAL = {
  name: '',
  email: '',
  phone: '',
  message: '',
  comments: '',
  website: '',
}

export default function ContactPage() {
  const config = useRuntimeConfig()
  const [form, setForm] = useState(INITIAL)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
    if (success) setSuccess('')
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')

    try {
      const result = await submitContact(config, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        message: form.message.trim(),
        comments: form.comments.trim(),
        website: form.website.trim(),
      })
      setSuccess(result?.message || 'Thanks — your message was sent.')
      setForm(INITIAL)
    } catch (err) {
      setError(err.message || 'Could not send your message.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="vm-contact" aria-label="Contact">
      <form className="vm-contact__stage" onSubmit={onSubmit} noValidate>
        <img className="vm-contact__art" src={contactArt} alt="" draggable={false} />

        <div className="vm-contact__fields">
          <h1 className="vm-contact__sr">Contact us</h1>

          {/* Honeypot — hidden from people, catches bots */}
          <input
            className="vm-contact__honeypot"
            type="text"
            name="website"
            value={form.website}
            onChange={onChange}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          <input
            className="vm-contact__input vm-contact__input--name"
            name="name"
            value={form.name}
            onChange={onChange}
            required
            autoComplete="name"
            autoFocus
            aria-label="Name"
            maxLength={120}
            disabled={busy}
          />

          <input
            className="vm-contact__input vm-contact__input--email"
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            required
            autoComplete="email"
            aria-label="Email"
            maxLength={160}
            disabled={busy}
          />

          <input
            className="vm-contact__input vm-contact__input--phone"
            type="tel"
            name="phone"
            value={form.phone}
            onChange={onChange}
            autoComplete="tel"
            aria-label="Phone"
            maxLength={40}
            disabled={busy}
          />

          <textarea
            className="vm-contact__input vm-contact__input--message"
            name="message"
            value={form.message}
            onChange={onChange}
            aria-label="Message"
            maxLength={2000}
            disabled={busy}
          />

          <textarea
            className="vm-contact__input vm-contact__input--comments"
            name="comments"
            value={form.comments}
            onChange={onChange}
            aria-label="Comments"
            maxLength={2000}
            disabled={busy}
          />

          <button
            className="vm-contact__submit"
            type="submit"
            disabled={busy}
            aria-label={busy ? 'Sending message' : 'Send message'}
          >
            <span className="vm-contact__sr">{busy ? 'Sending…' : 'Send'}</span>
          </button>

          {error && (
            <p className="vm-contact__error" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="vm-contact__success" role="status">
              {success}
            </p>
          )}
        </div>
      </form>
    </section>
  )
}
