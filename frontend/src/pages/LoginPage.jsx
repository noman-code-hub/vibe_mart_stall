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

          <input
            className="vm-login__input vm-login__input--pass"
            type="password"
            name="password"
            value={form.password}
            onChange={onChange}
            required
            autoComplete="current-password"
            aria-label="Password"
            placeholder="Password"
          />

          <label className="vm-login__remember">
            <input type="checkbox" name="remember" checked={form.remember} onChange={onChange} />
            <span className="vm-login__sr">Remember me</span>
          </label>

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
