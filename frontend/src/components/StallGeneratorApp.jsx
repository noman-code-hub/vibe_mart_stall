import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import StallEditorForm from './StallEditorForm'
import StallLoadingScreen from './StallLoadingScreen'
import ProductDetailModal from './market/ProductDetailModal.jsx'
import DashboardTraderMenu from './account/DashboardTraderMenu.jsx'
import { createEmptyStallData } from '../data/stallData'
import stallCart from '../assets/stall-cart.png'
import dashArt from '../assets/MY DASH.png'
import { useAuth } from '../context/AuthContext.jsx'
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx'
import {
  createStall,
  getStall,
  getOwnedStallQuota,
  MAX_FREE_STALLS,
  STALL_LIMIT_MESSAGE,
  updateStall,
} from '../services/stallApi.js'
import { buildStallCreatePayload } from '../services/stallPayload.js'
import { stallToEditorState } from '../services/stallDisplay.js'
import '../App.css'
import './DashboardForm.css'

// The finished stall is only needed after "Generate Stall", so it ships as its
// own chunk that is fetched during the existing loading screen.
const loadMarketStall = () => import('./MarketStall')
const MarketStall = lazy(loadMarketStall)

// ---------------------------------------------------------------------------
// Stable object-URL hook — must live here (App never unmounts between steps)
// so the URL isn't revoked when the editor form unmounts on "Generate Stall".
// ---------------------------------------------------------------------------
function useStableFileUrl(source) {
  const isBlobLike = Boolean(source) && typeof source !== 'string'
  const objectUrl = useMemo(
    () => (isBlobLike ? URL.createObjectURL(source) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source]
  )
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [objectUrl])

  if (!source) return null
  if (typeof source === 'string') return source
  return objectUrl
}

function preloadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve()
      return
    }
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = src
  })
}

function toFormData(stall) {
  return {
    business_name: stall.business_name,
    seller: {
      name: stall.seller.name,
      about: stall.seller.about,
      ambition: stall.seller.ambition,
    },
    pitch: { ...stall.pitch },
  }
}

/**
 * Existing stall generator UI — preserved and mounted on Dashboard / Sell Smart.
 * Do not remove features from this component; extend via props/callbacks.
 */
