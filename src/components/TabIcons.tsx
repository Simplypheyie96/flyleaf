/* Hand-drawn stroke icons for the shell tabs — round caps, no icon library. */

interface IconProps {
  size?: number
}

const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export function BookIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M12 6.5 C 10 4.8 7 4.5 4.5 5.2 L 4.5 18 C 7 17.3 10 17.6 12 19.2 C 14 17.6 17 17.3 19.5 18 L 19.5 5.2 C 17 4.5 14 4.8 12 6.5 Z" />
        <path d="M12 6.5 L 12 19.2" />
      </g>
    </svg>
  )
}

export function SearchIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <circle cx="11" cy="11" r="6" />
        <path d="M15.5 15.5 L 19.5 19.5" />
      </g>
    </svg>
  )
}

export function SettingsIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M4.5 8 L 19.5 8" />
        <circle cx="9.5" cy="8" r="2" fill="var(--color-bg, white)" />
        <path d="M4.5 16 L 19.5 16" />
        <circle cx="14.5" cy="16" r="2" fill="var(--color-bg, white)" />
      </g>
    </svg>
  )
}
