import Arch from './SVG/Arch.svg.jsx';
import styles from './HeaderArch.module.css';

/** Curved VIBE MART header with metal frame and cream panel. */
export default function HeaderArch({ title, logo, height, width, className = '' }) {
  return (
    <header className={`${styles.header} ${className}`} aria-label={title || 'Stall header'}>
      <Arch title={title} logo={logo} width={width ?? 420} height={height ?? 72} className={styles.arch} />
    </header>
  );
}
