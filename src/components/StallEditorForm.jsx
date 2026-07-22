import { useState } from 'react';
import ImageUploadField from './ImageUploadField';
import './StallEditorForm.css';

const MAX_PRODUCTS = 4;
/** Matches sample copy that fits the stall panels */
const MAX_ABOUT_WORDS = 27;
const MAX_AMBITION_WORDS = 26;

function countWords(text) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
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
}) {
  const [aboutError, setAboutError] = useState('');
  const [ambitionError, setAmbitionError] = useState('');

  const setBusinessName = (value) => onDataChange((prev) => ({ ...prev, business_name: value }));

  const setSellerField = (field, value) =>
    onDataChange((prev) => ({ ...prev, seller: { ...prev.seller, [field]: value } }));

  const setPitchField = (field, value) =>
    onDataChange((prev) => ({ ...prev, pitch: { ...prev.pitch, [field]: value } }));

  const handleLimitedSellerText = (field, value, maxWords, setError) => {
    if (countWords(value) > maxWords) {
      setError(`Maximum ${maxWords} words — this text must fit on the stall.`);
      return;
    }
    setError('');
    setSellerField(field, value);
  };

  const updateProduct = (index, field, value) =>
    onProductSlotsChange((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));

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
            setAboutError('');
            setAmbitionError('');
            onClearAll();
          }}
        >
          Clear all
        </button>
      </div>

      <fieldset className="stall-form__section">
        <legend>Business</legend>
        <label className="stall-form__field">
          <span>Business name</span>
          <input
            type="text"
            value={data.business_name}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Your business name"
          />
        </label>
      </fieldset>

      <fieldset className="stall-form__section">
        <legend>About you</legend>
        <label className="stall-form__field">
          <span>Your name</span>
          <input
            type="text"
            value={data.seller.name}
            onChange={(e) => setSellerField('name', e.target.value)}
          />
        </label>

        <ImageUploadField
          label="Selfie / photo"
          hint="Background is removed automatically via remove.bg when you upload"
          value={selfieFile}
          onChange={onSelfieChange}
          onClear={onSelfieClear}
          removeBg
        />

        <label className={`stall-form__field${aboutError ? ' stall-form__field--error' : ''}`}>
          <span>
            About you ({aboutWords}/{MAX_ABOUT_WORDS} words)
          </span>
          <textarea
            rows={3}
            value={data.seller.about}
            onChange={(e) =>
              handleLimitedSellerText('about', e.target.value, MAX_ABOUT_WORDS, setAboutError)
            }
            aria-invalid={Boolean(aboutError)}
            aria-describedby={aboutError ? 'about-limit-error' : undefined}
          />
          {aboutError && (
            <span id="about-limit-error" className="stall-form__error" role="alert">
              {aboutError}
            </span>
          )}
        </label>

        <label className={`stall-form__field${ambitionError ? ' stall-form__field--error' : ''}`}>
          <span>
            Ambition ({ambitionWords}/{MAX_AMBITION_WORDS} words)
          </span>
          <textarea
            rows={3}
            value={data.seller.ambition}
            onChange={(e) =>
              handleLimitedSellerText('ambition', e.target.value, MAX_AMBITION_WORDS, setAmbitionError)
            }
            aria-invalid={Boolean(ambitionError)}
            aria-describedby={ambitionError ? 'ambition-limit-error' : undefined}
          />
          {ambitionError && (
            <span id="ambition-limit-error" className="stall-form__error" role="alert">
              {ambitionError}
            </span>
          )}
        </label>
      </fieldset>

      <fieldset className="stall-form__section">
        <legend>Stall info</legend>
        <div className="stall-form__grid">
          <label className="stall-form__field">
            <span>Pitch number</span>
            <input
              type="text"
              value={data.pitch.number}
              onChange={(e) => setPitchField('number', e.target.value)}
              placeholder="e.g. VM 2026 A"
            />
          </label>
          <label className="stall-form__field">
            <span>Location</span>
            <input
              type="text"
              value={data.pitch.location}
              onChange={(e) => setPitchField('location', e.target.value)}
            />
          </label>
          <label className="stall-form__field">
            <span>Member since</span>
            <input
              type="text"
              value={data.pitch.member_since}
              onChange={(e) => setPitchField('member_since', e.target.value)}
              placeholder="e.g. May 2024"
            />
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
        {productSlots.map((product, index) => (
          <div className="stall-form__product" key={index}>
            <div className="stall-form__product-header">
              <span>Product {index + 1}</span>
              <button type="button" onClick={() => removeProduct(index)}>
                Remove
              </button>
            </div>
            <div className="stall-form__grid">
              <label className="stall-form__field">
                <span>Name</span>
                <input
                  type="text"
                  value={product.name}
                  onChange={(e) => updateProduct(index, 'name', e.target.value)}
                />
              </label>
              <label className="stall-form__field">
                <span>Price</span>
                <input
                  type="text"
                  value={product.price}
                  onChange={(e) => updateProduct(index, 'price', e.target.value)}
                  placeholder="e.g. £6.50"
                />
              </label>
              <label className="stall-form__field">
                <span>Description / variant</span>
                <input
                  type="text"
                  value={product.description}
                  onChange={(e) => updateProduct(index, 'description', e.target.value)}
                  placeholder="e.g. Size 9, 340g jar"
                />
              </label>
            </div>
            <ImageUploadField
              label="Product photo"
              hint="Background is removed automatically via remove.bg when you upload"
              value={product.file}
              onChange={(file) => updateProduct(index, 'file', file)}
              onClear={() => updateProduct(index, 'file', null)}
              removeBg
            />
          </div>
        ))}
        {productSlots.length < MAX_PRODUCTS && (
          <button type="button" className="stall-form__add-btn" onClick={addProduct}>
            + Add product
          </button>
        )}
      </fieldset>
    </form>
  );
}
