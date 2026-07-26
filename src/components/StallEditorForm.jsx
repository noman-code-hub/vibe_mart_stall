import { useState } from 'react';
import ImageUploadField from './ImageUploadField';
import { FIELD_LIMITS, countWords, countChars } from '../data/fieldLimits';
import './StallEditorForm.css';

const MAX_PRODUCTS = 4;

export default function StallEditorForm({
  data,
  onDataChange,
  selfieFile,
  onSelfieChange,
  onSelfieClear,
  productSlots,
  onProductSlotsChange,
  onClearAll,
}) {
  const [errors, setErrors] = useState({});

  const clearError = (key) => setErrors((prev) => ({ ...prev, [key]: '' }));

  const setError = (key, message) => setErrors((prev) => ({ ...prev, [key]: message }));

  const resetErrors = () => setErrors({});

  const setBusinessName = (value) => onDataChange((prev) => ({ ...prev, business_name: value }));

  const setSellerField = (field, value) =>
    onDataChange((prev) => ({ ...prev, seller: { ...prev.seller, [field]: value } }));

  const setPitchField = (field, value) =>
    onDataChange((prev) => ({ ...prev, pitch: { ...prev.pitch, [field]: value } }));

  const handleCharLimit = (key, value, maxChars, apply) => {
    if (countChars(value) > maxChars) {
      setError(key, `Maximum ${maxChars} characters — must fit on the stall.`);
      return;
    }
    clearError(key);
    apply(value);
  };

  const handleWordLimit = (key, value, maxWords, apply) => {
    if (countWords(value) > maxWords) {
      setError(key, `Maximum ${maxWords} words — must fit on the stall.`);
      return;
    }
    clearError(key);
    apply(value);
  };

  const updateProduct = (index, field, value) =>
    onProductSlotsChange((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));

  const handleProductCharLimit = (index, field, key, value, maxChars) => {
    if (countChars(value) > maxChars) {
      setError(key, `Maximum ${maxChars} characters — must fit on the stall.`);
      return;
    }
    clearError(key);
    updateProduct(index, field, value);
  };

  const addProduct = () =>
    onProductSlotsChange((prev) =>
      prev.length >= MAX_PRODUCTS ? prev : [...prev, { name: '', description: '', price: '', file: null }]
    );

  const removeProduct = (index) => onProductSlotsChange((prev) => prev.filter((_, i) => i !== index));

  const aboutWords = countWords(data.seller.about);
  const ambitionWords = countWords(data.seller.ambition);

  return (
    <form className="stall-form" onSubmit={(e) => e.preventDefault()}>
      <div className="stall-form__toolbar">
        <button
          type="button"
          onClick={() => {
            resetErrors();
            onClearAll();
          }}
        >
          Clear all
        </button>
      </div>

      <fieldset className="stall-form__section">
        <legend>Business</legend>
        <label className={`stall-form__field${errors.businessName ? ' stall-form__field--error' : ''}`}>
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
            placeholder="Your business name"
            aria-invalid={Boolean(errors.businessName)}
          />
          {errors.businessName && (
            <span className="stall-form__error" role="alert">
              {errors.businessName}
            </span>
          )}
        </label>
      </fieldset>

      <fieldset className="stall-form__section">
        <legend>About you</legend>
        <label className={`stall-form__field${errors.sellerName ? ' stall-form__field--error' : ''}`}>
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
            aria-invalid={Boolean(errors.sellerName)}
          />
          {errors.sellerName && (
            <span className="stall-form__error" role="alert">
              {errors.sellerName}
            </span>
          )}
        </label>

        <ImageUploadField
          label="Selfie / photo"
          value={selfieFile}
          onChange={onSelfieChange}
          onClear={onSelfieClear}
          removeBg
        />

        <label className={`stall-form__field stall-form__field--compact${errors.about ? ' stall-form__field--error' : ''}`}>
          <span>
            About you ({aboutWords}/{FIELD_LIMITS.about.maxWords} words)
          </span>
          <textarea
            rows={2}
            value={data.seller.about}
            onChange={(e) =>
              handleWordLimit('about', e.target.value, FIELD_LIMITS.about.maxWords, (v) =>
                setSellerField('about', v)
              )
            }
            aria-invalid={Boolean(errors.about)}
          />
          {errors.about && (
            <span className="stall-form__error" role="alert">
              {errors.about}
            </span>
          )}
        </label>

        <label
          className={`stall-form__field stall-form__field--compact${errors.ambition ? ' stall-form__field--error' : ''}`}
        >
          <span>
            Ambition ({ambitionWords}/{FIELD_LIMITS.ambition.maxWords} words)
          </span>
          <textarea
            rows={2}
            value={data.seller.ambition}
            onChange={(e) =>
              handleWordLimit('ambition', e.target.value, FIELD_LIMITS.ambition.maxWords, (v) =>
                setSellerField('ambition', v)
              )
            }
            aria-invalid={Boolean(errors.ambition)}
          />
          {errors.ambition && (
            <span className="stall-form__error" role="alert">
              {errors.ambition}
            </span>
          )}
        </label>
      </fieldset>

      <fieldset className="stall-form__section">
        <legend>Stall info</legend>
        <div className="stall-form__grid">
          <label className={`stall-form__field${errors.pitchNumber ? ' stall-form__field--error' : ''}`}>
            <span>
              Pitch number ({countChars(data.pitch.number)}/{FIELD_LIMITS.pitchNumber.maxChars})
            </span>
            <input
              type="text"
              value={data.pitch.number}
              maxLength={FIELD_LIMITS.pitchNumber.maxChars}
              onChange={(e) =>
                handleCharLimit('pitchNumber', e.target.value, FIELD_LIMITS.pitchNumber.maxChars, (v) =>
                  setPitchField('number', v)
                )
              }
              placeholder="e.g. VM 2026 A"
              aria-invalid={Boolean(errors.pitchNumber)}
            />
            {errors.pitchNumber && (
              <span className="stall-form__error" role="alert">
                {errors.pitchNumber}
              </span>
            )}
          </label>
          <label className={`stall-form__field${errors.pitchLocation ? ' stall-form__field--error' : ''}`}>
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
              aria-invalid={Boolean(errors.pitchLocation)}
            />
            {errors.pitchLocation && (
              <span className="stall-form__error" role="alert">
                {errors.pitchLocation}
              </span>
            )}
          </label>
          <label className={`stall-form__field${errors.memberSince ? ' stall-form__field--error' : ''}`}>
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
              placeholder="e.g. May 2024"
              aria-invalid={Boolean(errors.memberSince)}
            />
            {errors.memberSince && (
              <span className="stall-form__error" role="alert">
                {errors.memberSince}
              </span>
            )}
          </label>
          <label className="stall-form__field">
            <span>Rating (0-5)</span>
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={data.pitch.rating}
              onChange={(e) => setPitchField('rating', Number(e.target.value))}
            />
          </label>
          <label className="stall-form__field">
            <span>Review count</span>
            <input
              type="number"
              min={0}
              step={1}
              value={data.pitch.review_count}
              onChange={(e) => setPitchField('review_count', Number(e.target.value))}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="stall-form__section">
        <legend>Products ({productSlots.length}/{MAX_PRODUCTS})</legend>
        {productSlots.length === 0 && (
          <p className="stall-form__empty-note">No products yet — add up to {MAX_PRODUCTS}.</p>
        )}
        {productSlots.map((product, index) => {
          const nameKey = `productName-${index}`;
          const priceKey = `productPrice-${index}`;
          const descKey = `productDesc-${index}`;
          return (
            <div className="stall-form__product" key={index}>
              <div className="stall-form__product-header">
                <span>Product {index + 1}</span>
                <button type="button" onClick={() => removeProduct(index)}>
                  Remove
                </button>
              </div>
              <div className="stall-form__grid">
                <label className={`stall-form__field${errors[nameKey] ? ' stall-form__field--error' : ''}`}>
                  <span>
                    Name ({countChars(product.name)}/{FIELD_LIMITS.productName.maxChars})
                  </span>
                  <input
                    type="text"
                    value={product.name}
                    maxLength={FIELD_LIMITS.productName.maxChars}
                    onChange={(e) =>
                      handleProductCharLimit(
                        index,
                        'name',
                        nameKey,
                        e.target.value,
                        FIELD_LIMITS.productName.maxChars
                      )
                    }
                    aria-invalid={Boolean(errors[nameKey])}
                  />
                  {errors[nameKey] && (
                    <span className="stall-form__error" role="alert">
                      {errors[nameKey]}
                    </span>
                  )}
                </label>
                <label className={`stall-form__field${errors[priceKey] ? ' stall-form__field--error' : ''}`}>
                  <span>
                    Price ({countChars(product.price)}/{FIELD_LIMITS.productPrice.maxChars})
                  </span>
                  <input
                    type="text"
                    value={product.price}
                    maxLength={FIELD_LIMITS.productPrice.maxChars}
                    onChange={(e) =>
                      handleProductCharLimit(
                        index,
                        'price',
                        priceKey,
                        e.target.value,
                        FIELD_LIMITS.productPrice.maxChars
                      )
                    }
                    placeholder="e.g. £6.50"
                    aria-invalid={Boolean(errors[priceKey])}
                  />
                  {errors[priceKey] && (
                    <span className="stall-form__error" role="alert">
                      {errors[priceKey]}
                    </span>
                  )}
                </label>
                <label className={`stall-form__field${errors[descKey] ? ' stall-form__field--error' : ''}`}>
                  <span>
                    Description / variant ({countChars(product.description)}/
                    {FIELD_LIMITS.productDescription.maxChars})
                  </span>
                  <input
                    type="text"
                    value={product.description}
                    maxLength={FIELD_LIMITS.productDescription.maxChars}
                    onChange={(e) =>
                      handleProductCharLimit(
                        index,
                        'description',
                        descKey,
                        e.target.value,
                        FIELD_LIMITS.productDescription.maxChars
                      )
                    }
                    placeholder="e.g. 340g jar"
                    aria-invalid={Boolean(errors[descKey])}
                  />
                  {errors[descKey] && (
                    <span className="stall-form__error" role="alert">
                      {errors[descKey]}
                    </span>
                  )}
                </label>
              </div>
              <ImageUploadField
                label="Product photo"
                value={product.file}
                onChange={(file) => updateProduct(index, 'file', file)}
                onClear={() => updateProduct(index, 'file', null)}
                removeBg
              />
            </div>
          );
        })}
        {productSlots.length < MAX_PRODUCTS && (
          <button type="button" className="stall-form__add-btn" onClick={addProduct}>
            + Add product
          </button>
        )}
      </fieldset>
    </form>
  );
}
