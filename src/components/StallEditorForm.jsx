import ImageUploadField from './ImageUploadField';
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
  onLoadSample,
  onClearAll,
}) {
  const setBusinessName = (value) => onDataChange((prev) => ({ ...prev, business_name: value }));

  const setSellerField = (field, value) =>
    onDataChange((prev) => ({ ...prev, seller: { ...prev.seller, [field]: value } }));

  const setPitchField = (field, value) =>
    onDataChange((prev) => ({ ...prev, pitch: { ...prev.pitch, [field]: value } }));

  const updateProduct = (index, field, value) =>
    onProductSlotsChange((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));

  const addProduct = () =>
    onProductSlotsChange((prev) =>
      prev.length >= MAX_PRODUCTS ? prev : [...prev, { name: '', description: '', price: '', file: null }]
    );

  const removeProduct = (index) => onProductSlotsChange((prev) => prev.filter((_, i) => i !== index));

  return (
    <form className="stall-form" onSubmit={(e) => e.preventDefault()}>
      <div className="stall-form__toolbar">
        <button type="button" onClick={onLoadSample}>
          Load sample data
        </button>
        <button type="button" onClick={onClearAll}>
          Clear all (test empty state)
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
            placeholder="e.g. Marigold & Vine Preserves"
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

        <label className="stall-form__field">
          <span>About you (~2-3 sentences)</span>
          <textarea
            rows={3}
            value={data.seller.about}
            onChange={(e) => setSellerField('about', e.target.value)}
          />
        </label>

        <label className="stall-form__field">
          <span>Ambition (~2-3 sentences)</span>
          <textarea
            rows={3}
            value={data.seller.ambition}
            onChange={(e) => setSellerField('ambition', e.target.value)}
          />
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
