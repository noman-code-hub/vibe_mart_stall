import { useCallback, useEffect, useRef, useState } from 'react';
import { trimImageToContent } from '../../utils/trimImageContent.js';
import styles from './SelfieSlot.module.css';

const MAX_SCALE = 2.8;
const FILL_RATIO = 0.96;

function computePersonScale(img, boxW, boxH) {
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (!nw || !nh || !boxW || !boxH) return 1;

  const aspect = nw / nh;
  let fitW;
  let fitH;

  if (aspect > boxW / boxH) {
    fitW = boxW;
    fitH = boxW / aspect;
  } else {
    fitH = boxH;
    fitW = boxH * aspect;
  }

  const scale = Math.min((boxH * FILL_RATIO) / fitH, (boxW * FILL_RATIO) / fitW, MAX_SCALE);
  return Math.max(scale, 1);
}

export default function SelfieSlot({ src, alt, style }) {
  const innerRef = useRef(null);
  const imgRef = useRef(null);
  const trimmedUrlRef = useRef(null);
  const [displaySrc, setDisplaySrc] = useState(null);
  const [scale, setScale] = useState(1);

  const updateScale = useCallback(() => {
    const inner = innerRef.current;
    const img = imgRef.current;
    if (!inner || !img || !img.complete || !img.naturalWidth) return;

    setScale(computePersonScale(img, inner.clientWidth, inner.clientHeight));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!src) {
        setDisplaySrc(null);
        return;
      }

      setDisplaySrc(null);
      setScale(1);

      if (trimmedUrlRef.current?.revoke) {
        URL.revokeObjectURL(trimmedUrlRef.current.url);
        trimmedUrlRef.current = null;
      }

      try {
        const trimmed = await trimImageToContent(src);
        if (cancelled) {
          if (trimmed.revoke) URL.revokeObjectURL(trimmed.url);
          return;
        }
        trimmedUrlRef.current = trimmed;
        setDisplaySrc(trimmed.url);
      } catch {
        if (!cancelled) setDisplaySrc(src);
      }
    };

    run();

    return () => {
      cancelled = true;
      if (trimmedUrlRef.current?.revoke) {
        URL.revokeObjectURL(trimmedUrlRef.current.url);
        trimmedUrlRef.current = null;
      }
    };
  }, [src]);

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return undefined;

    const observer = new ResizeObserver(updateScale);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [updateScale, displaySrc]);

  if (!src) return null;

  return (
    <figure className={styles.box} style={style} aria-label={alt ?? 'Vendor'}>
      <div ref={innerRef} className={styles.inner}>
        <span className={styles.footShadow} aria-hidden="true" />
        {displaySrc && (
          <img
            ref={imgRef}
            src={displaySrc}
            alt={alt ?? 'Vendor'}
            className={styles.image}
            style={scale !== 1 ? { transform: `scale(${scale})` } : undefined}
            onLoad={updateScale}
          />
        )}
      </div>
    </figure>
  );
}
