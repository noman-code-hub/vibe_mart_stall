import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useRoleMode } from '../context/RoleModeContext.jsx'
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx'
import { resendConfirmation } from '../services/authApi.js'
import './ForgotPasswordPage.css'

const PROFILE_PATH = '/my-account?tab=profile'
const DASHBOARD_PATH = '/my-account?tab=create'
const MARKET_PATH = '/market'
/** Prevents Strict Mode double-mount from confirming the same link twice. */
const confirmingKeys = new Set()

export default function ConfirmEmailPage() {
  const { confirmEmail, isAuthenticated, loading, user } = useAuth()
  const { mode, setMode } = useRoleMode()
  const config = useRuntimeConfig()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const login = searchParams.get('login') || searchParams.get('email') || ''

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [resendBusy, setResendBusy] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const confirmEmailRef = useRef(confirmEmail)
  confirmEmailRef.current = confirmEmail

  // Pending signup state from register navigate
  const pendingLogin = sessionStorage.getItem('vm_pending_login') || login
  const pendingEmail = sessionStorage.getItem('vm_pending_email') || ''

  // Local dev has no mail server, so the throwaway API there hands the link back
  // directly. Compiled out of production builds — live, the emailed link is the
  // only way in, which is what proves the address belongs to the signup.
  const devConfirmUrl = import.meta.env.DEV
    ? sessionStorage.getItem('vm_pending_confirm_url') || ''
    : ''

  // Signups start as buyers on Market; sellers open Dashboard via the Seller switch.
  const nextAfterAuth =
    mode === 'seller'
      ? user?.profile_complete
        ? DASHBOARD_PATH
        : PROFILE_PATH
      : MARKET_PATH

  // After email confirm (logged in), send buyers to Market.
  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (mode !== 'seller') setMode('buyer')
      navigate(nextAfterAuth, { replace: true })
    }
  }, [isAuthenticated, loading, mode, navigate, nextAfterAuth, setMode])

  // Auto-confirm when the email link lands with token + login.
  useEffect(() => {
    if (!token || !login || loading || isAuthenticated) return undefined

    const key = `${login}::${token}`
    if (confirmingKeys.has(key)) return undefined
    confirmingKeys.add(key)

    let cancelled = false
    ;(async () => {
      setBusy(true)
      setError('')
      try {
        await confirmEmailRef.current({ login, token })
        sessionStorage.removeItem('vm_pending_login')
        sessionStorage.removeItem('vm_pending_email')
        sessionStorage.removeItem('vm_pending_confirm_url')
        sessionStorage.removeItem('vm_pending_confirm_notice')
        if (!cancelled) navigate(PROFILE_PATH, { replace: true })
      } catch (err) {
        confirmingKeys.delete(key)
        if (!cancelled) setError(err.message || 'Could not confirm email.')
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token, login, loading, isAuthenticated, navigate])

  const onResend = async () => {
    if (!pendingLogin) return
    setResendBusy(true)
    setResendMessage('')
    setError('')
    try {
      const result = await resendConfirmation(config, pendingLogin)
      setResendMessage(result?.message || 'A new confirmation link is on its way.')
    } catch (err) {
      setError(err.message || 'Could not send a new confirmation link.')
    } finally {
      setResendBusy(false)
    }
  }

  return (
    <section className="vm-reset" aria-label="Confirm email">
      <div className="vm-reset__card">
        <p className="vm-reset__kicker">- Almost there -</p>
        <h1 className="vm-reset__title">Confirm your email</h1>
        <p className="vm-reset__copy">
          {pendingEmail
            ? `We sent a confirmation link for ${pendingEmail}. Open it to finish joining Vibe Mart.`
            : 'Open the confirmation link from your email to finish joining Vibe Mart.'}
        </p>

        {error ? (
          <p className="vm-reset__alert vm-reset__alert--error" role="alert">
            {error}
          </p>
        ) : null}

        {busy ? (
          <p className="vm-reset__alert vm-reset__alert--ok" role="status">
            Confirming your email…
          </p>
        ) : null}

        {resendMessage ? (
          <p className="vm-reset__alert vm-reset__alert--ok" role="status">
            {resendMessage}
          </p>
        ) : null}

        {devConfirmUrl ? (
          <p className="vm-reset__alert vm-reset__alert--dev">
            Local development only.{' '}
            <a href={devConfirmUrl}>Open confirmation link</a>
          </p>
        ) : null}

        {!token && pendingLogin ? (
          <button
            type="button"
            className="vm-reset__submit"
            onClick={onResend}
            disabled={busy || resendBusy}
          >
            {resendBusy ? 'Sending…' : 'Resend confirmation email'}
          </button>
        ) : null}

        <Link className="vm-reset__back" to="/login">
          Back to log in
          {pendingLogin ? ` (${pendingLogin})` : ''}
        </Link>
      </div>
    </section>
  )
}
