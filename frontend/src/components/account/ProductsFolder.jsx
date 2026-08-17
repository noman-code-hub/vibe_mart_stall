import { Link, useSearchParams } from 'react-router-dom'
import DashboardTraderMenu from './DashboardTraderMenu.jsx'
import './FolderViews.css'

export default function ProductsFolder({ items = [], loading = false }) {
  const [, setSearchParams] = useSearchParams()

  const photos = items.flatMap((item) =>
    (item.images || []).map((src, index) => ({
      key: `${item.stallId}-${item.productId || item.name}-${index}`,
      src,
      name: item.name || 'Product',
    }))
  )

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
        <h2 className="vm-folder-view__title">Products</h2>
      </div>

      {loading ? <p className="vm-muted">Loading products…</p> : null}

      {!loading && photos.length === 0 ? (
        <div className="vm-folder-view__empty" role="status">
          <p>No products yet — add product photos on Dashboard.</p>
          <Link className="vm-btn vm-btn--primary" to="/my-account?tab=create">
            Open Dashboard
          </Link>
        </div>
      ) : null}

      {!loading && photos.length > 0 ? (
        <div className="vm-selfies__stage">
          {photos.map((photo) => (
            <figure key={photo.key} className="vm-selfies__full">
              <img src={photo.src} alt={photo.name} draggable={false} />
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  )
}
