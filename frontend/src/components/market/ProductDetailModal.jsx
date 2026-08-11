import { useEffect, useId, useRef, useState } from 'react'
import { formatStallPrice } from '../../services/stallDisplay.js'

function collectProductImages(product) {
  if (!product) return []
  const list = []
  const push = (value) => {
    if (!value || typeof value !== 'string') return
    if (!list.includes(value)) list.push(value)
  }

  if (Array.isArray(product.image_urls)) product.image_urls.forEach(push)
  if (Array.isArray(product.images)) {
    product.images.forEach((item) => {
      if (typeof item === 'string') push(item)
      else if (item?.url) push(item.url)
      else if (item?.src) push(item.src)
    })
  }
  push(product.image_url)
  push(product.image)
  return list
}

/**
 * Product detail modal — comic-style panel with image slider + details.
 */
export default function ProductDetailModal({ product, onClose }) {
  const titleId = useId()
  const closeRef = useRef(null)
  const touchStartX = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [entered, setEntered] = useState(false)

  const images = collectProductImages(product)
  const imageCount = images.length

  useEffect(() => {
    if (!product) return undefined

    setActiveIndex(0)
    setEntered(false)
    const frame = window.requestAnimationFrame(() => setEntered(true))

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setActiveIndex((index) => (imageCount ? (index - 1 + imageCount) % imageCount : 0))
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setActiveIndex((index) => (imageCount ? (index + 1) % imageCount : 0))
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [product, onClose, imageCount])

  if (!product) return null

  const name = product.name || product.title || 'Product'
  const activeImage = images[activeIndex] || images[0] || ''
  const variation = product.variation || product.condition || product.label || ''
  const price = product.price || ''
  const description = product.description || ''
  const canSlide = imageCount > 1
  const formattedPrice = price ? formatStallPrice(price) : ''

  const goPrev = () => {
    if (!canSlide) return
    setActiveIndex((index) => (index - 1 + imageCount) % imageCount)
  }

  const goNext = () => {
    if (!canSlide) return
    setActiveIndex((index) => (index + 1) % imageCount)
  }

  const onTouchStart = (event) => {
    touchStartX.current = event.changedTouches?.[0]?.clientX ?? null
  }

  const onTouchEnd = (event) => {
    if (touchStartX.current == null || !canSlide) return
    const endX = event.changedTouches?.[0]?.clientX ?? touchStartX.current
    const delta = endX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 40) return
    if (delta > 0) goPrev()
    else goNext()
  }

  return (
    <div
      className={`vm-modal${entered ? ' is-open' : ''}`}
      role="presentation"
      onClick={onClose}
    >
      <div
        className="vm-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="vm-modal__close"
          onClick={onClose}
          aria-label="Close product details"
        >
          ×
        </button>

        <div
          className="vm-modal__media"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="vm-modal__slider" aria-roledescription="carousel" aria-label={`${name} photos`}>
            {activeImage ? (
              <img
                key={activeImage}
                src={activeImage}
                alt={`${name} photo ${activeIndex + 1} of ${Math.max(imageCount, 1)}`}
                className="vm-modal__image"
                draggable={false}
              />
            ) : (
              <div className="vm-modal__placeholder">No image</div>
            )}

            {canSlide && (
              <>
                <button
                  type="button"
                  className="vm-modal__nav vm-modal__nav--prev"
                  onClick={goPrev}
                  aria-label="Previous product photo"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="vm-modal__nav vm-modal__nav--next"
                  onClick={goNext}
                  aria-label="Next product photo"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {canSlide && (
            <div className="vm-modal__thumbs" role="tablist" aria-label="Product photos">
              {images.map((src, index) => (
                <button
                  key={`thumb-${src}-${index}`}
                  type="button"
                  role="tab"
                  aria-selected={activeIndex === index}
                  className={`vm-modal__thumb${activeIndex === index ? ' is-active' : ''}`}
                  onClick={() => setActiveIndex(index)}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="vm-modal__body">
          {formattedPrice ? (
            <p className="vm-modal__price-tag">
              <span className="vm-modal__price">{formattedPrice}</span>
            </p>
          ) : null}

          <div className="vm-modal__intro">
            <h2 id={titleId} className="vm-modal__title">
              {name}
            </h2>
            {variation ? (
              <p className="vm-modal__chip">
                <span className="vm-modal__chip-label">Size</span>
                <span className="vm-modal__chip-value">{variation}</span>
              </p>
            ) : null}
          </div>

          {description ? (
            <div className="vm-modal__copy">
              <p className="vm-modal__label">Description</p>
              <p className="vm-modal__desc">{description}</p>
            </div>
          ) : null}

          <div className="vm-modal__actions">
            <button type="button" className="vm-modal__buy">
              Buy now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
