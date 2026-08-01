/* The little star that used to live only on Home. One drawn shape, shared,
   so every screen twinkles the same way — a decoration that appears on one
   page and no other reads as a leftover, not a motif. */

interface SparkleProps {
  size?: number
  className?: string
}

function Sparkle({ size = 18, className }: SparkleProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12 2 C 13 8 16 11 22 12 C 16 13 13 16 12 22 C 11 16 8 13 2 12 C 8 11 11 8 12 2 Z"
      />
    </svg>
  )
}

export default Sparkle
