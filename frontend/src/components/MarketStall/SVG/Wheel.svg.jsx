/**
 * Vintage wagon wheel — 16 spokes, red paint, wood hub. Pure SVG, no images.
 */
export default function Wheel({ size = 120, className = '' }) {
  const r = size / 2;
  const spokes = 16;
  const spokeLines = Array.from({ length: spokes }, (_, i) => {
    const angle = (Math.PI * 2 * i) / spokes;
    const x1 = r + Math.cos(angle) * (r * 0.18);
    const y1 = r + Math.sin(angle) * (r * 0.18);
    const x2 = r + Math.cos(angle) * (r * 0.88);
    const y2 = r + Math.sin(angle) * (r * 0.88);
    return { x1, y1, x2, y2, key: i };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="wheelWood" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8b3a2a" />
          <stop offset="70%" stopColor="var(--red)" />
          <stop offset="100%" stopColor="#8b2020" />
        </radialGradient>
        <filter id="wheelShadow">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.4" />
        </filter>
      </defs>

      <g filter="url(#wheelShadow)">
        <circle cx={r} cy={r} r={r - 2} fill="url(#wheelWood)" stroke="var(--outline)" strokeWidth="3" />
        <circle cx={r} cy={r} r={r * 0.82} fill="none" stroke="var(--outline)" strokeWidth="2.5" />
        {spokeLines.map((s) => (
          <line
            key={s.key}
            x1={s.x1}
            y1={s.y1}
            x2={s.x2}
            y2={s.y2}
            stroke="var(--outline)"
            strokeWidth="2"
          />
        ))}
        <circle cx={r} cy={r} r={r * 0.14} fill="var(--wood-dark)" stroke="var(--outline)" strokeWidth="2" />
      </g>
    </svg>
  );
}
