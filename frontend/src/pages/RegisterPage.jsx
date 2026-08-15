import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import signUpArt from '../assets/NEW SIGN UP A.png'
import './RegisterPage.css'

const INITIAL = {
  username: '',
  email: '',
  password: '',
  password_confirm: '',
  terms: false,
}

function classifyRegisterError(message) {
  const text = String(message || '').toLowerCase()

  if (text.includes('already registered') || text.includes('already in use')) {
    return {
      fields: ['username', 'email'],
      message: message || 'That username or email is already registered.',
      anchor: 'username',
    }
  }
  if (text.includes('password') && text.includes('match')) {
    return { fields: ['password', 'password_confirm'], message, anchor: 'password_confirm' }
  }
  if (text.includes('password')) {
    return { fields: ['password'], message, anchor: 'password' }
  }
  if (text.includes('email') && !text.includes('username')) {
    return { fields: ['email'], message, anchor: 'email' }
  }
  if (text.includes('username')) {
    return { fields: ['username'], message, anchor: 'username' }
  }
  if (text.includes('terms')) {
    return { fields: ['terms'], message, anchor: 'terms' }
  }
  return { fields: ['username'], message: message || 'Registration failed.', anchor: 'username' }
}

export default function RegisterPage() {
  const { register, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL)
  const [fieldErrors, setFieldErrors] = useState({})
  const [errorAnchor, setErrorAnchor] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/my-account?tab=profile', { replace: true })
    }
  }, [isAuthenticated, loading, navigate])

  const clearErrors = () => {
    setFieldErrors({})
    setErrorAnchor('')
    setErrorMessage('')
  }

  const applyError = ({ fields, message, anchor }) => {
    const next = {}
    fields.forEach((name) => {
      next[name] = true
    })
    setFieldErrors(next)
    setErrorAnchor(anchor)
    setErrorMessage(message)
  }

  const onChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (fieldErrors[name] || errorMessage) {
      clearErrors()
    }
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    clearErrors()

    if (!form.terms) {
      applyError({
        fields: ['terms'],
        message: 'Please agree to the Terms & Conditions.',
        anchor: 'terms',
      })
      return
    }
    if (form.password.length < 8) {
      applyError({
        fields: ['password'],
        message: 'Password must be at least 8 characters.',
        anchor: 'password',
      })
      return
    }
    if (form.password !== form.password_confirm) {
      applyError({
        fields: ['password', 'password_confirm'],
        message: 'Passwords do not match.',
        anchor: 'password_confirm',
      })
      return
    }

    const username = form.username.trim()
    const email = form.email.trim()

    if (!username) {
      applyError({ fields: ['username'], message: 'Username is required.', anchor: 'username' })
      return
    }
    if (!email) {
      applyError({ fields: ['email'], message: 'Email is required.', anchor: 'email' })
      return
    }

    setBusy(true)
    try {
      const result = await register({
        username,
        email,
        password: form.password,
        display_name: username,
        business_name: username,
        phone: '',
        location: '',
      })
      if (result?.pending_confirmation) {
        sessionStorage.setItem('vm_pending_login', result.login || username)
        sessionStorage.setItem('vm_pending_email', result.email || email)
        if (result.confirm_url) {
          sessionStorage.setItem('vm_pending_confirm_url', result.confirm_url)
        }
        if (result.dev_notice) {
          sessionStorage.setItem('vm_pending_confirm_notice', result.dev_notice)
        }
        navigate('/confirm-email', { replace: true })
        return
      }
      navigate('/my-account?tab=profile', { replace: true })
    } catch (err) {
      applyError(classifyRegisterError(err.message || 'Registration failed.'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <section className="vm-register vm-register--status">
        <p>Checking your session…</p>
      </section>
    )
  }

  return (
    <section className="vm-register" aria-label="Sign up">
      <form className="vm-register__stage" onSubmit={onSubmit} noValidate>
        <img className="vm-register__art" src={signUpArt} alt="" draggable={false} />

        <div className="vm-register__fields">
          <h1 className="vm-register__sr">Sign up</h1>

          <input
            className={`vm-register__input vm-register__input--username${fieldErrors.username ? ' is-error' : ''}`}
            name="username"
            value={form.username}
            onChange={onChange}
            required
            autoComplete="username"
            autoFocus
            aria-label="Username"
            aria-invalid={Boolean(fieldErrors.username)}
            placeholder="Username"
          />
          <input
            className={`vm-register__input vm-register__input--email${fieldErrors.email ? ' is-error' : ''}`}
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            required
            autoComplete="email"
            aria-label="Email address"
            aria-invalid={Boolean(fieldErrors.email)}
            placeholder="Email"
          />
          <div
            className={`vm-register__pass-wrap vm-register__input--password${fieldErrors.password ? ' is-error' : ''}`}
          >
            <input
              className="vm-register__input"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={onChange}
              required
              minLength={8}
              autoComplete="new-password"
              aria-label="Password"
              aria-invalid={Boolean(fieldErrors.password)}
              placeholder="Password"
            />
            <button
              type="button"
              className="vm-register__pass-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    d="M3 3l18 18M10.6 10.6a2.5 2.5 0 0 0 3.5 3.5M9.5 5.5A10 10 0 0 1 12 5c6 0 10 7 10 7a16 16 0 0 1-3.2 3.8M6.1 6.1C3.8 7.9 2 12 2 12s4 7 10 7c1.4 0 2.7-.3 3.9-.8"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
                  />
                  <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="2.2" />
                </svg>
              )}
            </button>
          </div>
          <div
            className={`vm-register__pass-wrap vm-register__input--password-confirm${fieldErrors.password_confirm ? ' is-error' : ''}`}
          >
            <input
              className="vm-register__input"
              type={showPasswordConfirm ? 'text' : 'password'}
              name="password_confirm"
              value={form.password_confirm}
              onChange={onChange}
              required
              minLength={8}
              autoComplete="new-password"
              aria-label="Confirm password"
              aria-invalid={Boolean(fieldErrors.password_confirm)}
              placeholder="Confirm password"
            />
            <button
              type="button"
              className="vm-register__pass-toggle"
              onClick={() => setShowPasswordConfirm((prev) => !prev)}
              aria-label={showPasswordConfirm ? 'Hide password' : 'Show password'}
              aria-pressed={showPasswordConfirm}
            >
              {showPasswordConfirm ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    d="M3 3l18 18M10.6 10.6a2.5 2.5 0 0 0 3.5 3.5M9.5 5.5A10 10 0 0 1 12 5c6 0 10 7 10 7a16 16 0 0 1-3.2 3.8M6.1 6.1C3.8 7.9 2 12 2 12s4 7 10 7c1.4 0 2.7-.3 3.9-.8"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
                  />
                  <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="2.2" />
                </svg>
              )}
            </button>
          </div>

          <label
            className={`vm-register__check vm-register__check--terms${fieldErrors.terms ? ' is-error' : ''}`}
          >
            <input
              type="checkbox"
              name="terms"
              checked={form.terms}
              onChange={onChange}
              required
              aria-invalid={Boolean(fieldErrors.terms)}
            />
            <span className="vm-register__sr">I agree to the Terms &amp; Conditions</span>
          </label>

          {errorMessage ? (
            <p
              className={`vm-register__error vm-register__error--${errorAnchor}`}
              role="alert"
            >
              {errorMessage}
            </p>
          ) : null}

          <button
            className="vm-register__submit"
            type="submit"
            disabled={busy}
            aria-label={busy ? 'Creating account' : 'Sign up'}
          />

          <Link className="vm-register__login" to="/login" aria-label="Log in">
            <span className="vm-register__sr">Log in</span>
          </Link>
        </div>
      </form>
    </section>
  )
}
