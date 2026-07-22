import styles from './TopLabel.module.css';

/** Coloured pill label for product cards. */
export default function TopLabel({ color = 'var(--blue-label)', text, className = '' }) {
  if (!text) return null;
  return (
    <span className={`${styles.label} ${className}`} style={{ backgroundColor: color }}>
      {text}
    </span>
  );
}
