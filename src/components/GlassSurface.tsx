import type { ReactNode } from 'react'
import styles from './GlassSurface.module.css'

interface GlassSurfaceProps {
  children: ReactNode
  className?: string
}

/** Floating glass chrome. Use for bars, chips, sheets — never for content. */
function GlassSurface({ children, className }: GlassSurfaceProps) {
  return (
    <div className={[styles.glass, className].filter(Boolean).join(' ')}>
      <div className={styles.scrim}>{children}</div>
    </div>
  )
}

export default GlassSurface
