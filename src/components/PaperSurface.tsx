import type { CSSProperties, ElementType, ReactNode } from 'react'
import styles from './PaperSurface.module.css'

export type PaperTone =
  | 'default'
  | 'quote'
  | 'note'
  | 'voice'
  | 'image'
  | 'highlight'
  | 'strand'

interface PaperSurfaceProps {
  children: ReactNode
  /** Scrapbook tilt in degrees (keep within ±2.5). */
  rotate?: number
  taped?: boolean
  /** Entry-type surface tint. */
  tone?: PaperTone
  /** The element to print on. A keep is an `article`, a pile of them is a
      `li` — the surface is a material, not a semantic. */
  as?: ElementType
  className?: string
  style?: CSSProperties
}

const TONE_CLASS = {
  default: undefined,
  quote: styles.toneQuote,
  note: styles.toneNote,
  voice: styles.toneVoice,
  image: styles.toneImage,
  highlight: styles.toneHighlight,
  strand: styles.toneStrand,
}

/** Aged-paper content surface — entries, cards, keepsakes. */
function PaperSurface({
  children,
  rotate = 0,
  taped = false,
  tone = 'default',
  as: Tag = 'div',
  className,
  style,
}: PaperSurfaceProps) {
  const classes = [styles.paper, taped && styles.taped, TONE_CLASS[tone], className]
    .filter(Boolean)
    .join(' ')
  return (
    <Tag
      className={classes}
      style={{ '--paper-rotate': `${rotate}deg`, ...style } as CSSProperties}
    >
      {children}
    </Tag>
  )
}

export default PaperSurface
