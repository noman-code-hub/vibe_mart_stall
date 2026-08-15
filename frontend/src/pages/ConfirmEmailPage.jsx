import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import './ForgotPasswordPage.css'

export default function ConfirmEmailPage() {
  const { confirmEmail, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const login = searchParams.get('login') || searchParams.get('email') || ''

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [autoTried, setAutoTried] = useState(false)

  // Pending signup state from register navigate
  const pendingLogin = sessionStorage.getItem('vm_pending_login') || login
  const pendingEmail = sessionStorage.getItem('vm_pending_email') || ''
  const pendingConfirmUrl = sessionStorage.getItem('vm_pending_confirm_url') || ''
  const pendingNotice = sessionStorage.getItem('vm_pending_confirm_notice') || ''

  useEffect(() => {
    if (!loading && isAuthenticated && !token) {
      navigate('/my-account?tab=profile', { replace: true })
    }
  }, [isAuthenticated, loading, navigate, token])

  useEffect(() => {
    if (!token || !login || autoTried || loading) return undefined
    let cancelled = false
    ;(async () => {
      setAutoTried(true)
      setBusy(true)
      setError('')
      try {
        await confirmEmail({ login, token })
        sessionStorage.removeItem('vm_pending_login')
        sessionStorage.removeItem('vm_pending_email')
        sessionStorage.removeItem('vm_pending_confirm_url')
        sessionStorage.removeItem('vm_pending_confirm_notice')
        if (!cancelled) navigate('/my-account?tab=profile', { replace: true })
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not confirm email.')
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, login, autoTried, loading, confirmEmail, navigate])

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
