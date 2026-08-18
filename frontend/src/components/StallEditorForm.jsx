import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ImageUploadField from './ImageUploadField'
import ProductImageSlots, {
  emptyProductFiles,
  normalizeProductFiles,
} from './ProductImageSlots'
import { FIELD_LIMITS, countWords, countChars } from '../data/fieldLimits'
import selfieTipsArt from '../assets/SELFIE PAGE.png'
import selfieTipsBtn from '../assets/SELFIE TIPS.png'
import marketStallTipsBtn from '../assets/market-stall-tips-transparent.png'
import marketStallTipsArt from '../assets/MARKET STALL FLOW.png'
import addProductArt from '../assets/ADD PRODUCT EDIT.png'
import './StallEditorForm.css'

const MAX_PRODUCTS = 4

const emptyProduct = () => ({
  name: '',
  description: '',
  variation: '',
  condition: '',
  price: '',
  files: emptyProductFiles(),
})

function stripPound(value) {
  return String(value || '').replace(/£/g, '').trim()
}

export default function StallEditorForm({
  data,
  onDataChange,
  selfieFile,
  onSelfieChange,
  onSelfieClear,
  productSlots,
  onProductSlotsChange,
  onClearAll,
  onBannerError,
  showInlineFieldErrors = true,
}) {
  const [errors, setErrors] = useState({})
  const [productModal, setProductModal] = useState(null) // null | { index: number | null }
  const [draft, setDraft] = useState(emptyProduct)
  const [draftErrors, setDraftErrors] = useState({})
  const [selfieTipsOpen, setSelfieTipsOpen] = useState(false)
  const [marketStallTipsOpen, setMarketStallTipsOpen] = useState(false)
  const [showTipsScrollHint, setShowTipsScrollHint] = useState(true)
  const tipsDialogRef = useRef(null)
  const tipsModalOpen = selfieTipsOpen || marketStallTipsOpen

  const publishBanner = (field, message) => {
    onBannerError?.(message ? { message, field } : { message: '', field: field || '' })
  }

  const clearError = (key) => {
    setErrors((prev) => {
      const next = { ...prev, [key]: '' }
      const first = Object.entries(next).find(([, value]) => value)
      if (first) publishBanner(first[0], first[1])
      else publishBanner(key, '')
      return next
    })
  }

  const setError = (key, message) => {
    setErrors((prev) => ({ ...prev, [key]: message }))
    publishBanner(key, message)
  }

  const resetErrors = () => {
    setErrors({})
    publishBanner('', '')
  }

  const setBusinessName = (value) => onDataChange((prev) => ({ ...prev, business_name: value }))

  const setSellerField = (field, value) =>
    onDataChange((prev) => ({ ...prev, seller: { ...prev.seller, [field]: value } }))

  const setPitchField = (field, value) =>
    onDataChange((prev) => ({ ...prev, pitch: { ...prev.pitch, [field]: value } }))

  const handleCharLimit = (key, value, maxChars, apply) => {
    if (countChars(value) > maxChars) {
      setError(key, `Maximum ${maxChars} characters — must fit on the stall.`)
      return
    }
    clearError(key)
    apply(value)
  }

  const handleWordLimit = (key, value, maxWords, apply) => {
    if (countWords(value) > maxWords) {
      setError(key, `Maximum ${maxWords} words — must fit on the stall.`)
      return
    }
    clearError(key)
    apply(value)
  }

  const setDraftField = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }))

  const handleDraftCharLimit = (key, field, value, maxChars) => {
    if (countChars(value) > maxChars) {
      setDraftErrors((prev) => ({
        ...prev,
        [key]: `Maximum ${maxChars} characters — must fit on the stall.`,
      }))
      return
    }
    setDraftErrors((prev) => ({ ...prev, [key]: '' }))
    setDraftField(field, value)
  }

  const handleDraftWordLimit = (key, field, value, maxWords) => {
    if (countWords(value) > maxWords) {
      setDraftErrors((prev) => ({
        ...prev,
        [key]: `Maximum ${maxWords} words.`,
      }))
      return
    }
    setDraftErrors((prev) => ({ ...prev, [key]: '' }))
    setDraftField(field, value)
  }

  const openAddProduct = () => {
    if (productSlots.length >= MAX_PRODUCTS) return
    setDraft(emptyProduct())
    setDraftErrors({})
    setProductModal({ index: null })
  }

  const openEditProduct = (index) => {
    const product = productSlots[index]
    if (!product) return
    setDraft({
      name: (product.name || '').toUpperCase(),
      description: product.description || '',
      variation: product.variation || '',
      condition: product.condition || '',
      price: stripPound(product.price || ''),
      files: normalizeProductFiles(product),
    })
    setDraftErrors({})
    setProductModal({ index })
  }

  const closeProductModal = () => {
    setProductModal(null)
    setDraft(emptyProduct())
    setDraftErrors({})
  }

  const saveProductModal = () => {
    const nextErrors = {}
    if (!String(draft.name || '').trim()) {
      nextErrors.name = 'Enter a product name.'
    } else if (countChars(draft.name) > FIELD_LIMITS.productName.maxChars) {
      nextErrors.name = `Maximum ${FIELD_LIMITS.productName.maxChars} characters.`
    }
    if (countChars(draft.description) > FIELD_LIMITS.productDescription.maxChars) {
      nextErrors.description = `Maximum ${FIELD_LIMITS.productDescription.maxChars} letters.`
    }
    if (countChars(draft.variation) > FIELD_LIMITS.productVariation.maxChars) {
      nextErrors.variation = `Maximum ${FIELD_LIMITS.productVariation.maxChars} characters.`
    }
    if (countChars(draft.condition) > FIELD_LIMITS.productCondition.maxChars) {
      nextErrors.condition = `Maximum ${FIELD_LIMITS.productCondition.maxChars} characters.`
    }
    if (countChars(draft.price) > FIELD_LIMITS.productPrice.maxChars) {
      nextErrors.price = `Maximum ${FIELD_LIMITS.productPrice.maxChars} characters.`
    }
    if (Object.keys(nextErrors).length) {
      setDraftErrors(nextErrors)
      return
    }

    const nextProduct = {
      name: draft.name.trim().toUpperCase(),
      description: draft.description.trim(),
      variation: draft.variation.trim(),
      condition: draft.condition.trim(),
      price: stripPound(draft.price),
      files: normalizeProductFiles(draft),
    }

    if (productModal?.index == null) {
      onProductSlotsChange((prev) =>
        prev.length >= MAX_PRODUCTS ? prev : [...prev, nextProduct]
      )
    } else {
      const editIndex = productModal.index
      onProductSlotsChange((prev) =>
        prev.map((product, i) => (i === editIndex ? nextProduct : product))
      )
    }
    closeProductModal()
  }

  const removeProduct = (index) => onProductSlotsChange((prev) => prev.filter((_, i) => i !== index))

  const removeProductFromModal = () => {
    if (productModal?.index == null) return
    removeProduct(productModal.index)
    closeProductModal()
  }

  useEffect(() => {
    if (!productModal && !tipsModalOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      if (marketStallTipsOpen) setMarketStallTipsOpen(false)
      if (selfieTipsOpen) setSelfieTipsOpen(false)
      if (productModal) closeProductModal()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [productModal, tipsModalOpen, marketStallTipsOpen, selfieTipsOpen])

  useEffect(() => {
    if (!tipsModalOpen) return undefined
    setShowTipsScrollHint(true)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    let removeScrollListener = () => {}
    const frame = window.requestAnimationFrame(() => {
      const dialog = tipsDialogRef.current
      if (!dialog) return
      const hideHint = () => setShowTipsScrollHint(false)
      dialog.addEventListener('scroll', hideHint, { passive: true })
      removeScrollListener = () => dialog.removeEventListener('scroll', hideHint)
    })

    return () => {
      document.body.style.overflow = previousOverflow
      window.cancelAnimationFrame(frame)
      removeScrollListener()
    }
  }, [tipsModalOpen])

  const aboutChars = countChars(data.seller.about)
  const ambitionChars = countChars(data.seller.ambition)
  const isEditingProduct = productModal?.index != null

  return (
    <form className="stall-form" onSubmit={(e) => e.preventDefault()}>
      <div className="stall-form__toolbar">
        <button
          type="button"
          onClick={() => {
            resetErrors()
            onClearAll()
          }}
          aria-label="Clear all"
        >
          Clear all
        </button>
      </div>

      <fieldset className="stall-form__section" data-section="trading-name">
        <legend>Business</legend>
        <label
          className={`stall-form__field stall-form__field--business-name${errors.businessName ? ' stall-form__field--error' : ''}`}
          data-error-field="businessName"
        >
          <span>
            Business name ({countChars(data.business_name)}/{FIELD_LIMITS.businessName.maxChars})
          </span>
          <input
            type="text"
            value={data.business_name}
            maxLength={FIELD_LIMITS.businessName.maxChars}
            onChange={(e) =>
              handleCharLimit(
                'businessName',
                e.target.value,
                FIELD_LIMITS.businessName.maxChars,
                setBusinessName
              )
            }
            placeholder="e.g. Jo's Preserves"
            aria-invalid={Boolean(errors.businessName)}
            aria-label="Business name"
          />
          {showInlineFieldErrors && errors.businessName && (
            <span className="stall-form__error" role="alert">
              {errors.businessName}
            </span>
          )}
        </label>
      </fieldset>

      <fieldset className="stall-form__section" data-section="about-you">
        <legend>About you</legend>
        <label
          className={`stall-form__field stall-form__field--seller-name${errors.sellerName ? ' stall-form__field--error' : ''}`}
        >
          <span>
            Your name ({countChars(data.seller.name)}/{FIELD_LIMITS.sellerName.maxChars})
          </span>
          <input
            type="text"
            value={data.seller.name}
            maxLength={FIELD_LIMITS.sellerName.maxChars}
            onChange={(e) =>
              handleCharLimit('sellerName', e.target.value, FIELD_LIMITS.sellerName.maxChars, (v) =>
                setSellerField('name', v)
              )
            }
            placeholder="e.g. Jo Smith"
            aria-invalid={Boolean(errors.sellerName)}
            aria-label="Your name"
          />
          {showInlineFieldErrors && errors.sellerName && (
            <span className="stall-form__error" role="alert">
              {errors.sellerName}
            </span>
          )}
        </label>

        <ImageUploadField
          className="image-upload-field--selfie"
          label="Selfie / photo"
          value={selfieFile}
          onChange={(file) => {
            onSelfieChange(file)
            publishBanner('selfie', '')
          }}
          onClear={() => {
            onSelfieClear()
            publishBanner('selfie', '')
          }}
          onError={({ message, field }) => publishBanner(field || 'selfie', message)}
          showInlineError={showInlineFieldErrors}
          errorField="selfie"
          removeBg
        />

        <div className="stall-form__selfie-tips-cover" aria-hidden="true" />

        <button
          type="button"
          className="stall-form__selfie-tips"
          onClick={() => {
            setShowTipsScrollHint(true)
            setSelfieTipsOpen(true)
          }}
          aria-label="Selfie tips"
        >
          <img src={selfieTipsBtn} alt="" draggable={false} />
        </button>

        <button
          type="button"
          className="stall-form__market-stall-tips"
          onClick={() => {
            setShowTipsScrollHint(true)
            setMarketStallTipsOpen(true)
          }}
          aria-label="Market stall tips"
        >
          <img
            src={marketStallTipsBtn}
            alt=""
            draggable={false}
          />
        </button>

        <label
          className={`stall-form__field stall-form__field--about stall-form__field--compact${errors.about ? ' stall-form__field--error' : ''}`}
        >
          <span>
            About you ({aboutChars}/{FIELD_LIMITS.about.maxChars} letters)
          </span>
          <textarea
            rows={1}
            value={data.seller.about}
            maxLength={FIELD_LIMITS.about.maxChars}
            onChange={(e) =>
              handleCharLimit('about', e.target.value, FIELD_LIMITS.about.maxChars, (v) =>
                setSellerField('about', v)
              )
            }
            placeholder="e.g. I make small-batch preserves from my garden"
            aria-invalid={Boolean(errors.about)}
            aria-label="About you"
          />
          {showInlineFieldErrors && errors.about && (
            <span className="stall-form__error" role="alert">
              {errors.about}
            </span>
          )}
        </label>

        <label
          className={`stall-form__field stall-form__field--ambition stall-form__field--compact${errors.ambition ? ' stall-form__field--error' : ''}`}
        >
          <span>
            Ambition ({ambitionChars}/{FIELD_LIMITS.ambition.maxChars} letters)
          </span>
          <textarea
            rows={1}
            value={data.seller.ambition}
            maxLength={FIELD_LIMITS.ambition.maxChars}
            onChange={(e) =>
              handleCharLimit('ambition', e.target.value, FIELD_LIMITS.ambition.maxChars, (v) =>
                setSellerField('ambition', v)
              )
            }
            placeholder="e.g. Grow a loyal local following"
            aria-invalid={Boolean(errors.ambition)}
            aria-label="Ambition"
          />
          {showInlineFieldErrors && errors.ambition && (
            <span className="stall-form__error" role="alert">
              {errors.ambition}
            </span>
          )}
        </label>
      </fieldset>

      <fieldset className="stall-form__section" data-section="stall-info">
        <legend>Stall info</legend>
        <div className="stall-form__grid stall-form__grid--pitch">
          <label
            className={`stall-form__field stall-form__field--pitch-number${errors.pitchNumber ? ' stall-form__field--error' : ''}`}
          >
            <span>Pitch number (assigned automatically)</span>
            <input
              type="text"
              value={data.pitch.number}
              readOnly
              placeholder="Assigned automatically"
              aria-label="Pitch number"
              title="Assigned automatically when you join"
            />
          </label>
          <label
            className={`stall-form__field stall-form__field--pitch-location${errors.pitchLocation ? ' stall-form__field--error' : ''}`}
          >
            <span>
              Location ({countChars(data.pitch.location)}/{FIELD_LIMITS.pitchLocation.maxChars})
            </span>
            <input
              type="text"
              value={data.pitch.location}
              maxLength={FIELD_LIMITS.pitchLocation.maxChars}
              onChange={(e) =>
                handleCharLimit(
                  'pitchLocation',
                  e.target.value,
                  FIELD_LIMITS.pitchLocation.maxChars,
                  (v) => setPitchField('location', v)
                )
              }
              placeholder="e.g. Birmingham, UK"
              aria-invalid={Boolean(errors.pitchLocation)}
              aria-label="Location"
            />
            {showInlineFieldErrors && errors.pitchLocation && (
              <span className="stall-form__error" role="alert">
                {errors.pitchLocation}
              </span>
            )}
          </label>
          <label
            className={`stall-form__field stall-form__field--member-since${errors.memberSince ? ' stall-form__field--error' : ''}`}
          >
            <span>
              Member since ({countChars(data.pitch.member_since)}/{FIELD_LIMITS.memberSince.maxChars})
            </span>
            <input
              type="text"
              value={data.pitch.member_since}
              maxLength={FIELD_LIMITS.memberSince.maxChars}
              onChange={(e) =>
                handleCharLimit('memberSince', e.target.value, FIELD_LIMITS.memberSince.maxChars, (v) =>
                  setPitchField('member_since', v)
                )
              }
              placeholder="e.g. 21-5-2020"
              aria-invalid={Boolean(errors.memberSince)}
              aria-label="Member since day-month-year"
            />
            {showInlineFieldErrors && errors.memberSince && (
              <span className="stall-form__error" role="alert">
                {errors.memberSince}
              </span>
            )}
          </label>
          <label className="stall-form__field stall-form__field--rating">
            <span>Rating (0-5)</span>
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={data.pitch.rating || ''}
              onChange={(e) =>
                setPitchField('rating', e.target.value === '' ? 0 : Number(e.target.value))
              }
              placeholder="e.g. 4.8"
              aria-label="Rating"
            />
          </label>
          <label className="stall-form__field stall-form__field--review-count">
            <span>Review count</span>
            <input
              type="number"
              min={0}
              step={1}
              value={data.pitch.review_count || ''}
              onChange={(e) =>
                setPitchField('review_count', e.target.value === '' ? 0 : Number(e.target.value))
              }
              placeholder="e.g. 27"
              aria-label="Review count"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="stall-form__section" data-section="products">
        <legend>Products ({productSlots.length}/{MAX_PRODUCTS})</legend>
        {productSlots.length === 0 && (
          <p className="stall-form__empty-note stall-form__empty-note--products">
            No products yet — add up to {MAX_PRODUCTS}.
          </p>
        )}
        <div className="stall-form__products-list">
          {productSlots.map((product, index) => (
            <div className="stall-form__product-chip" key={index}>
              <strong className="stall-form__product-chip-name">
                {product.name || `Product ${index + 1}`}
              </strong>
              <button
                type="button"
                className="stall-form__product-chip-edit"
                onClick={() => openEditProduct(index)}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
        {productSlots.length < MAX_PRODUCTS && (
          <button
            type="button"
            className="stall-form__add-btn"
            onClick={openAddProduct}
            aria-label="Add product"
          >
            + Add product
          </button>
        )}
      </fieldset>

      {productModal &&
        createPortal(
          <div
            className="stall-product-modal"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeProductModal()
            }}
          >
            <div
              className="stall-product-modal__dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="stall-product-modal-title"
            >
              <h2 id="stall-product-modal-title" className="stall-product-modal__sr">
                {isEditingProduct
                  ? `Edit product ${(productModal.index ?? 0) + 1}`
                  : 'Add product'}
              </h2>

              <button
                type="button"
                className="stall-product-modal__close"
                onClick={closeProductModal}
                aria-label="Close"
              >
                ×
              </button>

              {isEditingProduct ? (
                <button
                  type="button"
                  className="stall-product-modal__remove"
                  onClick={removeProductFromModal}
                >
                  Remove
                </button>
              ) : null}

              <div className="stall-product-modal__stage">
                <img
                  className="stall-product-modal__art"
                  src={addProductArt}
                  alt=""
                  draggable={false}
                />

                <div className="stall-product-modal__fields">
                  <label className="stall-product-modal__sr" htmlFor="stall-product-name">
                    Product name
                  </label>
                  <input
                    id="stall-product-name"
                    className={`stall-product-modal__input stall-product-modal__input--name${draftErrors.name ? ' is-error' : ''}`}
                    type="text"
                    value={draft.name}
                    maxLength={FIELD_LIMITS.productName.maxChars}
                    onChange={(e) =>
                      handleDraftCharLimit(
                        'name',
                        'name',
                        e.target.value.toUpperCase(),
                        FIELD_LIMITS.productName.maxChars
                      )
                    }
                    placeholder=""
                    aria-invalid={Boolean(draftErrors.name)}
                    autoFocus
                  />

                  <label className="stall-product-modal__sr" htmlFor="stall-product-price">
                    Price
                  </label>
                  <input
                    id="stall-product-price"
                    className={`stall-product-modal__input stall-product-modal__input--price${draftErrors.price ? ' is-error' : ''}`}
                    type="text"
                    inputMode="decimal"
                    value={stripPound(draft.price)}
                    maxLength={FIELD_LIMITS.productPrice.maxChars}
                    onChange={(e) =>
                      handleDraftCharLimit(
                        'price',
                        'price',
                        stripPound(e.target.value),
                        FIELD_LIMITS.productPrice.maxChars
                      )
                    }
                    placeholder=""
                    aria-invalid={Boolean(draftErrors.price)}
                  />

                  <label className="stall-product-modal__sr" htmlFor="stall-product-size">
                    Size
                  </label>
                  <input
                    id="stall-product-size"
                    className={`stall-product-modal__input stall-product-modal__input--size${draftErrors.variation ? ' is-error' : ''}`}
                    type="text"
                    value={draft.variation}
                    maxLength={FIELD_LIMITS.productVariation.maxChars}
                    onChange={(e) =>
                      handleDraftCharLimit(
                        'variation',
                        'variation',
                        e.target.value,
                        FIELD_LIMITS.productVariation.maxChars
                      )
                    }
                    placeholder="Size"
                    aria-invalid={Boolean(draftErrors.variation)}
                  />

                  <label className="stall-product-modal__sr" htmlFor="stall-product-condition">
                    Condition
                  </label>
                  <span className="stall-product-modal__size-divider" aria-hidden="true" />
                  <input
                    id="stall-product-condition"
                    className={`stall-product-modal__input stall-product-modal__input--condition${draftErrors.condition ? ' is-error' : ''}`}
                    type="text"
                    value={draft.condition}
                    maxLength={FIELD_LIMITS.productCondition.maxChars}
                    onChange={(e) =>
                      handleDraftCharLimit(
                        'condition',
                        'condition',
                        e.target.value,
                        FIELD_LIMITS.productCondition.maxChars
                      )
                    }
                    placeholder="Condition"
                    aria-invalid={Boolean(draftErrors.condition)}
                  />

                  <label className="stall-product-modal__sr" htmlFor="stall-product-desc">
                    Description
                  </label>
                  <textarea
                    id="stall-product-desc"
                    className={`stall-product-modal__input stall-product-modal__input--desc${draftErrors.description ? ' is-error' : ''}`}
                    value={draft.description}
                    maxLength={FIELD_LIMITS.productDescription.maxChars}
                    onChange={(e) =>
                      handleDraftCharLimit(
                        'description',
                        'description',
                        e.target.value,
                        FIELD_LIMITS.productDescription.maxChars
                      )
                    }
                    placeholder=""
                    aria-invalid={Boolean(draftErrors.description)}
                  />

                  <ProductImageSlots
                    files={draft.files}
                    onChange={(files) => setDraftField('files', normalizeProductFiles({ files }))}
                    removeBg
                    variant="overlay"
                  />

                  {(draftErrors.name ||
                    draftErrors.price ||
                    draftErrors.variation ||
                    draftErrors.description) && (
                    <p className="stall-product-modal__error" role="alert">
                      {draftErrors.name ||
                        draftErrors.price ||
                        draftErrors.variation ||
                        draftErrors.description}
                    </p>
                  )}

                  <button
                    type="button"
                    className="stall-product-modal__save"
                    onClick={saveProductModal}
                    aria-label={isEditingProduct ? 'Save changes' : 'Save product'}
                  />
                </div>
              </div>
            </div>
          </div>,
          document.getElementById('vibe-mart-root') ||
            document.getElementById('stall-root') ||
            document.body
        )}

      {tipsModalOpen &&
        createPortal(
          <div
            className="stall-tips-modal"
            role="presentation"
            onClick={() => {
              setSelfieTipsOpen(false)
              setMarketStallTipsOpen(false)
            }}
          >
            <div
              className="stall-tips-modal__shell"
              role="dialog"
              aria-modal="true"
              aria-label={marketStallTipsOpen ? 'Market stall tips' : 'Selfie tips'}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="stall-tips-modal__close"
                onClick={() => {
                  setSelfieTipsOpen(false)
                  setMarketStallTipsOpen(false)
                }}
                aria-label={
                  marketStallTipsOpen ? 'Close market stall tips' : 'Close selfie tips'
                }
              >
                ×
              </button>
              <div ref={tipsDialogRef} className="stall-tips-modal__dialog">
                <img
                  className="stall-tips-modal__img"
                  src={marketStallTipsOpen ? marketStallTipsArt : selfieTipsArt}
                  alt={
                    marketStallTipsOpen
                      ? 'Create your first market stall — follow these 7 easy steps'
                      : 'How do I take a full length selfie?'
                  }
                  draggable={false}
                />
              </div>
              {showTipsScrollHint && (
                <div className="stall-tips-modal__scroll-hint" aria-hidden="true">
                  <div className="stall-tips-modal__scroll-arrow">
                    <svg viewBox="0 0 48 48" width="36" height="36" fill="none" aria-hidden="true">
                      <path
                        d="M24 8v26"
                        stroke="#ffe566"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      <path
                        d="M12 26l12 12 12-12"
                        stroke="#ffe566"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="stall-tips-modal__scroll-label">Swipe down</span>
                </div>
              )}
            </div>
          </div>,
          document.getElementById('vibe-mart-root') ||
            document.getElementById('stall-root') ||
            document.body
        )}
    </form>
  )
}
