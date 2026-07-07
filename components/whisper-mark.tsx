/**
 * The Whisper mark — the OM three-node triangle (om-design-system assets/mark.svg).
 * Brick stroke 1.3, round caps, outline-ring + center-dot nodes.
 * `draw` animates the line drawing (2.4s) with node fade-in — login only.
 */
export function WhisperMark({
  size = 48,
  draw = false,
  className = '',
}: {
  size?: number
  draw?: boolean
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      stroke="#8B3A23"
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden="true"
      className={`${draw ? 'mark-draw' : ''} ${className}`}
    >
      <line x1="51" y1="20" x2="20" y2="80" />
      <line x1="20" y1="80" x2="83" y2="74" />
      <line x1="83" y1="74" x2="51" y2="20" />

      <circle cx="51" cy="20" r="4.5" />
      <circle cx="51" cy="20" r="2" fill="#8B3A23" stroke="none" />

      <circle cx="20" cy="80" r="4.5" />
      <circle cx="20" cy="80" r="2" fill="#8B3A23" stroke="none" />

      <circle cx="83" cy="74" r="4.5" />
      <circle cx="83" cy="74" r="2" fill="#8B3A23" stroke="none" />
    </svg>
  )
}
