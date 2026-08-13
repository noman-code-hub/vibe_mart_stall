import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import loginArt from '../assets/LOG IN CLEAN.png'
import './LoginPage.css'

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({
    username: '',
    password: '',
    remember: true,
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const redirectTo =
    location.state?.from ||
    (searchParams.get('redirect_to') ? decodeURIComponent(searchParams.get('redirect_to')) : null) ||
    '/my-account'

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(redirectTo, { replace: true })
    }
  }, [isAuthenticated, loading, navigate, redirectTo])

  const onChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(form.username.trim(), form.password, form.remember)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <section className="vm-login vm-login--status">
        <p>Checking your session…</p>
      </section>
    )
  }

  return (
    <section className="vm-login" aria-label="Log in">
      <form className="vm-login__stage" onSubmit={onSubmit} noValidate>
        <img className="vm-login__art" src={loginArt} alt="" draggable={false} />

        <div className="vm-login__fields">
          <h1 className="vm-login__sr">Log in</h1>

          <input
            className="vm-login__input vm-login__input--user"
            name="username"
            value={form.username}
            onChange={onChange}
            required
            autoComplete="username"
            autoFocus
            aria-label="Username or email"
            placeholder="Username or email"
          />

          <div className="vm-login__pass-wrap vm-login__input--pass">
            <input
              className="vm-login__input"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={onChange}
              required
              autoComplete="current-password"
              aria-label="Password"
              placeholder="Password"
            />
            <button
              type="button"
              className="vm-login__pass-toggle"
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

          <label className="vm-login__remember">
            <input type="checkbox" name="remember" checked={form.remember} onChange={onChange} />
            <span className="vm-login__sr">Remember me</span>
          </label>

          <Link className="vm-login__forgot" to="/forgot-password" aria-label="Forgot password">
            <span className="vm-login__sr">Forgot password?</span>
          </Link>

          {error && (
            <p className="vm-login__error" role="alert">
              {error}
            </p>
          )}

          <button
            className="vm-login__submit"
            type="submit"
            disabled={busy}
            aria-label={busy ? 'Signing in' : 'Log in'}
          />

          <Link className="vm-login__signup" to="/register" aria-label="Sign up">
            <span className="vm-login__sr">Sign up</span>
          </Link>
        </div>
      </form>
    </section>
  )
}
