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

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/my-account', { replace: true })
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
      await register({
        username,
        email,
        password: form.password,
        display_name: username,
        business_name: username,
        phone: '',
        location: '',
      })
      navigate('/my-account', { replace: true })
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
          <input
            className={`vm-register__input vm-register__input--password${fieldErrors.password ? ' is-error' : ''}`}
            type="password"
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
          <input
            className={`vm-register__input vm-register__input--password-confirm${fieldErrors.password_confirm ? ' is-error' : ''}`}
            type="password"
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
