import { useRef, useState } from 'react'
import { useFileUrl } from '../hooks/useImageAsset'
import { removeBackground, blobToPngFile } from '../api/removeBackground'
import './ProductImageSlots.css'

export const MAX_PRODUCT_IMAGES = 6

export function emptyProductFiles() {
  return Array.from({ length: MAX_PRODUCT_IMAGES }, () => null)
}

export function normalizeProductFiles(product) {
  const next = emptyProductFiles()
  if (Array.isArray(product?.files)) {
    for (let i = 0; i < Math.min(product.files.length, MAX_PRODUCT_IMAGES); i += 1) {
      next[i] = product.files[i] || null
    }
    return next
  }
  if (product?.file) {
    next[0] = product.file
  }
  return next
}

function packFiles(files) {
  return normalizeProductFiles({ files }).filter(Boolean)
}

function toSlots(packed) {
  const next = emptyProductFiles()
  packed.slice(0, MAX_PRODUCT_IMAGES).forEach((file, index) => {
    next[index] = file
  })
  return next
}

function SlotThumb({ file, label, loading }) {
  const previewUrl = useFileUrl(file)
  return (
    <div className="product-image-slots__thumb">
      {loading ? (
        <span className="product-image-slots__spinner" aria-hidden="true" />
      ) : previewUrl ? (
        <img src={previewUrl} alt={label} />
      ) : (
        <span className="product-image-slots__empty">+</span>
      )}
    </div>
  )
}

/**
 * Progressive photo picker — one starter slot, then “Add more image” up to 6.
 * First photo is the stall face image.
 * variant="overlay" — fixed 6-slot grid for comic art overlays (no chrome).
 */
export default function ProductImageSlots({
  files,
  onChange,
  removeBg = true,
  variant = 'default',
}) {
  const slots = normalizeProductFiles({ files })
  const packed = packFiles(files)
  const [loadingIndex, setLoadingIndex] = useState(null)
  const [error, setError] = useState('')
  const addMoreInputRef = useRef(null)
  const isOverlay = variant === 'overlay'

  const commitPacked = (nextPacked) => onChange(toSlots(nextPacked))
  const commitSlots = (nextSlots) => onChange(normalizeProductFiles({ files: nextSlots }))

  const processFile = async (file, targetIndex) => {
    setError('')
    if (!removeBg) {
      return file
    }
    setLoadingIndex(targetIndex)
    try {
      const blob = await removeBackground(file)
      return blobToPngFile(blob, file.name || `product-${targetIndex + 1}`)
    } catch (err) {
      setError(err.message || 'Background removal failed.')
      return null
    } finally {
      setLoadingIndex(null)
    }
  }

  const handleReplace = async (index, event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const processed = await processFile(file, index)
    if (!processed) return
    if (isOverlay) {
      const next = [...slots]
      next[index] = processed
      commitSlots(next)
      return
    }
    const next = [...packed]
    next[index] = processed
    commitPacked(next)
  }

  const handleAddFirst = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const processed = await processFile(file, 0)
    if (!processed) return
    commitPacked([processed])
  }

  const handleAddMore = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || packed.length >= MAX_PRODUCT_IMAGES) return
    const processed = await processFile(file, packed.length)
    if (!processed) return
    commitPacked([...packed, processed])
  }

  const handleOverlayPick = async (index, event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const processed = await processFile(file, index)
    if (!processed) return
    const next = [...slots]
    next[index] = processed
    commitSlots(next)
  }

  const removeAt = (index) => {
    if (isOverlay) {
      const next = [...slots]
      next[index] = null
      commitSlots(next)
      return
    }
    commitPacked(packed.filter((_, i) => i !== index))
  }

  const busy = loadingIndex != null
  const canAddMore = packed.length > 0 && packed.length < MAX_PRODUCT_IMAGES

  if (isOverlay) {
    return (
      <>
        {slots.map((file, index) => {
          const slotBusy = loadingIndex === index
          const filled = Boolean(file)
          const n = index + 1
          return (
            <div
              key={index}
              className={`product-image-slots__slot product-image-slots__slot--overlay product-image-slots__slot--${n}${filled ? ' is-filled' : ''}${index === 0 ? ' is-primary' : ''}`}
            >
              <SlotThumb
                file={file}
                label={index === 0 ? 'Main product photo' : `Product photo ${n}`}
                loading={slotBusy}
              />
              <label
                className={`product-image-slots__hit${busy ? ' is-disabled' : ''}`}
                aria-label={
                  filled
                    ? `Replace photo ${n}`
                    : `Add photo ${n}${index === 0 ? ' (main)' : ''}`
                }
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={(event) => handleOverlayPick(index, event)}
                  disabled={busy}
                  hidden
                />
              </label>
              {filled && !slotBusy ? (
                <button
                  type="button"
                  className="product-image-slots__remove product-image-slots__remove--overlay"
                  onClick={() => removeAt(index)}
                  aria-label={`Remove photo ${n}`}
                >
                  ×
                </button>
              ) : null}
            </div>
          )
        })}
        {error ? (
          <p className="product-image-slots__error product-image-slots__error--overlay" role="alert">
            {error}
          </p>
        ) : null}
      </>
    )
  }

  return (
    <div className="product-image-slots">
      <div className="product-image-slots__head">
        <span className="product-image-slots__title">Photos</span>
        <span className="product-image-slots__count">
          {packed.length}/{MAX_PRODUCT_IMAGES}
        </span>
      </div>
      <p className="product-image-slots__hint">
        First photo shows on the stall. All photos open when a shopper clicks the product.
      </p>

      <div className="product-image-slots__grid">
        {packed.length === 0 ? (
          <div className="product-image-slots__slot is-primary">
            <SlotThumb file={null} label="Main product photo" loading={loadingIndex === 0} />
            <span className="product-image-slots__badge">Main</span>
            <div className="product-image-slots__actions">
              <label className={`product-image-slots__upload${busy ? ' is-disabled' : ''}`}>
                {loadingIndex === 0 ? '…' : 'Add'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleAddFirst}
                  disabled={busy}
                  hidden
                />
              </label>
            </div>
          </div>
        ) : (
          packed.map((file, index) => {
            const slotBusy = loadingIndex === index
            return (
              <div
                key={`${index}-${typeof file === 'string' ? file : file?.name || index}`}
                className={`product-image-slots__slot is-filled${index === 0 ? ' is-primary' : ''}`}
              >
                <SlotThumb
                  file={file}
                  label={index === 0 ? 'Main product photo' : `Product photo ${index + 1}`}
                  loading={slotBusy}
                />
                {index === 0 && <span className="product-image-slots__badge">Main</span>}
                <div className="product-image-slots__actions">
                  <label className={`product-image-slots__upload${busy ? ' is-disabled' : ''}`}>
                    {slotBusy ? '…' : 'Replace'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={(event) => handleReplace(index, event)}
                      disabled={busy}
                      hidden
                    />
                  </label>
                  {!slotBusy && (
                    <button
                      type="button"
                      className="product-image-slots__remove"
                      onClick={() => removeAt(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {canAddMore && (
        <div className="product-image-slots__more">
          <input
            ref={addMoreInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            onChange={handleAddMore}
            disabled={busy}
            hidden
          />
          <button
            type="button"
            className="product-image-slots__more-btn"
            disabled={busy}
            onClick={() => addMoreInputRef.current?.click()}
          >
            + Add more image
          </button>
        </div>
      )}

      {error && (
        <p className="product-image-slots__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
