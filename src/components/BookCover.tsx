import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import CoverArt from '../books/CoverArt'
import { seedFrom } from '../books/seed'
import styles from './BookCover.module.css'

export type CoverHue = 'image' | 'quote' | 'note' | 'voice' | 'highlight'

interface BookCoverProps {
  title: string
  author: string
  hue?: CoverHue
  /** A real cover from Open Library or Google Books, when one exists. */
  src?: string
  width?: number
  rotate?: number
  small?: boolean
  className?: string
}

/* Every book has a cover. A real one when one exists anywhere, and otherwise
   one drawn from the book's own seed — never a blank board, and never a
   spinner, because the drawn cover needs no network and no time to arrive.

   The two are deliberately different objects rather than two skins of one: a
   real cover is a photograph of someone else's design and carries its own
   typography, so we put nothing on top of it. A generated cover is ours, so we
   set the title and author ourselves, in our own serif, crisply. */
function BookCover({
  title,
  author,
  hue = 'image',
  src,
  width,
  rotate = 0,
  small = false,
  className,
}: BookCoverProps) {
  // A URL that 404s, times out, or returns something that isn't an image must
  // still leave the reader with a cover. Keyed on src so that a later, better
  // URL for the same book gets its own chance rather than inheriting a failure.
  const [broken, setBroken] = useState(false)
  useEffect(() => setBroken(false), [src])

  const style = {
    '--cover-hue': `var(--color-${hue})`,
    '--cover-rotate': `${rotate}deg`,
    width: width ? `${width}px` : undefined,
  } as CSSProperties

  const classes = (...extra: (string | false | undefined)[]) =>
    [styles.cover, small && styles.small, ...extra, className]
      .filter(Boolean)
      .join(' ')

  if (src && !broken) {
    return (
      <div className={classes(styles.photographed)} style={style}>
        <img
          className={styles.image}
          src={src}
          alt={`${title} by ${author}`}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      </div>
    )
  }

  return (
    <div className={classes()} style={style}>
      <span className={styles.title}>{title}</span>
      <CoverArt className={styles.art} seed={seedFrom(title, author)} />
      <span>
        <span className={styles.rule} />
        <span className={styles.author}>{author}</span>
      </span>
    </div>
  )
}

export default BookCover
