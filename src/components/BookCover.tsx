import type { CSSProperties } from 'react'
import styles from './BookCover.module.css'

export type CoverHue = 'image' | 'quote' | 'note' | 'voice' | 'highlight'

interface BookCoverProps {
  title: string
  author: string
  hue?: CoverHue
  width?: number
  rotate?: number
  small?: boolean
  className?: string
}

/** Typeset placeholder cover — replaced by the real cover pipeline in 03. */
function BookCover({
  title,
  author,
  hue = 'image',
  width,
  rotate = 0,
  small = false,
  className,
}: BookCoverProps) {
  const style = {
    '--cover-hue': `var(--color-${hue})`,
    '--cover-rotate': `${rotate}deg`,
    width: width ? `${width}px` : undefined,
  } as CSSProperties
  return (
    <div
      className={[styles.cover, small && styles.small, className]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      <span className={styles.top}>A novel</span>
      <span className={styles.title}>{title}</span>
      <span>
        <span className={styles.rule} />
        <span className={styles.author}>{author}</span>
      </span>
    </div>
  )
}

export default BookCover
