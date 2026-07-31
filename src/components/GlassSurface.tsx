import type { ReactNode, Ref } from 'react'
import styles from './GlassSurface.module.css'

interface GlassSurfaceProps {
  children: ReactNode
  className?: string
  /** The outer surface, for callers that have to move or measure it. */
  ref?: Ref<HTMLDivElement>
}

/** Floating glass chrome. Use for bars, chips, sheets — never for content. */
function GlassSurface({ children, className, ref }: GlassSurfaceProps) {
  return (
    <div ref={ref} className={[styles.glass, className].filter(Boolean).join(' ')}>
      <div className={styles.scrim}>{children}</div>
    </div>
  )
}

export default GlassSurface
