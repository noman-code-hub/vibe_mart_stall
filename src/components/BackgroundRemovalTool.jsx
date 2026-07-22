import { useEffect, useId, useRef, useState } from 'react';
import { removeBackground, blobToPngFile } from '../api/removeBackground';
import './BackgroundRemovalTool.css';

/**
 * Reusable remove.bg test/tools panel:
 * pick image → POST /api/remove-background → preview + download.
 * Does not replace stall uploads; use "Use on stall selfie" to push
 * the cutout into the editor when that callback is provided.
 */
export default function BackgroundRemovalTool({ onApplyToSelfie }) {
  const inputId = useId();
  const objectUrlRef = useRef(null);
  const [sourceFile, setSourceFile] = useState(null);
  const [sourcePreview, setSourcePreview] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [resultBlob, setResultBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const revokeResultUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  useEffect(() => () => revokeResultUrl(), []);

  const handleSelect = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError(null);
    setSourceFile(file);
    setSourcePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    revokeResultUrl();
    setResultUrl(null);
    setResultBlob(null);
  };

  const handleRemoveBackground = async () => {
    if (!sourceFile || loading) return;
    setLoading(true);
    setError(null);

    try {
      const blob = await removeBackground(sourceFile);
      revokeResultUrl();
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setResultBlob(blob);
      setResultUrl(url);
    } catch (err) {
      setError(err.message || 'Background removal failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const link = document.createElement('a');
    link.href = resultUrl;
    link.download = blobToPngFile(resultBlob || new Blob(), sourceFile?.name || 'cutout').name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleApplySelfie = () => {
    if (!resultBlob || !onApplyToSelfie) return;
    const file = blobToPngFile(resultBlob, sourceFile?.name || 'selfie');
    onApplyToSelfie(file);
  };

  const handleClear = () => {
    setSourceFile(null);
    setSourcePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    revokeResultUrl();
    setResultUrl(null);
    setResultBlob(null);
    setError(null);
  };

  return (
    <section className="bg-tool">
      <header className="bg-tool__header">
        <h2>Background removal</h2>
        <p>
          Uploads go to your local API, which calls remove.bg with the server-side key. The key is
          never sent to the browser.
        </p>
      </header>

      <div className="bg-tool__actions">
        <label className="bg-tool__btn bg-tool__btn--primary" htmlFor={inputId}>
          Choose image
          <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp,image/jpg" onChange={handleSelect} hidden />
        </label>
        <button
          type="button"
          className="bg-tool__btn"
          onClick={handleRemoveBackground}
          disabled={!sourceFile || loading}
        >
          {loading ? 'Removing…' : 'Remove background'}
        </button>
        {(sourceFile || resultUrl) && (
          <button type="button" className="bg-tool__btn bg-tool__btn--ghost" onClick={handleClear} disabled={loading}>
            Clear
          </button>
        )}
      </div>

      {error && <p className="bg-tool__error" role="alert">{error}</p>}

      {loading && (
        <div className="bg-tool__loading" aria-live="polite">
          <span className="bg-tool__spinner" aria-hidden="true" />
          <span>Calling remove.bg… this can take a few seconds.</span>
        </div>
      )}

      <div className="bg-tool__previews">
        <figure className="bg-tool__figure">
          <figcaption>Original</figcaption>
          <div className="bg-tool__frame">
            {sourcePreview ? <img src={sourcePreview} alt="Original upload" /> : <span>No image selected</span>}
          </div>
        </figure>
        <figure className="bg-tool__figure">
          <figcaption>Transparent PNG</figcaption>
          <div className="bg-tool__frame bg-tool__frame--checker">
            {resultUrl ? <img src={resultUrl} alt="Background removed" /> : <span>Result appears here</span>}
          </div>
        </figure>
      </div>

      {resultUrl && (
        <div className="bg-tool__result-actions">
          <button type="button" className="bg-tool__btn bg-tool__btn--primary" onClick={handleDownload}>
            Download PNG
          </button>
          {onApplyToSelfie && (
            <button type="button" className="bg-tool__btn" onClick={handleApplySelfie}>
              Use on stall selfie
            </button>
          )}
        </div>
      )}
    </section>
  );
}
