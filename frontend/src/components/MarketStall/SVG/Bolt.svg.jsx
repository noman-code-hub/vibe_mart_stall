/** Decorative bolt / rivet for arch frame and metal joints. */
export default function Bolt({ cx = 0, cy = 0, r = 4, className = '' }) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      className={className}
      fill="var(--metal-light, #8a8a8a)"
      stroke="var(--outline, #1a1008)"
      strokeWidth="1.2"
    />
  );
}
