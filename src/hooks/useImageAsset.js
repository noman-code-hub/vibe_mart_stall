import { useEffect, useMemo, useState } from 'react';

/**
 * Resolves a File/Blob/string into a stable URL.
 * Strings pass through as-is. File/Blob objects get an object URL that
 * is revoked when the source changes or this hook instance unmounts.
 *
 * IMPORTANT: this hook must be called from a component that stays mounted
 * across any step transitions so the URL isn't revoked before the canvas
 * renders it. In Vibe Mart that component is App — selfieFile and product
 * files are held there, and StallCanvasPreview receives the *already-resolved
 * URL* (see useStableUrl in App).
 */
export function useFileUrl(source) {
  const isBlobLike = Boolean(source) && typeof source !== 'string';
  // useMemo creates the URL synchronously on the first render that sees this
  // source value, without needing an effect or setState.
  const objectUrl = useMemo(
    () => (isBlobLike ? URL.createObjectURL(source) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source]   // deliberately keyed on source identity, not isBlobLike
  );

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  if (!source) return null;
  if (typeof source === 'string') return source;
  return objectUrl;
}

/**
 * Resolves a File/Blob/string into a loaded HTMLImageElement, suitable for
 * drawing directly onto a canvas. Returns null while loading, missing, or
 * on load error.
 */
export function useImageFromFile(source) {
  const url = useFileUrl(source);
  const [loaded, setLoaded] = useState({ url: null, img: null });

  useEffect(() => {
    if (!url) return undefined;

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setLoaded({ url, img });
    };
    img.onerror = () => {
      if (!cancelled) setLoaded({ url, img: null });
    };
    img.src = url;

    return () => {
      cancelled = true;
    };
  }, [url]);

  return loaded.url === url ? loaded.img : null;
}
