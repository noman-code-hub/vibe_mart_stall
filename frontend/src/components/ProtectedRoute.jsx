import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { currentAppPath, rememberAuthReturnTo } from '../services/buyerAuth.js'

/**
 * Guards account and trolley — unauthenticated users go to Login.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <section className="vm-page">
        <p className="vm-muted">Checking your account…</p>
      </section>
    )
  }

  if (!isAuthenticated) {
    const from = currentAppPath(location)
    const buying = from.startsWith('/my-trolley')
    rememberAuthReturnTo(from)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from, reason: buying ? 'buy' : undefined }}
      />
    )
  }

  return children
}
