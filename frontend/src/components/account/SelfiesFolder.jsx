import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import DashboardTraderMenu from './DashboardTraderMenu.jsx'
import './FolderViews.css'

export default function SelfiesFolder({ items = [], loading = false }) {
  const [, setSearchParams] = useSearchParams()
  const { user } = useAuth()

  const traderName =
    user?.display_name?.trim() ||
    user?.username?.trim() ||
    user?.business_name?.trim() ||
    'Trader'

  return (
    <div className="vm-folder-view vm-selfies">
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
          <p>No selfies yet — add a full-length selfie on Dashboard.</p>
          <Link className="vm-btn vm-btn--primary" to="/my-account?tab=create">
            Open Dashboard
          </Link>
        </div>
      ) : null}

      {!loading && items.length > 0 ? (
        <div className="vm-selfies__stage">
          {items.map((item) => (
            <figure key={item.stallId} className="vm-selfies__full">
              <img
                src={item.image}
                alt={`${traderName} full-length selfie`}
                draggable={false}
              />
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  )
}
