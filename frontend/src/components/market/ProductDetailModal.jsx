import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatStallPrice } from '../../services/stallDisplay.js'
import { useTrolley } from '../../context/TrolleyContext.jsx'
import buyerArt from '../../assets/BUYER edit.png'
import './ProductDetailModal.css'

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

const THUMB_SLOTS = 6

function FitText({
  as: Tag = 'p',
  className = '',
  maxPx,
  minPx = 10,
  ready = true,
  children,
  ...rest
}) {
  const boxRef = useRef(null)

  useEffect(() => {
    if (!ready || children == null || children === '') return undefined

    const box = boxRef.current
    if (!box) return undefined
    const text = box.querySelector('.vm-buyer-modal__fit-text')
    if (!text) return undefined

    const fit = () => {
      const max = Number.parseFloat(getComputedStyle(box).getPropertyValue('--fit-max')) || maxPx
      const min = Number.parseFloat(getComputedStyle(box).getPropertyValue('--fit-min')) || minPx
      let size = max
      text.style.fontSize = `${size}px`
      while (
        size > min &&
        (text.scrollWidth > box.clientWidth || text.scrollHeight > box.clientHeight)
      ) {
        size -= 1
        text.style.fontSize = `${size}px`
      }
    }

    fit()
    const frame = window.requestAnimationFrame(fit)
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null
    observer?.observe(box)

    return () => {
      window.cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [ready, children, maxPx, minPx])

  return (
    <Tag ref={boxRef} className={`vm-buyer-modal__fit ${className}`.trim()} {...rest}>
      <span className="vm-buyer-modal__fit-text">{children}</span>
    </Tag>
  )
}

/**
 * Buyer product modal — comic overlay on BUYER edit.png.
 */
export default function ProductDetailModal({ product, stall = null, onClose }) {
  const titleId = useId()
  const closeRef = useRef(null)
  const touchStartX = useRef(null)
  const navigate = useNavigate()
  const { addItem } = useTrolley()
  const [activeIndex, setActiveIndex] = useState(0)
  const [entered, setEntered] = useState(false)
  const [trolleyNote, setTrolleyNote] = useState('')

  const images = collectProductImages(product)
  const imageCount = images.length
  const name = product?.name || product?.title || 'Product'

  useEffect(() => {
    if (!product) return undefined

    setActiveIndex(0)
    setEntered(false)
    setTrolleyNote('')
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

  const activeImage = images[activeIndex] || images[0] || ''
  const size = product.variation || product.size || product.label || ''
  const condition = product.condition || ''
  const price = product.price || ''
  const description = product.description || ''
  const canSlide = imageCount > 1
  const formattedPrice = price ? formatStallPrice(price) : ''
  const sellerName =
    stall?.seller?.name ||
    stall?.seller_name ||
    stall?.brand_name ||
    stall?.business_name ||
    ''
  const sellerPhoto =
    stall?.seller_photo || stall?.selfie_url || stall?.seller?.photo || stall?.seller?.selfie || ''
  const showCondition = Boolean(condition && condition !== size)

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

  const handleBuy = () => {
    addItem(product, stall)
    onClose?.()
    navigate('/my-trolley')
  }

  const handleAddToTrolley = () => {
    addItem(product, stall)
    setTrolleyNote('Added to trolley')
    window.setTimeout(() => setTrolleyNote(''), 1800)
  }

  const handleOffer = () => {
    onClose?.()
    navigate('/contact', {
      state: {
        subject: `Offer on ${name}`,
        productName: name,
        stallName: sellerName,
      },
    })
  }

  const thumbSlots = Array.from({ length: THUMB_SLOTS }, (_, index) => images[index] || null)

  return (
    <div
      className={`vm-buyer-modal${entered ? ' is-open' : ''}`}
      role="presentation"
      onClick={onClose}
    >
      <div
        className="vm-buyer-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="vm-buyer-modal__close"
          onClick={onClose}
          aria-label="Close product details"
        >
          ×
        </button>

        <div className="vm-buyer-modal__stage">
          <img className="vm-buyer-modal__art" src={buyerArt} alt="" draggable={false} />

          <div className="vm-buyer-modal__fields">
            <div
              className="vm-buyer-modal__hero"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              aria-roledescription="carousel"
              aria-label={`${name} photos`}
            >
              {activeImage ? (
                <img
                  key={activeImage}
                  src={activeImage}
                  alt={`${name} photo ${activeIndex + 1} of ${Math.max(imageCount, 1)}`}
                  className="vm-buyer-modal__hero-img"
                  draggable={false}
                />
              ) : (
                <span className="vm-buyer-modal__hero-empty">No image</span>
              )}
            </div>

            {canSlide ? (
              <>
                <button
                  type="button"
                  className="vm-buyer-modal__nav vm-buyer-modal__nav--prev"
                  onClick={goPrev}
                  aria-label="Previous product photo"
                />
                <button
                  type="button"
                  className="vm-buyer-modal__nav vm-buyer-modal__nav--next"
                  onClick={goNext}
                  aria-label="Next product photo"
                />
              </>
            ) : null}

            {thumbSlots.map((src, index) =>
              src ? (
                <button
                  key={`thumb-${src}-${index}`}
                  type="button"
                  className={`vm-buyer-modal__thumb vm-buyer-modal__thumb--${index + 1}${activeIndex === index ? ' is-active' : ''}`}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Show photo ${index + 1}`}
                  aria-pressed={activeIndex === index}
                >
                  <img src={src} alt="" />
                </button>
              ) : null
            )}

            <FitText
              as="h2"
              id={titleId}
              className="vm-buyer-modal__name"
              maxPx={52}
              minPx={14}
              ready={entered}
            >
              {name}
            </FitText>

            {formattedPrice ? (
              <FitText className="vm-buyer-modal__price" maxPx={44} minPx={14} ready={entered}>
                {formattedPrice}
              </FitText>
            ) : null}

            {size ? (
              <FitText className="vm-buyer-modal__size" maxPx={22} minPx={11} ready={entered}>
                {size}
              </FitText>
            ) : null}

            {showCondition ? (
              <FitText
                className="vm-buyer-modal__condition"
                maxPx={22}
                minPx={11}
                ready={entered}
              >
                {condition}
              </FitText>
            ) : null}

            {description ? (
              <FitText className="vm-buyer-modal__desc" maxPx={20} minPx={11} ready={entered}>
                {description}
              </FitText>
            ) : null}

            {sellerPhoto ? (
              <img
                className="vm-buyer-modal__seller-photo"
                src={sellerPhoto}
                alt={sellerName ? `${sellerName}` : 'Seller'}
              />
            ) : null}

            {sellerName ? (
              <FitText
                className="vm-buyer-modal__seller-name"
                maxPx={22}
                minPx={9}
                ready={entered}
              >
                {sellerName}
              </FitText>
            ) : null}

            {trolleyNote ? (
              <FitText className="vm-buyer-modal__note" maxPx={14} minPx={9} ready={entered}>
                {trolleyNote}
              </FitText>
            ) : null}

            <button
              type="button"
              className="vm-buyer-modal__buy"
              onClick={handleBuy}
              aria-label="Buy now"
            />
            <button
              type="button"
              className="vm-buyer-modal__trolley"
              onClick={handleAddToTrolley}
              aria-label="Add to trolley"
            />
            <button
              type="button"
              className="vm-buyer-modal__offer"
              onClick={handleOffer}
              aria-label="Make an offer"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
