import type { CSSProperties, ElementType, ReactNode } from 'react'
import styles from './PaperSurface.module.css'

export type PaperTone =
  | 'default'
  | 'quote'
  | 'note'
  | 'voice'
  | 'image'
  | 'place'
  | 'thread'
  | 'character'

interface PaperSurfaceProps {
  children: ReactNode
  /** Scrapbook tilt in degrees (keep within ±2.5). */
  rotate?: number
  taped?: boolean
  /** Set when the surface sits on a GlassSurface — a sheet, a bar, a pill.
      Drops the frosting for an opaque fill; see `.solid` for why. */
  onGlass?: boolean
  /** Entry-type surface tint. */
  tone?: PaperTone
  /** The element to print on. A keep is an `article`, a pile of them is a
      `li` — the surface is a material, not a semantic. */
  as?: ElementType
  className?: string
  style?: CSSProperties
  /* `data-*` for the callers that style a surface by what is printed on it.
     Deliberately not `[k: string]: unknown` — the point is to let a keep say
     it is a quote, not to let anything at all through onto the element. */
  [data: `data-${string}`]: string | undefined
}

const TONE_CLASS: Record<PaperTone, string | undefined> = {
  default: undefined,
  quote: styles.toneQuote,
  note: styles.toneNote,
  voice: styles.toneVoice,
  image: styles.toneImage,
  place: styles.tonePlace,
  thread: styles.toneThread,
  character: styles.toneCharacter,
}

/** Aged-paper content surface — entries, cards, keepsakes. */
function PaperSurface({
  children,
  rotate = 0,
  taped = false,
  onGlass = false,
  tone = 'default',
  as: Tag = 'div',
  className,
  style,
  ...data
}: PaperSurfaceProps) {
  const classes = [
    styles.paper,
    taped && styles.taped,
    onGlass && styles.solid,
    TONE_CLASS[tone],
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <Tag
      className={classes}
      style={{ '--paper-rotate': `${rotate}deg`, ...style } as CSSProperties}
      {...data}
    >
      {children}
    </Tag>
  )
}

export default PaperSurface
