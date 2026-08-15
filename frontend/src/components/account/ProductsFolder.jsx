import { Link, useSearchParams } from 'react-router-dom'
import DashboardTraderMenu from './DashboardTraderMenu.jsx'
import './FolderViews.css'

export default function ProductsFolder({ items = [], loading = false }) {
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
        <h2 className="vm-folder-view__title">Products</h2>
      </div>

      {loading ? <p className="vm-muted">Loading products…</p> : null}

      {!loading && items.length === 0 ? (
        <div className="vm-folder-view__empty" role="status">
          <p>No products yet — create one on Dashboard.</p>
          <Link className="vm-btn vm-btn--primary" to="/my-account?tab=create">
            Open Dashboard
          </Link>
        </div>
      ) : null}

      {!loading && items.length > 0 ? (
        <div className="vm-folder-view__grid">
          {items.map((item) => (
            <article key={`${item.stallId}-${item.productId || item.name}`} className="vm-folder-view__card">
              <div className="vm-folder-view__thumb">
                {item.image ? (
                  <img src={item.image} alt="" draggable={false} />
                ) : (
                  <span className="vm-folder-view__thumb-fallback">No image</span>
                )}
              </div>
              <h3 className="vm-folder-view__name">{item.name || 'Untitled product'}</h3>
              <p className="vm-muted vm-folder-view__meta">
                From {item.stallName || 'stall'}
                {item.price ? ` · ${item.price}` : ''}
              </p>
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
