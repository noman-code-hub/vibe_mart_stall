/** Vertical metal support pole. */
export default function Pole({ width = 10, height = 80, className = '' }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="poleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5a5a5a" />
          <stop offset="45%" stopColor="#9a9a9a" />
          <stop offset="100%" stopColor="#4a4a4a" />
        </linearGradient>
      </defs>
      <rect
        x={width * 0.2}
        y="0"
        width={width * 0.6}
        height={height}
        rx={width * 0.15}
        fill="url(#poleGrad)"
        stroke="var(--outline, #1a1008)"
        strokeWidth="1.5"
      />
    </svg>
  );
}
