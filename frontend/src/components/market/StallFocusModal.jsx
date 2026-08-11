import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { stallToMarketStallProps } from '../../services/stallDisplay.js'
import ProductDetailModal from './ProductDetailModal.jsx'
import StallLoadingScreen from '../StallLoadingScreen.jsx'

const MarketStall = lazy(() => import('../MarketStall'))

const STALL_DESIGN_WIDTH = 1024
const STALL_DESIGN_HEIGHT = 576

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
    condition: product.condition || product.label || product.variation || '',
    label: product.condition || product.label || product.variation || '',
    variation: product.variation || product.condition || product.label || '',
    price: product.price || '',
    description: product.description || '',
    images,
  }
}

/**
 * Zoomed market stall overlay — darkens the market behind it.
 */
export default function StallFocusModal({ stall, onClose }) {
  const closeRef = useRef(null)
  const frameRef = useRef(null)
  const [scale, setScale] = useState(0.8)
  const [entered, setEntered] = useState(false)
  const [selectedProductIndex, setSelectedProductIndex] = useState(null)
  const [modalProduct, setModalProduct] = useState(null)

  const props = useMemo(() => stallToMarketStallProps(stall), [stall])
  const products = useMemo(
    () =>
      (Array.isArray(stall?.products) ? stall.products.map((p, i) => normalizeProduct(p, i)) : [])
        .filter(Boolean)
        .filter((product) => product.name || product.image_url),
    [stall]
  )

  useLayoutEffect(() => {
    const node = frameRef.current
    if (!node || typeof ResizeObserver === 'undefined') return undefined

    const update = () => {
      const width = node.clientWidth
      if (!width) return
      setScale(Math.min(1, width / STALL_DESIGN_WIDTH))
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [stall])

  const modalProductRef = useRef(null)
  modalProductRef.current = modalProduct

  useEffect(() => {
    if (!stall) return undefined

    setEntered(false)
    setSelectedProductIndex(null)
    setModalProduct(null)
    const frame = window.requestAnimationFrame(() => setEntered(true))

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      if (modalProductRef.current) {
        setModalProduct(null)
        setSelectedProductIndex(null)
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [stall, onClose])

  if (!stall || !props) return null

  const openProduct = (product, index = 0) => {
    const next = normalizeProduct(product, index)
    if (!next) return
    setSelectedProductIndex(index)
    setModalProduct(next)
  }

  return createPortal(
    <div
      className={`vm-stall-focus${entered ? ' is-open' : ''}`}
      role="presentation"
      onClick={onClose}
    >
      <div
        className="vm-stall-focus__dialog"
        role="dialog"
        aria-modal="true"
        aria-label={props.businessName || 'Market stall'}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="vm-stall-focus__frame">
          <div
            className="vm-stall-focus__stage"
            ref={frameRef}
            style={{ aspectRatio: `${STALL_DESIGN_WIDTH} / ${STALL_DESIGN_HEIGHT}` }}
          >
            <div
              className="vm-stall-focus__stage-inner"
              style={{
                width: STALL_DESIGN_WIDTH,
                height: STALL_DESIGN_HEIGHT,
                transform: `scale(${scale})`,
              }}
            >
              <Suspense fallback={<StallLoadingScreen />}>
                <MarketStall
                  {...props}
                  className="vm-market-stall vm-market-stall--interactive"
                  selectedProductIndex={selectedProductIndex}
                  onClose={(event) => {
                    event?.stopPropagation?.()
                    onClose()
                  }}
                  closeRef={closeRef}
                  onProductClick={(index, productFromCart) => {
                    const fromList = products[index] || normalizeProduct(productFromCart, index)
                    openProduct(fromList, index)
                  }}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      <ProductDetailModal
        product={modalProduct}
        stall={stall}
        onClose={() => {
          setModalProduct(null)
          setSelectedProductIndex(null)
        }}
      />
    </div>,
    document.getElementById('vibe-mart-root') ||
      document.getElementById('stall-root') ||
      document.body
  )
}
