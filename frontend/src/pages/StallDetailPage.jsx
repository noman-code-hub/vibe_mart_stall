import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx'
import { getStall } from '../services/stallApi.js'
import { formatStallPrice, stallToMarketStallProps } from '../services/stallDisplay.js'
import { formatDisplayDate } from '../utils/dateFormat.js'
import ProductDetailModal from '../components/market/ProductDetailModal.jsx'
import StallLoadingScreen from '../components/StallLoadingScreen.jsx'
import '../styles/stallDetail.css'

const MarketStall = lazy(() => import('../components/MarketStall'))

function normalizeProduct(product, index = 0) {
  if (!product) return null
  const images = (
    Array.isArray(product.image_urls) && product.image_urls.length
      ? product.image_urls
      : Array.isArray(product.images) && product.images.length
        ? product.images
        : [product.image_url || product.image]
  )
    .map((item) => (typeof item === 'string' ? item : item?.url || item?.src || ''))
    .filter(Boolean)

  return {
    id: product.id ?? index,
    name: product.name || product.title || `Product ${index + 1}`,
    image_url: images[0] || product.image_url || product.image || '',
    image: images[0] || product.image_url || product.image || '',
    image_urls: images,
    condition: product.condition || '',
    label: product.variation || product.label || '',
    variation: product.variation || product.label || '',
    price: product.price || '',
    description: product.description || '',
    images,
  }
}

/**
 * Stall Details — comic/pop-art listing page for a published market stall.
 */
