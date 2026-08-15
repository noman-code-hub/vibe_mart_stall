import { useLayoutEffect, useRef, useState } from 'react'
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

/** Shrink font until the value fits inside the field (no clipping). */
function FitField({ as: Tag = 'input', value, className, maxPx = 16, minPx = 10, ...rest }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined

    const fit = () => {
      let size = maxPx
      el.style.fontSize = `${size}px`

      // Measure overflow; step down until text fits width (and height for textarea).
      while (size > minPx) {
        const tooWide = el.scrollWidth > el.clientWidth + 1
        const tooTall = Tag === 'textarea' && el.scrollHeight > el.clientHeight + 1
        if (!tooWide && !tooTall) break
        size -= 0.5
        el.style.fontSize = `${size}px`
      }
    }

    fit()
    const frame = window.requestAnimationFrame(fit)
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null
    observer?.observe(el)

    return () => {
      window.cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [value, maxPx, minPx, Tag])

  return <Tag ref={ref} className={className} value={value} {...rest} />
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
      <form className="vm-contact__form" onSubmit={onSubmit} noValidate>
        <div className="vm-contact__stage">
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

            <FitField
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
              maxPx={16}
              minPx={10}
            />

            <FitField
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
              maxPx={16}
              minPx={9}
            />

            <FitField
              className="vm-contact__input vm-contact__input--phone"
              type="tel"
              name="phone"
              value={form.phone}
              onChange={onChange}
              autoComplete="tel"
              aria-label="Phone"
              maxLength={40}
              disabled={busy}
              maxPx={16}
              minPx={10}
            />

            <FitField
              as="textarea"
              className="vm-contact__input vm-contact__input--message"
              name="message"
              value={form.message}
              onChange={onChange}
              aria-label="Message"
              maxLength={2000}
              disabled={busy}
              maxPx={15}
              minPx={10}
            />

            <FitField
              as="textarea"
              className="vm-contact__input vm-contact__input--comments"
              name="comments"
              value={form.comments}
              onChange={onChange}
              aria-label="Comments"
              maxLength={2000}
              disabled={busy}
              maxPx={15}
              minPx={10}
            />

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
        </div>

        <button className="vm-contact__submit" type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send message'}
        </button>
      </form>
    </section>
  )
}
