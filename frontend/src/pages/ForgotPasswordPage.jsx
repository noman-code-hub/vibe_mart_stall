import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx'
import { requestPasswordReset } from '../services/authApi.js'
import './ForgotPasswordPage.css'

export default function ForgotPasswordPage() {
  const config = useRuntimeConfig()
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [resetUrl, setResetUrl] = useState('')
  const [devNotice, setDevNotice] = useState('')

  const onSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    setResetUrl('')
    setDevNotice('')

    try {
      const result = await requestPasswordReset(config, username.trim())
      setMessage(result?.message || 'If that account exists, we sent reset instructions.')
      if (result?.reset_url) setResetUrl(result.reset_url)
      if (result?.dev_notice) setDevNotice(result.dev_notice)
    } catch (err) {
      setError(err.message || 'Could not start password reset.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="vm-reset" aria-label="Forgot password">
      <form className="vm-reset__card" onSubmit={onSubmit} noValidate>
        <p className="vm-reset__kicker">- Forgot password? -</p>
        <h1 className="vm-reset__title">Reset your password</h1>
        <p className="vm-reset__copy">Enter your username or email and we will send a reset link.</p>

        <label className="vm-reset__label" htmlFor="vm-forgot-user">
          Username or email
        </label>
        <input
          id="vm-forgot-user"
          className="vm-reset__input"
          name="username"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value)
            if (error) setError('')
          }}
          required
          autoComplete="username"
          autoFocus
          placeholder="Username or email"
        />

        {error ? (
          <p className="vm-reset__alert vm-reset__alert--error" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="vm-reset__alert vm-reset__alert--ok" role="status">
            {message}
          </p>
        ) : null}
        {devNotice ? (
          <p className="vm-reset__alert vm-reset__alert--dev">
            {devNotice}
            {resetUrl ? (
              <>
                {' '}
                <a href={resetUrl}>Open reset link</a>
              </>
            ) : null}
          </p>
        ) : null}

        <button className="vm-reset__submit" type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send reset link'}
        </button>

        <Link className="vm-reset__back" to="/login">
          Back to log in
        </Link>
      </form>
    </section>
  )
}
