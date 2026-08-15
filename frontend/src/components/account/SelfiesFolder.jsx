import { Link, useSearchParams } from 'react-router-dom'
import DashboardTraderMenu from './DashboardTraderMenu.jsx'
import './FolderViews.css'

export default function SelfiesFolder({ items = [], loading = false }) {
  const [, setSearchParams] = useSearchParams()

  return (
    <div className="vm-folder-view">
      <DashboardTraderMenu variant="folder" />
      <div className="vm-folder-view__bar">
        <button
          type="button"
          className="vm-folder-view__back"
          onClick={() => setSearchParams({ tab: 'folder' })}
        >
          ← All folders
        </button>
        <h2 className="vm-folder-view__title">Selfies</h2>
      </div>

      {loading ? <p className="vm-muted">Loading selfies…</p> : null}

      {!loading && items.length === 0 ? (
        <div className="vm-folder-view__empty" role="status">
          <p>No selfies yet — add one on Dashboard.</p>
          <Link className="vm-btn vm-btn--primary" to="/my-account?tab=create">
            Open Dashboard
          </Link>
        </div>
      ) : null}

      {!loading && items.length > 0 ? (
        <div className="vm-folder-view__grid">
          {items.map((item) => (
            <article key={item.stallId} className="vm-folder-view__card">
              <div className="vm-folder-view__thumb vm-folder-view__thumb--round">
                {item.image ? (
                  <img src={item.image} alt="" draggable={false} />
                ) : (
                  <span className="vm-folder-view__thumb-fallback">No selfie</span>
                )}
              </div>
              <h3 className="vm-folder-view__name">{item.stallName || 'Untitled stall'}</h3>
              <p className="vm-muted vm-folder-view__meta">Linked through this stall</p>
              <Link
                className="vm-btn vm-btn--ghost"
                to={`/my-account?tab=create&stallId=${item.stallId}`}
              >
                Edit in Dashboard
              </Link>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  )
}
