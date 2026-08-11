import Bolt from './Bolt.svg.jsx';

/**
 * Curved header arch with metal frame, cream panel, and bolt details.
 */
export default function Arch({ title, logo, width = 420, height = 72, className = '' }) {
  const w = width;
  const h = height;
  const archPath = `M12,${h - 8} Q12,12 ${w / 2},12 Q${w - 12},12 ${w - 12},${h - 8} L${w - 12},${h - 4} L12,${h - 4} Z`;
  const innerPath = `M24,${h - 14} Q24,24 ${w / 2},24 Q${w - 24},24 ${w - 24},${h - 14} Z`;

  const boltPositions = [];
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const bx = 24 + t * (w - 48);
    const by = 22 + Math.sin(t * Math.PI) * 6;
    boltPositions.push({ cx: bx, cy: by });
  }

  return (
    <svg
      width={w}
      height={h + 12}
      viewBox={`0 0 ${w} ${h + 12}`}
      className={className}
      role="img"
      aria-label={title || 'Stall header arch'}
    >
      <defs>
        <linearGradient id="archMetal" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#0f0f0f" />
        </linearGradient>
        <filter id="archShadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Side support posts */}
      <rect x="4" y={h - 4} width="10" height="16" rx="2" fill="var(--teal)" stroke="var(--outline)" strokeWidth="2" />
      <rect x={w - 14} y={h - 4} width="10" height="16" rx="2" fill="var(--teal)" stroke="var(--outline)" strokeWidth="2" />

      <g filter="url(#archShadow)">
        <path d={archPath} fill="url(#archMetal)" stroke="var(--outline)" strokeWidth="3" />
        <path d={innerPath} fill="var(--cream)" stroke="var(--outline)" strokeWidth="2.5" />
      </g>

      {boltPositions.map((b, i) => (
        <Bolt key={i} cx={b.cx} cy={b.cy} r={3.2} />
      ))}

      {/* Side circles */}
      <circle cx="18" cy={h / 2} r="5" fill="var(--cream)" stroke="var(--outline)" strokeWidth="2" />
      <circle cx={w - 18} cy={h / 2} r="5" fill="var(--cream)" stroke="var(--outline)" strokeWidth="2" />

      {logo && (
        <foreignObject x={w / 2 - 20} y="6" width="40" height="24">
          <div xmlns="http://www.w3.org/1999/xhtml">{logo}</div>
        </foreignObject>
      )}

      {title && (
        <text
          x={w / 2}
          y={h / 2 + 6}
          textAnchor="middle"
          fill="var(--outline)"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontWeight="700"
          fontSize={Math.min(28, w / 14)}
        >
          {title}
        </text>
      )}
    </svg>
  );
}
