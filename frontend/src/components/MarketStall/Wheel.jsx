import WheelSvg from './SVG/Wheel.svg.jsx';
import styles from './Wheel.module.css';

/** Pair of SVG wagon wheels beneath the stall. */
export default function Wheel({ size = 110, animate = false, className = '' }) {
  return (
    <div className={`${styles.wheels} ${animate ? styles.animate : ''} ${className}`} aria-hidden="true">
      <WheelSvg size={size} className={styles.wheel} />
      <WheelSvg size={size} className={styles.wheel} />
    </div>
  );
}
