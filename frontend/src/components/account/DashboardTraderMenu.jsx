import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useRuntimeConfig } from '../../context/RuntimeConfigContext.jsx'
import { listMyStalls } from '../../services/stallApi.js'
import './DashboardTraderMenu.css'

/** Prefer the earliest stall that has a seller selfie. */
function pickFirstStallSelfie(items) {
  const list = Array.isArray(items) ? [...items] : []
  list.sort((a, b) => {
    const byCreated = String(a.created_at || '').localeCompare(String(b.created_at || ''))
    if (byCreated !== 0) return byCreated
    return Number(a.id || 0) - Number(b.id || 0)
  })
  for (const stall of list) {
    const url = String(stall.seller_photo || stall.selfie_url || '').trim()
    if (url) return url
  }
  return ''
}

/**
 * Trader profile pill — selfie (from first stall) or person logo + name;
 * Profile / Dashboard / Folder + Log out.
 * @param {'dashboard' | 'folder' | 'profile'} [variant]
 */
export default function DashboardTraderMenu({ variant = 'dashboard' }) {
  const { user, logout } = useAuth()
  const config = useRuntimeConfig()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [selfieUrl, setSelfieUrl] = useState('')
  const rootRef = useRef(null)
  const menuId = useId()

  const name =
    user?.display_name?.trim() ||
    user?.business_name?.trim() ||
    user?.username?.trim() ||
    'Trader'

  useEffect(() => {
    if (!user) {
      setSelfieUrl('')
      return undefined
    }

    let cancelled = false

    const loadSelfie = async () => {
      try {
        const data = await listMyStalls(config)
        if (cancelled) return
        setSelfieUrl(pickFirstStallSelfie(data?.items))
      } catch {
        if (!cancelled) setSelfieUrl('')
      }
    }

    loadSelfie()

    const onStallsChanged = (event) => {
      const photo = String(event?.detail?.seller_photo || '').trim()
      // Instant preview if avatar is still empty (e.g. first stall just saved).
      if (photo) {
        setSelfieUrl((prev) => prev || photo)
      }
      loadSelfie()
    }

    window.addEventListener('vm:stalls-changed', onStallsChanged)
    return () => {
      cancelled = true
      window.removeEventListener('vm:stalls-changed', onStallsChanged)
    }
  }, [user, config])

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const goFolder = () => {
    setOpen(false)
    navigate('/my-account?tab=folder')
  }

  const goDashboard = () => {
    setOpen(false)
    navigate('/my-account?tab=create')
  }

  const goProfile = () => {
    setOpen(false)
    navigate('/my-account?tab=profile')
  }

  const onLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div
      className={`vm-dash-trader${variant === 'folder' ? ' vm-dash-trader--folder' : ''}${variant === 'profile' ? ' vm-dash-trader--profile' : ''}`}
      ref={rootRef}
    >
      <button
        type="button"
        className={`vm-dash-trader__trigger${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span
          className={`vm-dash-trader__avatar${selfieUrl ? ' has-selfie' : ''}`}
          aria-hidden="true"
        >
          {selfieUrl ? (
            <img
              className="vm-dash-trader__selfie"
              src={selfieUrl}
              alt=""
              draggable={false}
            />
          ) : (
            <svg
              className="vm-dash-trader__person"
              viewBox="0 0 64 64"
              focusable="false"
            >
              <circle cx="32" cy="22" r="12" fill="currentColor" />
              <path
                d="M10 56c0-12.15 9.85-22 22-22s22 9.85 22 22"
                fill="currentColor"
              />
            </svg>
          )}
        </span>
        <span className="vm-dash-trader__name">{name}</span>
        <span className="vm-dash-trader__caret" aria-hidden="true" />
      </button>

      {open && (
        <div className="vm-dash-trader__menu" id={menuId} role="menu">
          {variant !== 'profile' ? (
            <button type="button" role="menuitem" className="vm-dash-trader__item" onClick={goProfile}>
              Profile
            </button>
          ) : null}
          {variant !== 'dashboard' ? (
            <button
              type="button"
              role="menuitem"
              className="vm-dash-trader__item"
              onClick={goDashboard}
            >
              Dashboard
            </button>
          ) : null}
          {variant !== 'folder' ? (
            <button type="button" role="menuitem" className="vm-dash-trader__item" onClick={goFolder}>
              Folder
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="vm-dash-trader__item vm-dash-trader__item--danger"
            onClick={onLogout}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
