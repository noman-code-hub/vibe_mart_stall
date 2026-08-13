import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx'
import { resetPassword } from '../services/authApi.js'
import './ForgotPasswordPage.css'

export default function ResetPasswordPage() {
  const config = useRuntimeConfig()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const login = searchParams.get('login') || ''

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const linkValid = useMemo(() => Boolean(token && login), [token, login])

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!linkValid) {
      setError('This reset link is invalid.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== passwordConfirm) {
      setError('Passwords do not match.')
      return
    }

    setBusy(true)
    try {
      const result = await resetPassword(config, { login, token, password })
      setMessage(result?.message || 'Password updated. You can log in now.')
      window.setTimeout(() => navigate('/login', { replace: true }), 1200)
    } catch (err) {
      setError(err.message || 'Could not reset password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="vm-reset" aria-label="Set new password">
      <form className="vm-reset__card" onSubmit={onSubmit} noValidate>
        <p className="vm-reset__kicker">- Forgot password? -</p>
        <h1 className="vm-reset__title">Set a new password</h1>
        <p className="vm-reset__copy">
          {linkValid ? `Choose a new password for ${login}.` : 'This reset link is missing or incomplete.'}
        </p>

        <label className="vm-reset__label" htmlFor="vm-reset-pass">
          New password
        </label>
        <div className="vm-reset__pass-wrap">
          <input
            id="vm-reset-pass"
            className="vm-reset__input"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              if (error) setError('')
            }}
            required
            minLength={8}
            autoComplete="new-password"
            disabled={!linkValid}
            placeholder="At least 8 characters"
          />
          <button
            type="button"
            className="vm-reset__pass-toggle"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        <label className="vm-reset__label" htmlFor="vm-reset-pass-confirm">
          Confirm password
        </label>
        <input
          id="vm-reset-pass-confirm"
          className="vm-reset__input"
          type={showPassword ? 'text' : 'password'}
          name="password_confirm"
          value={passwordConfirm}
          onChange={(event) => {
            setPasswordConfirm(event.target.value)
            if (error) setError('')
          }}
          required
          minLength={8}
          autoComplete="new-password"
          disabled={!linkValid}
          placeholder="Confirm password"
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

        <button className="vm-reset__submit" type="submit" disabled={busy || !linkValid}>
          {busy ? 'Saving…' : 'Update password'}
        </button>

        <Link className="vm-reset__back" to="/login">
          Back to log in
        </Link>
      </form>
    </section>
  )
}
