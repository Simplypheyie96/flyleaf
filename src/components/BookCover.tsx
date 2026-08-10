import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import CoverArt, { groundHue } from '../books/CoverArt'
import { seedFrom } from '../books/seed'
import styles from './BookCover.module.css'

/** How much board there is to work with, which decides what can go on it.
    `full` is a cover you look at, `small` a cover you scan on a shelf, and
    `thumb` a cover you pick out of a list at 44px — where a set title is
    unreadable anyway, so only the motif is worth printing.

    `full` and `small` differ in nothing but width now: the board is a
    container and its type is sized in `cqw`, so the proportions come out the
    same at 140px and at 64px without either being restated. */
export type CoverSize = 'full' | 'small' | 'thumb'

interface BookCoverProps {
  title: string
  author: string
  /** Real covers to try in order — Open Library, then Google Books. */
  covers?: string[]
  width?: number
  rotate?: number
  size?: CoverSize
  /** A board with the needlework and nothing set on it. `thumb` is already
   *  bare because a title is unreadable at 44px; this asks for the same thing
   *  at any size, for the one place a cover is an ornament rather than a book
   *  you are being asked to identify. */
  bare?: boolean
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
const LOADED_COVERS = new Set<string>()

function BookCover({
  title,
  author,
  covers,
  width,
  rotate = 0,
  size = 'full',
  bare = false,
  className,
}: BookCoverProps) {
  // A URL that 404s, times out, or returns something that isn't an image must
  // still leave the reader with a cover: try the next source, then draw one.
  // Open Library in particular answers a missing cover with a 404 by design,
  // so this path is ordinary rather than exceptional.
  const [attempt, setAttempt] = useState(0)
  const list = covers?.join('\n') ?? ''
  const src = covers?.[attempt]

  const [loaded, setLoaded] = useState(() => Boolean(src && LOADED_COVERS.has(src)))

  useEffect(() => {
    if (src && LOADED_COVERS.has(src)) {
      setLoaded(true)
    } else {
      setAttempt(0)
      setLoaded(Boolean(src && LOADED_COVERS.has(src)))
    }
  }, [list, src])

  const seed = seedFrom(title, author)
  const style = {
    // Never one of the two threads worked on it — see groundHue.
    '--cover-h': groundHue(seed),
    '--cover-rotate': `${rotate}deg`,
    width: width ? `${width}px` : undefined,
  } as CSSProperties

  const className_ = [
    styles.cover,
    size === 'thumb' && styles.thumb,
    loaded && styles.photographed,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const typeset = size !== 'thumb' && !bare

  const handleLoad = (url: string) => {
    LOADED_COVERS.add(url)
    setLoaded(true)
  }

  const handleError = () => {
    setAttempt((n) => n + 1)
  }

  return (
    <div className={className_} style={style}>
      <CoverArt className={styles.art} seed={seed} bare={!typeset} />
      {typeset && (
        <div className={styles.type}>
          {/* The band clamps to three lines, so the whole title has to stay
              reachable somewhere other than the book's own page. */}
          <span className={styles.title} title={title}>
            {title}
          </span>
          <span className={styles.author} title={author}>
            {author}
          </span>
        </div>
      )}
      {src && (
        // Keyed on the URL so each candidate gets a fresh element: a reused
        // <img> that has already errored will not fire onError again.
        <img
          key={src}
          ref={(el) => {
            if (el?.complete && el.naturalWidth > 0) {
              handleLoad(src)
            }
          }}
          className={styles.image}
          src={src}
          alt={`${title} by ${author}`}
          loading="lazy"
          decoding="async"
          onLoad={() => handleLoad(src)}
          onError={handleError}
        />
      )}
    </div>
  )
}

export default BookCover
