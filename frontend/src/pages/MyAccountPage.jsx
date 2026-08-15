import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx'
import MyStallsPanel from '../components/account/MyStallsPanel.jsx'
import CreateStallPanel from '../components/account/CreateStallPanel.jsx'
import AccountProfilePanel from '../components/account/AccountProfilePanel.jsx'
import FolderHub from '../components/account/FolderHub.jsx'
import ProductsFolder from '../components/account/ProductsFolder.jsx'
import SelfiesFolder from '../components/account/SelfiesFolder.jsx'
import { deleteStall, getStall, listMyStalls, updateStall } from '../services/stallApi.js'
import { MAX_FREE_STALLS, STALL_LIMIT_MESSAGE } from '../services/stallPayload.js'

const TABS = ['profile', 'create', 'folder']

export default function MyAccountPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const config = useRuntimeConfig()
  const [searchParams, setSearchParams] = useSearchParams()

  const profileComplete = Boolean(user?.profile_complete)
  const rawTab = searchParams.get('tab')
  const folderView = searchParams.get('view') || ''

  const tab = useMemo(() => {
    if (!profileComplete) return 'profile'
    if (TABS.includes(rawTab)) return rawTab
    return 'create'
  }, [profileComplete, rawTab])

  const [stalls, setStalls] = useState([])
  const [stallDetails, setStallDetails] = useState([])
  const [stallsLoading, setStallsLoading] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    const next = new URLSearchParams(searchParams)
    let changed = false

    if (!profileComplete && rawTab !== 'profile') {
      next.set('tab', 'profile')
      next.delete('view')
      next.delete('stallId')
      changed = true
    } else if (profileComplete && (!rawTab || !TABS.includes(rawTab))) {
      next.set('tab', rawTab === 'stalls' ? 'folder' : 'create')
      if (rawTab === 'stalls') next.set('view', 'stalls')
      changed = true
    }

    if (changed) setSearchParams(next, { replace: true })
  }, [user, profileComplete, rawTab, searchParams, setSearchParams])

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

  useEffect(() => {
    if (tab === 'folder' || tab === 'create') {
      refreshStalls()
    }
  }, [refreshStalls, tab])

  useEffect(() => {
    if (tab !== 'folder' || (folderView !== 'products' && folderView !== 'selfies')) {
      return undefined
    }
    let cancelled = false
    ;(async () => {
      setDetailsLoading(true)
      try {
        const details = await Promise.all(
          stalls.map(async (summary) => {
            try {
              return await getStall(config, summary.id)
            } catch {
              return null
            }
          })
        )
        if (!cancelled) setStallDetails(details.filter(Boolean))
      } finally {
        if (!cancelled) setDetailsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tab, folderView, stalls, config])

  useEffect(() => {
    const editId = Number(searchParams.get('edit') || 0)
    if (!editId) return undefined
    const next = new URLSearchParams(searchParams)
    next.delete('edit')
    next.set('tab', 'create')
    next.set('stallId', String(editId))
    setSearchParams(next, { replace: true })
    return undefined
  }, [searchParams, setSearchParams])

  const productItems = useMemo(() => {
    const rows = []
    for (const stall of stallDetails) {
      const products = Array.isArray(stall.products) ? stall.products : []
      for (const product of products) {
        rows.push({
          stallId: stall.id,
          stallName: stall.brand_name || stall.business_name || 'Stall',
          productId: product.id,
          name: product.name || product.title || 'Product',
          price: product.price || '',
          image:
            product.image_url ||
            product.image ||
            product.photo ||
            (Array.isArray(product.images) ? product.images[0] : '') ||
            '',
        })
      }
    }
    return rows
  }, [stallDetails])

  const selfieItems = useMemo(() => {
    return stallDetails
      .map((stall) => ({
        stallId: stall.id,
        stallName: stall.brand_name || stall.business_name || 'Stall',
        image: stall.seller_photo || stall.selfie_url || '',
      }))
      .filter((row) => row.image)
  }, [stallDetails])

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
  const isFolder = tab === 'folder'
  const isProfile = tab === 'profile'
  const dashboardStallId = Number(searchParams.get('stallId') || 0) || null

  return (
    <section
      className={`vm-page vm-account${isDashboard ? ' vm-account--dashboard' : ''}${isFolder ? ' vm-account--folder' : ''}${isProfile ? ' vm-account--profile' : ''}`}
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
        aria-label={
          isProfile
            ? 'Profile'
            : isDashboard
              ? 'Dashboard'
              : isFolder
                ? 'Folder'
                : undefined
        }
        className="vm-account-panel"
      >
        {isProfile && <AccountProfilePanel />}

        {tab === 'folder' && !folderView && <FolderHub />}

        {tab === 'folder' && folderView === 'products' && (
          <ProductsFolder items={productItems} loading={stallsLoading || detailsLoading} />
        )}

        {tab === 'folder' && folderView === 'selfies' && (
          <SelfiesFolder items={selfieItems} loading={stallsLoading || detailsLoading} />
        )}

        {tab === 'folder' && folderView === 'stalls' && (
          <MyStallsPanel
            stalls={stalls}
            loading={stallsLoading}
            onStartEdit={onStartEdit}
            onDelete={onDelete}
            onPublishDrafts={onPublishDrafts}
            busy={busy}
            publishBusy={busy}
            showBackToFolders
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
