import type { CSSProperties, ReactNode } from 'react'
import styles from './PaperSurface.module.css'

interface PaperSurfaceProps {
  children: ReactNode
  /** Scrapbook tilt in degrees (keep within ±2.5). */
  rotate?: number
  taped?: boolean
  className?: string
}

/** Aged-paper content surface — entries, cards, keepsakes. */
function PaperSurface({ children, rotate = 0, taped = false, className }: PaperSurfaceProps) {
  const classes = [styles.paper, taped && styles.taped, className]
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
