import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import CoverArt from '../books/CoverArt'
import { seedFrom } from '../books/seed'
import styles from './BookCover.module.css'

export type CoverHue = 'image' | 'quote' | 'note' | 'voice' | 'highlight'

const HUES: CoverHue[] = ['image', 'quote', 'note', 'voice', 'highlight']

/* A book's tint comes from its own seed, so a shelf is varied without anyone
   choosing, and a book is the same colour on every device and after every
   reinstall. Nothing about the tint is stored. */
export function hueFor(id: number): CoverHue {
  return HUES[id % HUES.length]
}

/** How much board there is to work with, which decides what can go on it.
    `full` is a cover you look at, `small` a cover you scan on a shelf, and
    `thumb` a cover you pick out of a list at 44px — where a set title is
    unreadable anyway, so only the motif is worth printing. */
export type CoverSize = 'full' | 'small' | 'thumb'

interface BookCoverProps {
  title: string
  author: string
  hue?: CoverHue
  /** Real covers to try in order — Open Library, then Google Books. */
  covers?: string[]
  width?: number
  rotate?: number
  size?: CoverSize
  className?: string
}

/* Every book has a cover. A real one when one exists anywhere, and otherwise
   one drawn from the book's own seed — never a blank board, and never a
   spinner, because the drawn cover needs no network and no time to arrive.

   The drawn cover is not a fallback that runs after the network fails: it is
   always there, and a photograph is laid over it once one has actually
   decoded. So a slow catalogue costs nothing, a dead one costs nothing, and
   there is no moment where a row is an empty rectangle waiting to become a
   book.

   The two are deliberately different objects rather than two skins of one: a
   real cover is a photograph of someone else's design and carries its own
   typography, so we put nothing on top of it. A generated cover is ours, so we
   set the title and author ourselves, in our own serif, crisply. */
function BookCover({
  title,
  author,
  hue = 'image',
  covers,
  width,
  rotate = 0,
  size = 'full',
  className,
}: BookCoverProps) {
  // A URL that 404s, times out, or returns something that isn't an image must
  // still leave the reader with a cover: try the next source, then draw one.
  // Open Library in particular answers a missing cover with a 404 by design,
  // so this path is ordinary rather than exceptional.
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState(false)
  // Depending on the array itself would reset on every render, since callers
  // build it inline. The URLs are the thing that actually changed.
  const list = covers?.join('\n') ?? ''
  useEffect(() => {
    setAttempt(0)
    setLoaded(false)
  }, [list])
  const src = covers?.[attempt]

  const style = {
    '--cover-hue': `var(--color-${hue})`,
    '--cover-rotate': `${rotate}deg`,
    width: width ? `${width}px` : undefined,
  } as CSSProperties

  const className_ = [
    styles.cover,
    size !== 'full' && styles[size],
    loaded && styles.photographed,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const typeset = size !== 'thumb'

  return (
    <div className={className_} style={style}>
      {/* The small board clamps to two lines, so the whole title has to stay
          reachable somewhere other than the book's own page. */}
      {typeset && (
        <span className={styles.title} title={title}>
          {title}
        </span>
      )}
      <CoverArt className={styles.art} seed={seedFrom(title, author)} />
      {typeset && (
        <span className={styles.byline}>
          <span className={styles.rule} />
          <span className={styles.author} title={author}>
            {author}
          </span>
        </span>
      )}
      {src && (
        // Keyed on the URL so each candidate gets a fresh element: a reused
        // <img> that has already errored will not fire onError again.
        <img
          key={src}
          className={styles.image}
          src={src}
          alt={`${title} by ${author}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setAttempt((n) => n + 1)}
        />
      )}
    </div>
  )
}

export default BookCover
