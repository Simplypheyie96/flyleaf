import type { CSSProperties, ReactNode } from 'react'
import styles from './PaperSurface.module.css'

interface PaperSurfaceProps {
  children: ReactNode
  /** Scrapbook tilt in degrees (keep within ±2.5). */
  rotate?: number
  taped?: boolean
  /** Entry-type surface tint. */
  tone?: 'default' | 'quote' | 'note' | 'voice'
  className?: string
}

const TONE_CLASS = {
  default: undefined,
  quote: styles.toneQuote,
  note: styles.toneNote,
  voice: styles.toneVoice,
}

/** Aged-paper content surface — entries, cards, keepsakes. */
function PaperSurface({
  children,
  rotate = 0,
  taped = false,
  tone = 'default',
  className,
}: PaperSurfaceProps) {
  const classes = [styles.paper, taped && styles.taped, TONE_CLASS[tone], className]
    .filter(Boolean)
    .join(' ')
  const style = { '--paper-rotate': `${rotate}deg` } as CSSProperties
  return (
    <div className={classes} style={style}>
      {children}
    </div>
  )
}

export default PaperSurface
