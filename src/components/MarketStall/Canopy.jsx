import Scallop from './SVG/Scallop.svg.jsx';
import styles from './Canopy.module.css';

const STRIPE_COUNT = 12;

/** Red-and-white striped awning with scalloped hem and floating animation. */
export default function Canopy({ banner, className = '' }) {
  const stripes = Array.from({ length: STRIPE_COUNT }, (_, i) => ({
    id: i,
    color: i % 2 === 0 ? 'var(--red)' : 'var(--cream)',
  }));

  return (
    <div className={`${styles.canopy} ${className}`} aria-hidden="true">
      <div className={styles.stripes}>
        {stripes.map((s) => (
          <div key={s.id} className={styles.stripe} style={{ backgroundColor: s.color }} />
        ))}
      </div>
      {banner && <div className={styles.banner}>{banner}</div>}
      <div className={styles.scallops}>
        {Array.from({ length: STRIPE_COUNT * 2 }, (_, i) => (
          <Scallop
            key={i}
            width={48}
            height={16}
            fill={i % 2 === 0 ? 'var(--red)' : 'var(--cream)'}
            className={styles.scallop}
          />
        ))}
      </div>
    </div>
  );
}