export default function StallGeneratorApp({ variant = 'default', stallId = null }) {
  const { isAuthenticated } = useAuth()
  const config = useRuntimeConfig()
  const navigate = useNavigate()
  const [step, setStep] = useState('edit') // 'edit' | 'loading' | 'finished'
  const [data, setData] = useState(() => toFormData(createEmptyStallData()))
  const [selfieFile, setSelfieFile] = useState(null)
  const [productSlots, setProductSlots] = useState([])
  const [selectedProductIndex, setSelectedProductIndex] = useState(null)
  const [modalProduct, setModalProduct] = useState(null)
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [validationErrors, setValidationErrors] = useState([])
  const [savedStallId, setSavedStallId] = useState(null)
  const [stallStatus, setStallStatus] = useState('draft')
  const [quota, setQuota] = useState(null)
  const [hydrateBusy, setHydrateBusy] = useState(Boolean(stallId))

  useEffect(() => {
    if (!stallId) {
      setHydrateBusy(false)
      return undefined
    }

    let cancelled = false
    setHydrateBusy(true)
    setSaveMessage('')
    setSaveError('')
    getStall(config, stallId)
      .then((stall) => {
        if (cancelled || !stall) return
        const state = stallToEditorState(stall)
        if (!state) return
        setData(state.data)
        setSelfieFile(state.selfieFile)
        setProductSlots(state.productSlots)
        setSavedStallId(state.savedStallId)
        setStallStatus(state.status)
        setStep('edit')
        setSaveMessage(`Editing “${stall.brand_name || 'stall'}”. Changes will update this stall.`)
      })
      .catch((err) => {
        if (!cancelled) {
          setSaveError(err?.message || 'Could not load stall into the dashboard.')
        }
      })
      .finally(() => {
        if (!cancelled) setHydrateBusy(false)
      })

    return () => {
      cancelled = true
    }
  }, [stallId, config])

  useEffect(() => {
    if (!isAuthenticated) {
      setQuota(null)
      return undefined
    }
    let cancelled = false
    getOwnedStallQuota(config)
      .then((info) => {
        if (!cancelled) setQuota(info)
      })
      .catch(() => {
        if (!cancelled) setQuota(null)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, config, savedStallId])

  const handleClearAll = () => {
    setData(toFormData(createEmptyStallData()))
    setSelfieFile(null)
    setProductSlots([])
    setSelectedProductIndex(null)
    setSaveMessage('')
    setSaveError('')
    setValidationErrors([])
    setSavedStallId(null)
    setStallStatus('draft')
    if (stallId) {
      navigate('/my-account?tab=create', { replace: true })
    }
  }

  const selfieUrl = useStableFileUrl(selfieFile)
  const productUrl0 = useStableFileUrl(
    productSlots[0]?.files?.[0] ?? productSlots[0]?.file ?? null
  )
  const productUrl1 = useStableFileUrl(
    productSlots[1]?.files?.[0] ?? productSlots[1]?.file ?? null
  )
  const productUrl2 = useStableFileUrl(
    productSlots[2]?.files?.[0] ?? productSlots[2]?.file ?? null
  )
  const productUrl3 = useStableFileUrl(
    productSlots[3]?.files?.[0] ?? productSlots[3]?.file ?? null
  )
  const resolvedProductUrls = useMemo(
    () => [productUrl0, productUrl1, productUrl2, productUrl3],
    [productUrl0, productUrl1, productUrl2, productUrl3]
  )

  const stallProducts = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => {
        const slot = productSlots[i]
        if (!slot) {
          return {
            id: i,
            title: `Product ${i + 1}`,
            image: null,
            images: [],
            description: '',
            variation: '',
            label: '',
            price: '',
          }
        }
        const files = Array.isArray(slot.files)
          ? slot.files.filter(Boolean)
          : slot.file
            ? [slot.file]
            : []
        return {
          id: i,
          title: `Product ${i + 1}`,
          name: slot.name ?? '',
          label: slot.variation ?? '',
          variation: slot.variation ?? '',
          description: slot.description ?? '',
          image: resolvedProductUrls[i] ?? null,
          images: files,
          price: slot.price ?? '',
        }
      }),
    [productSlots, resolvedProductUrls]
  )

  const handleGenerateStall = async () => {
    setSaveMessage('')
    setSaveError('')
    setValidationErrors([])

    setStep('loading')

    // Stall cart is large — wait until it (and any uploaded photos) are ready
    // so the finished view does not flash a blank brown background.
    const assets = [stallCart, selfieUrl, ...resolvedProductUrls].filter(Boolean)
    await Promise.all([loadMarketStall(), ...assets.map(preloadImage)])

    setStep('finished')
  }

  const handleSaveToFolder = async () => {
    setSaveMessage('')
    setSaveError('')
    setValidationErrors([])

    if (!isAuthenticated) {
      setSaveError('Please log in to save your stall to the Folder.')
      return
    }

    setSaveBusy(true)
    try {
      const currentQuota = await getOwnedStallQuota(config)
      setQuota(currentQuota)

      const payload = await buildStallCreatePayload({
        data,
        selfieFile,
        productSlots,
        status: savedStallId ? stallStatus : 'draft',
      })

      if (savedStallId) {
        const updated = await updateStall(config, savedStallId, payload)
        setSavedStallId(updated?.id || savedStallId)
        setStallStatus(updated?.status === 'published' ? 'published' : stallStatus)
        setSaveMessage(
          `Updated “${updated?.brand_name || data.business_name || 'Untitled stall'}” in your Folder.`
        )
        window.dispatchEvent(
          new CustomEvent('vm:stalls-changed', {
            detail: { seller_photo: updated?.seller_photo || payload.seller_photo || '' },
          })
        )
        navigate('/my-account?tab=stalls', { replace: true })
        return
      }

      if (currentQuota.atLimit) {
        setSaveError(STALL_LIMIT_MESSAGE)
        return
      }

      const created = await createStall(config, payload)
      setSavedStallId(created?.id || null)
      setStallStatus('draft')
      setSaveMessage(
        `Saved “${created?.brand_name || data.business_name || 'Untitled stall'}” to your Folder as a draft.`
      )
      setQuota({
        count: currentQuota.count + 1,
        remaining: Math.max(0, MAX_FREE_STALLS - (currentQuota.count + 1)),
        atLimit: currentQuota.count + 1 >= MAX_FREE_STALLS,
      })
      window.dispatchEvent(
        new CustomEvent('vm:stalls-changed', {
          detail: { seller_photo: created?.seller_photo || payload.seller_photo || '' },
        })
      )
      navigate('/my-account?tab=stalls', { replace: true })
    } catch (err) {
      const message = err?.message || 'Could not save stall to Folder.'
      setSaveError(message.includes('Maximum 5') ? STALL_LIMIT_MESSAGE : message)
    } finally {
      setSaveBusy(false)
    }
  }

  if (hydrateBusy) {
    return (
      <div className={`app${variant === 'dashboard' ? ' app--dashboard' : ''}`}>
        <StallLoadingScreen />
      </div>
    )
  }

  if (step === 'loading') {
    return (
      <div className="app app--finished">
        <StallLoadingScreen />
      </div>
    )
  }

  if (step === 'finished') {
    return (
      <div className="app app--finished">
        <div className="app__finished-toolbar">
          <button
            type="button"
            className="app__edit-btn"
            onClick={() => {
              setStep('edit')
              setSaveMessage('')
              setSaveError('')
              setValidationErrors([])
            }}
          >
            ← Edit
          </button>
          <div className="app__finished-actions">
            {quota && (
              <span className="app__quota">
                {quota.count}/{MAX_FREE_STALLS} free stalls used
              </span>
            )}
            {!savedStallId ? (
              <button
                type="button"
                className="app__create-btn"
                onClick={handleSaveToFolder}
                disabled={saveBusy || quota?.atLimit}
              >
                {saveBusy ? 'Saving…' : 'Save to Folder'}
              </button>
            ) : (
              <div className="app__success-actions">
                <button
                  type="button"
                  className="app__create-btn"
                  onClick={handleSaveToFolder}
                  disabled={saveBusy}
                >
                  {saveBusy ? 'Updating…' : 'Update stall'}
                </button>
                <Link className="app__create-btn app__create-btn--link" to="/my-account?tab=stalls">
                  Open Folder →
                </Link>
              </div>
            )}
          </div>
        </div>

        {quota?.atLimit && !savedStallId && (
          <p className="app__save-banner app__save-banner--error" role="alert">
            {STALL_LIMIT_MESSAGE}
          </p>
        )}
        {saveError && (
          <div className="app__save-banner app__save-banner--error" role="alert">
            <p>{saveError}</p>
            {saveError.includes('log in') && (
              <p>
                <Link to="/login">Log in</Link> to save to Folder.
              </p>
            )}
            {validationErrors.length > 0 && (
              <ul className="app__validation-list">
                {validationErrors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            <button type="button" className="app__edit-btn" onClick={() => setStep('edit')}>
              Fix in editor
            </button>
          </div>
        )}
        {saveMessage && (
          <div className="app__save-banner app__save-banner--ok" role="status">
            <p>{saveMessage}</p>
            <p className="app__save-banner__hint">
              Status: <strong>Draft</strong>. Open Folder to send stalls to the Market.
            </p>
          </div>
        )}

        <Suspense fallback={<StallLoadingScreen />}>
          <MarketStall
            businessName={data.business_name}
            products={stallProducts}
            seller={data.seller}
            pitch={{ ...data.pitch, product_count: productSlots.length }}
            selfieUrl={selfieUrl}
            selfieAlt={data.seller?.name}
            selectedProductIndex={selectedProductIndex}
            onProductClick={(index, productFromCart) => {
              const product = stallProducts[index] || productFromCart
              if (!product?.name && !product?.image && !product?.price) return
              const blobUrls = []
              const images = (product.images || [])
                .map((source) => {
                  if (!source) return ''
                  if (typeof source === 'string') return source
                  const url = URL.createObjectURL(source)
                  blobUrls.push(url)
                  return url
                })
                .filter(Boolean)
              if (!images.length && product.image) images.push(product.image)
              setSelectedProductIndex(index)
              setModalProduct({
                name: product.name || product.title || `Product ${index + 1}`,
                image: images[0] || product.image || '',
                image_url: images[0] || product.image || '',
                images,
                blobUrls,
                price: product.price || '',
                condition: product.variation || product.label || '',
                label: product.variation || product.label || '',
                description: product.description || '',
              })
            }}
          />
        </Suspense>
        <ProductDetailModal
          product={modalProduct}
          stall={{
            brand_name: data.business_name || '',
            seller_photo: selfieUrl || '',
            seller: {
              name: data.seller?.name || '',
              photo: selfieUrl || '',
            },
          }}
          onClose={() => {
            modalProduct?.blobUrls?.forEach((url) => URL.revokeObjectURL(url))
            setModalProduct(null)
            setSelectedProductIndex(null)
          }}
        />
      </div>
    )
  }

  const isDashboard = variant === 'dashboard'

  return (
    <div className={`app${isDashboard ? ' app--dashboard' : ''}`}>
      {!isDashboard && (
        <header className="app__header">
          <h1>Vibe Mart — Stall Editor</h1>
          <p>
            Fill in your stall details, upload photos, generate a live preview, then send it to the
            market.
          </p>
          {quota && (
            <p className={`app__quota-note${quota.atLimit ? ' app__quota-note--limit' : ''}`}>
              {quota.atLimit
                ? STALL_LIMIT_MESSAGE
                : `${quota.remaining} of ${MAX_FREE_STALLS} free stalls remaining.`}
            </p>
          )}
        </header>
      )}

      {(isDashboard && (saveError || validationErrors.length > 0)) && (
        <div className="app__save-banner app__save-banner--error app__save-banner--dash-top" role="alert">
          <span className="app__save-banner__mark" aria-hidden="true">
            !
          </span>
          <div className="app__save-banner__body">
            {saveError && <p>{saveError}</p>}
            {validationErrors.length > 0 && (
              <ul className="app__validation-list">
                {validationErrors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className={isDashboard ? 'vm-dash' : 'app__form-wrap'}>
        {isDashboard && (
          <img className="vm-dash__art" src={dashArt} alt="" draggable={false} />
        )}
        {isDashboard && <DashboardTraderMenu />}
        <div className={isDashboard ? 'vm-dash__overlay' : undefined}>
          {isDashboard && saveMessage && (
            <p className="app__quota-note" role="status">
              {saveMessage}
            </p>
          )}
          {isDashboard && quota && (
            <p className={`app__quota-note${quota.atLimit && !savedStallId ? ' app__quota-note--limit' : ''}`}>
              {quota.atLimit && !savedStallId
                ? STALL_LIMIT_MESSAGE
                : `${quota.remaining} of ${MAX_FREE_STALLS} free stalls remaining.`}
            </p>
          )}
          {!isDashboard && (saveError || validationErrors.length > 0) && (
            <div className="app__save-banner app__save-banner--error" role="alert">
              <span className="app__save-banner__mark" aria-hidden="true">
                !
              </span>
              <div className="app__save-banner__body">
                {saveError && <p>{saveError}</p>}
                {validationErrors.length > 0 && (
                  <ul className="app__validation-list">
                    {validationErrors.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          <StallEditorForm
            data={data}
            onDataChange={setData}
            selfieFile={selfieFile}
            onSelfieChange={setSelfieFile}
            onSelfieClear={() => setSelfieFile(null)}
            productSlots={productSlots}
            onProductSlotsChange={setProductSlots}
            onClearAll={handleClearAll}
          />
          <div className="app__generate-row">
            <button
              type="button"
              className="app__generate-btn"
              onClick={handleGenerateStall}
              aria-label={isDashboard ? "Let's go — generate stall" : undefined}
            >
              {isDashboard ? null : 'Generate Stall →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
