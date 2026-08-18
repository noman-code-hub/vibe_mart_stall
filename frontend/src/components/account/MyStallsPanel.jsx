import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import StallLoadingScreen from '../StallLoadingScreen.jsx'
import DashboardTraderMenu from './DashboardTraderMenu.jsx'
import { getStall } from '../../services/stallApi.js'
import { stallToMarketStallProps } from '../../services/stallDisplay.js'
import { useRuntimeConfig } from '../../context/RuntimeConfigContext.jsx'
import { formatDisplayDate } from '../../utils/dateFormat.js'
import sendToMarketBtn from '../../assets/send-to-market-btn.png'
import './FolderViews.css'

const MarketStall = lazy(() => import('../MarketStall'))

function FolderStallCard({ summary, detail, loadingDetail, onStartEdit, onDelete }) {
  const props = detail ? stallToMarketStallProps(detail) : null
  const updatedLabel = summary.updated_at ? formatDisplayDate(summary.updated_at) : ''

  return (
    <article className="vm-folder__stall">
      <div className="vm-folder__stall-head">
        <div>
          <h3 className="vm-folder__stall-title">{summary.brand_name || 'Untitled stall'}</h3>
          <p className="vm-muted vm-folder__stall-meta">
            {summary.product_count || 0} product{(summary.product_count || 0) === 1 ? '' : 's'}
            {updatedLabel ? ` · Updated ${updatedLabel}` : ''}
          </p>
        </div>
        <span className={`vm-status vm-status--${summary.status}`}>
          {summary.status === 'published' ? 'Published' : 'Draft'}
        </span>
      </div>

      <div className="vm-folder__preview">
        {loadingDetail && <StallLoadingScreen />}
        {!loadingDetail && props && (
          <Suspense fallback={<StallLoadingScreen />}>
            <MarketStall {...props} className="vm-market-stall vm-folder__cart" />
          </Suspense>
        )}
        {!loadingDetail && !props && (
          <p className="vm-muted">Could not load stall preview.</p>
        )}
      </div>

      <div className="vm-folder__stall-actions">
        {summary.status === 'published' && (
          <Link className="vm-btn vm-btn--ghost" to={`/market?stall=${summary.id}`}>
            View on Market
          </Link>
        )}
        <button type="button" className="vm-btn vm-btn--ghost" onClick={() => onStartEdit(summary)}>
          Edit
        </button>
        <button type="button" className="vm-btn vm-btn--danger" onClick={() => onDelete(summary.id)}>
          Delete
        </button>
      </div>
    </article>
  )
}

/**
 * Folder tab — empty folder graphic, or stall stack + send to market.
 */
export default function MyStallsPanel({
  stalls,
  loading,
  onStartEdit,
  onDelete,
  onPublishDrafts,
  busy = false,
  publishBusy = false,
  showBackToFolders = false,
}) {
  const config = useRuntimeConfig()
  const [, setSearchParams] = useSearchParams()
  const [detailsById, setDetailsById] = useState({})
  const [detailLoading, setDetailLoading] = useState({})

  const draftCount = useMemo(
    () => stalls.filter((stall) => stall.status !== 'published').length,
    [stalls]
  )

  useEffect(() => {
    let cancelled = false
    const missing = stalls.filter((stall) => stall?.id && !detailsById[stall.id])
    if (!missing.length) return undefined

    missing.forEach((stall) => {
      setDetailLoading((prev) => ({ ...prev, [stall.id]: true }))
      getStall(config, stall.id)
        .then((full) => {
          if (cancelled) return
          setDetailsById((prev) => ({ ...prev, [stall.id]: full }))
        })
        .catch(() => {
          if (cancelled) return
          setDetailsById((prev) => ({ ...prev, [stall.id]: null }))
        })
        .finally(() => {
          if (cancelled) return
          setDetailLoading((prev) => ({ ...prev, [stall.id]: false }))
        })
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, stalls.map((s) => s.id).join(',')])

  return (
    <div className="vm-folder">
      <DashboardTraderMenu variant="folder" />

      {showBackToFolders ? (
        <div className="vm-folder-view__bar">
          <button
            type="button"
            className="vm-folder-view__back"
            onClick={() => setSearchParams({ tab: 'folder' })}
          >
            ← All folders
          </button>
          <h2 className="vm-folder-view__title">Stalls</h2>
        </div>
      ) : null}

      {loading && <p className="vm-folder__loading vm-muted">Loading…</p>}

      {!loading && stalls.length === 0 && (
        <div className="vm-folder__empty" role="status">
          <svg
            className="vm-folder__empty-icon"
            viewBox="0 0 96 80"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M8 22h28l8 8h44a6 6 0 0 1 6 6v34a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6V28a6 6 0 0 1 6-6z"
              fill="#ffe600"
              stroke="#1a1008"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d="M2 34h92v36a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6V34z"
              fill="#fff"
              stroke="#1a1008"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          </svg>
          <p className="vm-folder__empty-label">Empty folder</p>
        </div>
      )}

      {!loading && stalls.length > 0 && (
        <div className="vm-folder__stack">
          {stalls.map((stall) => (
            <FolderStallCard
              key={stall.id}
              summary={stall}
              detail={detailsById[stall.id]}
              loadingDetail={Boolean(detailLoading[stall.id]) && !detailsById[stall.id]}
              onStartEdit={onStartEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {!loading && stalls.length > 0 && (
        <div className="vm-folder__cta">
          <button
            type="button"
            className={`vm-folder__send${draftCount === 0 ? ' is-disabled' : ''}${publishBusy ? ' is-busy' : ''}`}
            onClick={onPublishDrafts}
            disabled={publishBusy || draftCount === 0 || busy}
            aria-label={
              publishBusy
                ? 'Sending stalls to the Market'
                : draftCount > 0
                  ? `Send my stall to the Market (${draftCount} draft${draftCount === 1 ? '' : 's'})`
                  : 'All stalls already on the Market'
            }
          >
            <img
              className="vm-folder__send-img"
              src={sendToMarketBtn}
              alt=""
              draggable={false}
            />
            {publishBusy ? <span className="vm-folder__send-status">Sending…</span> : null}
          </button>
          {draftCount === 0 && (
            <p className="vm-muted vm-folder__cta-hint">
              Every stall in this Folder is published.{' '}
              <Link to="/market">Open Market →</Link>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
