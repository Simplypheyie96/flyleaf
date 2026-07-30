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

export function HomeIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M4.5 10.5 L 12 4.5 L 19.5 10.5" />
        <path d="M6.5 9.5 L 6.5 18.5 C 6.5 19 7 19.5 7.5 19.5 L 16.5 19.5 C 17 19.5 17.5 19 17.5 18.5 L 17.5 9.5" />
        <path d="M10 19.5 L 10 14.5 C 10 14 10.5 13.5 11 13.5 L 13 13.5 C 13.5 13.5 14 14 14 14.5 L 14 19.5" />
      </g>
    </svg>
  )
}

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
