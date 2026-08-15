import { useNavigate, useSearchParams } from 'react-router-dom'
import DashboardTraderMenu from './DashboardTraderMenu.jsx'
import './FolderHub.css'

const FOLDERS = [
  {
    id: 'products',
    title: 'Products',
    copy: 'All products from your stalls',
  },
  {
    id: 'selfies',
    title: 'Selfies',
    copy: 'Trader photos linked to your stalls',
  },
  {
    id: 'stalls',
    title: 'Stalls',
    copy: 'Finished stall carts ready for Market',
  },
]

export default function FolderHub() {
  const navigate = useNavigate()
  const [, setSearchParams] = useSearchParams()

  const openFolder = (view) => {
    const next = new URLSearchParams()
    next.set('tab', 'folder')
    next.set('view', view)
    setSearchParams(next)
  }

  return (
    <div className="vm-folder-hub">
      <DashboardTraderMenu variant="folder" />
      <header className="vm-folder-hub__head">
        <h2 className="vm-folder-hub__title">Your folders</h2>
        <p className="vm-folder-hub__copy">
          Products, selfies, and stalls stay connected — open a folder to manage them.
        </p>
      </header>

      <div className="vm-folder-hub__grid">
        {FOLDERS.map((folder) => (
          <button
            key={folder.id}
            type="button"
            className={`vm-folder-hub__card vm-folder-hub__card--${folder.id}`}
            onClick={() => openFolder(folder.id)}
          >
            <span className="vm-folder-hub__icon" aria-hidden="true">
              <svg viewBox="0 0 96 80" focusable="false">
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
            </span>
            <span className="vm-folder-hub__card-title">{folder.title}</span>
            <span className="vm-folder-hub__card-copy">{folder.copy}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="vm-folder-hub__dash"
        onClick={() => navigate('/my-account?tab=create')}
      >
        Open Dashboard
      </button>
    </div>
  )
}
