import { useEffect, useRef, useState } from 'react';
import { trimImageToContent } from '../../utils/trimImageContent.js';
import styles from './ProductSlot.module.css';

export default function ProductSlot({
  title,
  image,
  name,
  label,
  price,
  selected = false,
  onClick,
  panelStyle,
  boardStyle,
  hitStyle,
}) {
  const trimmedUrlRef = useRef(null);
  const [displaySrc, setDisplaySrc] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!image) {
        setDisplaySrc(null);
        return;
      }

      setDisplaySrc(null);

      if (trimmedUrlRef.current?.revoke) {
        URL.revokeObjectURL(trimmedUrlRef.current.url);
        trimmedUrlRef.current = null;
      }

      try {
        const trimmed = await trimImageToContent(image);
        if (cancelled) {
          if (trimmed.revoke) URL.revokeObjectURL(trimmed.url);
          return;
        }
        trimmedUrlRef.current = trimmed;
        setDisplaySrc(trimmed.url);
      } catch {
        if (!cancelled) setDisplaySrc(image);
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
  }, [image]);

  return (
    <div className={`${styles.group}${selected ? ` ${styles.selected}` : ''}`} aria-label={name || title}>
      <button
        type="button"
        className={styles.hitArea}
        style={hitStyle}
        onClick={onClick}
        aria-label={name || title}
      />

      <div className={styles.panel} style={panelStyle}>
        <div className={styles.body}>
          {image ? (
            displaySrc ? (
              <img src={displaySrc} alt={name || title} className={styles.image} />
            ) : null
          ) : (
            <span className={styles.placeholder}>Add photo</span>
          )}
        </div>
      </div>

      <div className={styles.tag} style={boardStyle}>
        {name && <span className={styles.name}>{name}</span>}
        {label && <span className={styles.size}>{label}</span>}
        {price && <span className={styles.price}>{price}</span>}
      </div>
    </div>
  );
}
