import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx'
import MyStallsPanel from '../components/account/MyStallsPanel.jsx'
import CreateStallPanel from '../components/account/CreateStallPanel.jsx'
import { deleteStall, listMyStalls, updateStall } from '../services/stallApi.js'
import { MAX_FREE_STALLS, STALL_LIMIT_MESSAGE } from '../services/stallPayload.js'

const TABS = [
  { id: 'stalls', label: 'My stalls' },
  { id: 'create', label: 'Dashboard' },
]

const DEFAULT_TAB = 'create'

export default function MyAccountPage() {
  const navigate = useNavigate()
  const config = useRuntimeConfig()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialTab = TABS.some((t) => t.id === searchParams.get('tab'))
    ? searchParams.get('tab')
    : DEFAULT_TAB

  const [tab, setTab] = useState(initialTab)
  const [stalls, setStalls] = useState([])
  const [stallsLoading, setStallsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const raw = searchParams.get('tab')
    const nextTab = TABS.some((t) => t.id === raw) ? raw : DEFAULT_TAB
    setTab(nextTab)
    if (raw !== nextTab) {
      const next = new URLSearchParams(searchParams)
      next.set('tab', nextTab)
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const refreshStalls = useCallback(async () => {
    setStallsLoading(true)
    setError('')
    try {
      const data = await listMyStalls(config)
      setStalls(Array.isArray(data?.items) ? data.items : [])
    } catch (err) {
      setError(err.message || 'Could not load stalls.')
      setStalls([])
    } finally {
      setStallsLoading(false)
    }
  }, [config])

  // Load on mount and whenever Folder opens so a newly saved stall appears
  // without needing a full page refresh.
  useEffect(() => {
    refreshStalls()
  }, [refreshStalls, tab])

  // Deep-link: /my-account?tab=create&stallId=12 (or legacy ?edit=12)
  useEffect(() => {
    const editId = Number(searchParams.get('edit') || 0)
    if (!editId) return undefined

    // Legacy edit links now open Dashboard with that stall loaded.
    const next = new URLSearchParams(searchParams)
    next.delete('edit')
    next.set('tab', 'create')
    next.set('stallId', String(editId))
    setSearchParams(next, { replace: true })
    return undefined
  }, [searchParams, setSearchParams])

  const onDelete = async (id) => {
    if (!window.confirm('Delete this stall? This cannot be undone.')) return
    setError('')
    try {
      await deleteStall(config, id)
      setStalls((prev) => prev.filter((stall) => stall.id !== id))
      setMessage('Stall deleted.')
    } catch (err) {
      setError(err.message)
    }
  }

  const onStartEdit = (stall) => {
    if (!stall?.id) return
    setMessage('')
    setError('')
    const next = new URLSearchParams(searchParams)
    next.delete('edit')
    next.set('tab', 'create')
    next.set('stallId', String(stall.id))
    setSearchParams(next, { replace: true })
  }

  const onPublishDrafts = async () => {
    const drafts = stalls.filter((stall) => stall.status !== 'published')
    if (!drafts.length) {
      setMessage('All stalls are already published.')
      return
    }

    setBusy(true)
    setMessage('')
    setError('')
    try {
      for (const stall of drafts) {
        await updateStall(config, stall.id, { status: 'published' })
      }
      await refreshStalls()
      setMessage(
        drafts.length === 1
          ? `Published “${drafts[0].brand_name || 'stall'}” to the Market.`
          : `Published ${drafts.length} stalls to the Market.`
      )
      navigate('/market')
    } catch (err) {
      setError(err.message || 'Could not publish draft stalls.')
      await refreshStalls()
    } finally {
      setBusy(false)
    }
  }

  const isDashboard = tab === 'create'
  const isFolder = tab === 'stalls'
  const dashboardStallId = Number(searchParams.get('stallId') || 0) || null

  return (
    <section
      className={`vm-page vm-account${isDashboard ? ' vm-account--dashboard' : ''}${isFolder ? ' vm-account--folder' : ''}`}
    >
      {!isDashboard && message && (
        <p className="vm-success" role="status">
          {message}
        </p>
      )}
      {!isDashboard && error && (
        <p className="vm-error" role="alert">
          {error}
        </p>
      )}

      <div
        id={`account-panel-${tab}`}
        role="tabpanel"
        aria-label={isDashboard ? 'Dashboard' : isFolder ? 'Folder' : undefined}
        className="vm-account-panel"
      >
        {tab === 'stalls' && (
          <MyStallsPanel
            stalls={stalls}
            loading={stallsLoading}
            onStartEdit={onStartEdit}
            onDelete={onDelete}
            onPublishDrafts={onPublishDrafts}
            busy={busy}
            publishBusy={busy}
          />
        )}

        {tab === 'create' && (
          <CreateStallPanel
            limitMessage={
              !dashboardStallId && stalls.length >= MAX_FREE_STALLS ? STALL_LIMIT_MESSAGE : ''
            }
            stallId={dashboardStallId}
          />
        )}
      </div>
    </section>
  )
}
