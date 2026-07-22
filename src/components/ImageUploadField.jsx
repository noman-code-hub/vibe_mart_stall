import { useState } from 'react';
import { useFileUrl } from '../hooks/useImageAsset';
import { removeBackground, blobToPngFile } from '../api/removeBackground';
import './ImageUploadField.css';

/**
 * A labeled file input with a thumbnail preview and a remove button.
 * When `removeBg` is true, the file is sent through POST /api/remove-background
 * before onChange fires, so the stall canvas receives a transparent PNG.
 */
export default function ImageUploadField({
  label,
  hint,
  value,
  onChange,
  onClear,
  removeBg = false,
}) {
  const previewUrl = useFileUrl(value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError(null);

    if (!removeBg) {
      onChange(file);
      return;
    }

    setLoading(true);
    try {
      const blob = await removeBackground(file);
      onChange(blobToPngFile(blob, file.name || 'image'));
    } catch (err) {
      setError(err.message || 'Background removal failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`image-upload-field${loading ? ' image-upload-field--loading' : ''}`}>
      <div className="image-upload-field__thumb">
        {loading ? (
          <span className="image-upload-field__spinner" aria-hidden="true" />
        ) : previewUrl ? (
          <img src={previewUrl} alt={label} />
        ) : (
          <span className="image-upload-field__placeholder">No image</span>
        )}
      </div>
      <div className="image-upload-field__controls">
        <span className="image-upload-field__label">{label}</span>
        {hint && <span className="image-upload-field__hint">{hint}</span>}
        {error && (
          <span className="image-upload-field__error" role="alert">
            {error}
          </span>
        )}
        {loading && (
          <span className="image-upload-field__hint" aria-live="polite">
            Removing background…
          </span>
        )}
        <div className="image-upload-field__buttons">
          <label className={`image-upload-field__upload-btn${loading ? ' is-disabled' : ''}`}>
            {loading ? 'Processing…' : 'Upload'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={handleFileChange}
              disabled={loading}
              hidden
            />
          </label>
          {previewUrl && !loading && (
            <button type="button" className="image-upload-field__clear-btn" onClick={onClear}>
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
