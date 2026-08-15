import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import './ForgotPasswordPage.css'

const PROFILE_PATH = '/my-account?tab=profile'
const DASHBOARD_PATH = '/my-account?tab=create'
/** Prevents Strict Mode double-mount from confirming the same link twice. */
const confirmingKeys = new Set()

export default function ConfirmEmailPage() {
  const { confirmEmail, isAuthenticated, loading, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const login = searchParams.get('login') || searchParams.get('email') || ''

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const confirmEmailRef = useRef(confirmEmail)
  confirmEmailRef.current = confirmEmail

  // Pending signup state from register navigate
  const pendingLogin = sessionStorage.getItem('vm_pending_login') || login
  const pendingEmail = sessionStorage.getItem('vm_pending_email') || ''
  const pendingConfirmUrl = sessionStorage.getItem('vm_pending_confirm_url') || ''
  const pendingNotice = sessionStorage.getItem('vm_pending_confirm_notice') || ''

  const nextAfterAuth = user?.profile_complete ? DASHBOARD_PATH : PROFILE_PATH

  // After email confirm (logged in), open My Account profile until it is filled.
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(nextAfterAuth, { replace: true })
    }
  }, [isAuthenticated, loading, navigate, nextAfterAuth])

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

  const onConfirmClick = async () => {
    if (!pendingConfirmUrl) return
    window.location.href = pendingConfirmUrl
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

        {pendingNotice || pendingConfirmUrl ? (
          <p className="vm-reset__alert vm-reset__alert--dev">
            {pendingNotice || 'Test host has no email. Use this confirmation link now.'}
            {pendingConfirmUrl ? (
              <>
                {' '}
                <a href={pendingConfirmUrl}>Open confirmation link</a>
              </>
            ) : null}
          </p>
        ) : null}

        {pendingConfirmUrl ? (
          <button
            type="button"
            className="vm-reset__submit"
            onClick={onConfirmClick}
            disabled={busy}
          >
            Confirm email
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