export default function StallDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const config = useRuntimeConfig()
  const [stall, setStall] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedProductIndex, setSelectedProductIndex] = useState(null)
  const [modalProduct, setModalProduct] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await getStall(config, id)
        if (!cancelled) setStall(data)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not load this stall.')
          setStall(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [config, id])

  const props = useMemo(() => stallToMarketStallProps(stall), [stall])
  const products = useMemo(
    () =>
      (Array.isArray(stall?.products) ? stall.products.map((p, i) => normalizeProduct(p, i)) : [])
        .filter(Boolean)
        .filter((product) => product.name || product.image_url),
    [stall]
  )

  const pitchLine = useMemo(() => {
    if (!stall) return ''
    return [stall.pitch_number && `Pitch ${stall.pitch_number}`, stall.pitch_location]
      .filter(Boolean)
      .join(' · ')
  }, [stall])

  const openProduct = useCallback((product, index = 0) => {
    const next = normalizeProduct(product, index)
    if (!next) return
    setSelectedProductIndex(index)
    setModalProduct(next)
  }, [])

  const closeModal = useCallback(() => {
    setModalProduct(null)
  }, [])

  return (
    <section className="vm-page vm-page--market vm-page--stall-detail">
      <div className="vm-sd">
        <div className="vm-sd__nav">
          <button type="button" className="vm-sd__back" onClick={() => navigate('/market')}>
            ← Back to market
          </button>
          <Link className="vm-sd__browse" to="/market">
            Browse all stalls
          </Link>
        </div>

        {loading && (
          <div className="vm-market-loading">
            <StallLoadingScreen />
          </div>
        )}
        {error && (
          <p className="vm-error vm-sd__error" role="alert">
            {error}
          </p>
        )}

        {!loading && stall && props && (
          <>
            <header className="vm-sd__mast">
              <p className="vm-sd__kicker">Stall details</p>
              <h1 className="vm-sd__brand">{stall.brand_name || 'Untitled stall'}</h1>
              {pitchLine ? <p className="vm-sd__pitch-line">{pitchLine}</p> : null}
              {Array.isArray(stall.badges) && stall.badges.length > 0 ? (
                <ul className="vm-sd__badges">
                  {stall.badges.map((badge) => (
                    <li key={badge} className="vm-sd__badge">
                      {badge}
                    </li>
                  ))}
                </ul>
              ) : null}
            </header>

            <div className="vm-sd__stage">
              <Suspense fallback={<StallLoadingScreen />}>
                <MarketStall
                  {...props}
                  className="vm-market-stall vm-market-stall--interactive"
                  selectedProductIndex={selectedProductIndex}
                  onProductClick={(index, productFromCart) => {
                    const fromList = products[index] || normalizeProduct(productFromCart, index)
                    openProduct(fromList, index)
                  }}
                />
              </Suspense>
              <p className="vm-sd__tap-hint">Tap a product on the stall to see every photo</p>
            </div>

            <section className="vm-sd__story" aria-labelledby="vm-sd-trader-heading">
              <div className="vm-sd__portrait">
                {stall.seller_photo ? (
                  <img
                    src={stall.seller_photo}
                    alt={`${stall.brand_name || 'Trader'} seller photo`}
                    className="vm-sd__portrait-img"
                  />
                ) : (
                  <div className="vm-sd__portrait-empty">No seller photo</div>
                )}
              </div>
              <div className="vm-sd__story-copy">
                <p className="vm-sd__story-kicker">Who’s behind this stall?</p>
                <h2 id="vm-sd-trader-heading" className="vm-sd__story-title">
                  Meet {stall.brand_name || 'the trader'}
                </h2>
                <p className="vm-sd__story-text">{stall.seller_bio || 'No bio provided yet.'}</p>
                <div className="vm-sd__ambition">
                  <span className="vm-sd__ambition-label">My ambition</span>
                  <p>{stall.ambition || 'No ambition provided yet.'}</p>
                </div>
              </div>
            </section>

            <section className="vm-sd__facts" aria-label="Pitch information">
              <div className="vm-sd__fact">
                <span className="vm-sd__fact-label">Pitch</span>
                <strong>{stall.pitch_number || '—'}</strong>
              </div>
              <div className="vm-sd__fact">
                <span className="vm-sd__fact-label">Location</span>
                <strong>{stall.pitch_location || '—'}</strong>
              </div>
              <div className="vm-sd__fact">
                <span className="vm-sd__fact-label">Member since</span>
                <strong>{formatDisplayDate(stall.member_since) || stall.member_since || '—'}</strong>
              </div>
              <div className="vm-sd__fact">
                <span className="vm-sd__fact-label">Products</span>
                <strong>{stall.product_count ?? products.length}</strong>
              </div>
            </section>

            <section className="vm-sd__goods" aria-labelledby="vm-sd-goods-heading">
              <div className="vm-sd__goods-head">
                <h2 id="vm-sd-goods-heading" className="vm-sd__goods-title">
                  On this stall
                </h2>
                <p className="vm-sd__goods-sub">Open any item for the full photo slide</p>
              </div>

              {products.length === 0 ? (
                <p className="vm-sd__empty">No products listed for this stall.</p>
              ) : (
                <div className="vm-sd__goods-grid">
                  {products.map((product, index) => (
                    <button
                      key={product.id || `${product.name}-${index}`}
                      type="button"
                      className="vm-sd__good"
                      onClick={() => openProduct(product, index)}
                    >
                      <span className="vm-sd__good-media">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="vm-sd__good-img" />
                        ) : (
                          <span className="vm-sd__good-empty">No image</span>
                        )}
                        {product.images?.length > 1 ? (
                          <span className="vm-sd__good-count">{product.images.length} photos</span>
                        ) : null}
                      </span>
                      <span className="vm-sd__good-body">
                        <span className="vm-sd__good-name">{product.name}</span>
                        {product.variation ? (
                          <span className="vm-sd__good-meta">{product.variation}</span>
                        ) : null}
                        {product.price ? (
                          <strong className="vm-sd__good-price">
                            {formatStallPrice(product.price)}
                          </strong>
                        ) : null}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <ProductDetailModal product={modalProduct} stall={stall} onClose={closeModal} />
    </section>
  )
}
