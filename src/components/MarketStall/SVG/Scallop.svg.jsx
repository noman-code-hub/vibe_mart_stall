/** Single scallop shape for canopy hem. */
export default function Scallop({ width = 48, height = 18, fill = 'var(--red)', className = '' }) {
  const w = width;
  const h = height;
  const d = `M0,0 Q${w / 2},${h} ${w},0 Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden="true">
      <path d={d} fill={fill} stroke="var(--outline)" strokeWidth="1.5" />
      <path d={`M4,2 Q${w / 2},${h - 4} ${w - 4},2`} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="2" />
    </svg>
  );
}
