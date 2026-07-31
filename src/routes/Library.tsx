import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import BookCover from '../components/BookCover'
import GlassSurface from '../components/GlassSurface'
import {
  GridIcon,
  SearchIcon,
  ShelfIcon,
  StackIcon,
} from '../components/TabIcons'
import { libraryBooks } from '../data/sample'
import { runSwitch } from '../motion/viewSwitch'
import type { FadePhase } from '../motion/viewSwitch'
import pageStyles from './page.module.css'
import styles from './Library.module.css'

type ShelfView = 'Stack' | 'Shelf' | 'Grid'
const VIEW_KEY = 'flyleaf-shelf-view'

const VIEWS: { id: ShelfView; Icon: typeof StackIcon; hint: string }[] = [
  { id: 'Stack', Icon: StackIcon, hint: 'piled, one on top of another' },
  { id: 'Shelf', Icon: ShelfIcon, hint: 'standing, spines out' },
  { id: 'Grid', Icon: GridIcon, hint: 'covers in a grid' },
]

/* ---- Shelf geometry ----
   A real shelf is not a row of identical blocks: books differ in thickness and
   height, and that variation is most of what makes a bookcase read as one.
   Fixed per index rather than random so a book keeps its proportions across
   re-renders and every reader sees the same shelf. */
const SPINES = [
  { w: 48, h: 208, tilt: 0 },
  { w: 38, h: 188, tilt: -1.2 },
  { w: 54, h: 200, tilt: 0.6 },
  { w: 42, h: 214, tilt: -0.5 },
]

/* ---- Fitting a title to its spine ----
   The title runs down the spine between the head padding and the author's
   line, so what fits depends on how tall that particular book is. The cut has
   to happen here, in the string: once a title outruns its spine, Chromium
   breaks it into a second column that runs sideways off the shelf, and it
   does that with `white-space: nowrap` computed and even forced with
   `!important`. `overflow: hidden` + `text-overflow` only hides it behind a
   clip, and paints the fragment twice.

   The budget is measured rather than estimated, because every estimate of it
   has been wrong. The last one assumed 6.3px a character and 12px of padding
   at each end; both were off. `padding-block` in `writing-mode: vertical-rl`
   is the *horizontal* axis, so there was no padding at the head or foot at
   all — and the curly apostrophe in "The Cartographer's Daughter" is set
   upright under the default `text-orientation: mixed`, taking a full em
   instead of its own narrow advance. That one title laid out 17px longer than
   any character count could have predicted.

   `text-orientation: sideways` on the spine is what makes measuring possible:
   every glyph then takes its horizontal advance, which is exactly what
   canvas measureText reports. */

const SPINE_HEAD = 2 // border-top: the paper edge at the head of the block
const SPINE_PAD = 12 // clear air at each end, matching the stylesheet
const SPINE_GAP = 16 // the least space between the title's foot and the author

/** Reused across every measurement — creating a canvas per title is wasteful. */
let measureCtx: CanvasRenderingContext2D | null | undefined

function advance(text: string, font: string) {
  if (measureCtx === undefined) {
    measureCtx = document.createElement('canvas').getContext('2d')
  }
  // No 2D context (canvas blocked, or a non-DOM test environment): fall back to
  // a deliberately wide per-character guess, so a title is cut short rather
  // than allowed to run off the shelf.
  if (!measureCtx) return text.length * 8
  measureCtx.font = font
  return measureCtx.measureText(text).width
}

/* Reads the font actually in force for a class, rather than restating the
   tokens here where they would drift. Cached: this touches layout. */
const typeCache = new Map<string, { font: string; size: number }>()

function typeFor(className: string) {
  const hit = typeCache.get(className)
  if (hit) return hit

  const probe = document.createElement('span')
  probe.className = className
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none'
  document.body.append(probe)
  const cs = getComputedStyle(probe)
  const type = {
    font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
    size: parseFloat(cs.fontSize),
  }
  probe.remove()

  typeCache.set(className, type)
  return type
}

/** How long a run of text is, including tracking — which canvas ignores. */
function runLength(text: string, className: string, trackingEm = 0) {
  const { font, size } = typeFor(className)
  return advance(text, font) + text.length * trackingEm * size
}

/* Prefer to drop whole words. Cutting mid-word doesn't read as shortened, it
   reads as a different book: "The Lantern Season" clipped to a budget gives
   "The Lantern Seas…", a plausible title that doesn't exist. Characters only
   come off when a single word is itself longer than the spine. */
function fitTitle(title: string, author: string, spineHeight: number) {
  // The author is uppercased and tracked out by the stylesheet, so measure
  // what actually renders, not what's in the data.
  const authorRun = runLength(author.toUpperCase(), styles.spineAuthor, 0.08)
  const budget =
    spineHeight - SPINE_HEAD - SPINE_PAD * 2 - authorRun - SPINE_GAP

  const fits = (s: string) => runLength(s, styles.spineTitle) <= budget
  if (fits(title)) return title

  const words = title.split(' ')
  while (words.length > 1) {
    words.pop()
    const candidate = `${words.join(' ')}…`
    if (fits(candidate)) return candidate
  }

  let cut = title
  while (cut.length > 1 && !fits(`${cut}…`)) cut = cut.slice(0, -1)
  return `${cut.trimEnd()}…`
}

function getStoredView(): ShelfView {
  const stored = localStorage.getItem(VIEW_KEY)
  return stored === 'Shelf' || stored === 'Grid' ? stored : 'Stack'
}

/* The full bookshelf: Stack (emotional default) · Shelf · Grid.
   Search here is the entry point to the archive search surface (06). */
function Library() {
  const [view, setView] = useState<ShelfView>(getStoredView)
  const [phase, setPhase] = useState<FadePhase>('idle')
  const [fitted, setFitted] = useState<Record<string, string>>({})
  const timers = useRef<number[]>([])

  /* Measure before paint, so a title is never briefly shown at a length that
     doesn't fit. Then measure again when the fonts land: on a cold load the
     first pass runs against the fallback serif, whose metrics aren't
     Instrument Serif's, and a budget measured against the wrong face is the
     wrong budget. */
  useLayoutEffect(() => {
    if (view !== 'Shelf') return

    let live = true
    const measure = () => {
      if (!live) return
      typeCache.clear()
      setFitted(
        Object.fromEntries(
          libraryBooks.map((book, i) => [
            book.title,
            fitTitle(book.title, book.author, SPINES[i % SPINES.length].h),
          ]),
        ),
      )
    }

    measure()
    document.fonts?.ready.then(measure)
    return () => {
      live = false
    }
  }, [view])

  // The cross-fade fallback runs on timeouts; leaving the page mid-switch must
  // not leave a setState pointed at an unmounted tree.
  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach(clearTimeout)
      pending.length = 0
    }
  }, [])

  function schedule(fn: () => void, delay: number) {
    timers.current.push(window.setTimeout(fn, delay))
  }

  function choose(next: ShelfView) {
    if (next === view) return
    localStorage.setItem(VIEW_KEY, next)
    runSwitch(() => setView(next), { setPhase, schedule })
  }

  // Only the cross-fade path ever sets a phase, so a non-idle phase means the
  // wrapper is mid-fade. Morph leaves it alone and moves the books instead.
  const phaseClass = phase !== 'idle' ? styles[phase] : ''

  return (
    <main className={pageStyles.page}>
      <div className={`${pageStyles.column} ${styles.shelfColumn}`}>
        <header className={styles.masthead}>
          <div className={styles.mastheadText}>
            <h1 className={styles.title}>The Library</h1>
            <p className={styles.subtitle}>every book you keep</p>
          </div>

          <GlassSurface className={styles.switcher}>
            <div
              className={styles.switcherInner}
              role="group"
              aria-label="Shelf view"
            >
              {VIEWS.map(({ id, Icon, hint }) => (
                <button
                  key={id}
                  type="button"
                  className={styles.viewPill}
                  aria-pressed={view === id}
                  aria-label={`${id} view — ${hint}`}
                  title={`${id} — ${hint}`}
                  onClick={() => choose(id)}
                >
                  <Icon size={20} />
                </button>
              ))}
            </div>
          </GlassSurface>
        </header>

        <GlassSurface className={styles.search}>
          <div className={styles.searchInner}>
            <SearchIcon size={18} />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search books and memories"
              aria-label="Search your books and memories"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </GlassSurface>

        <div className={phaseClass}>
          {view === 'Stack' && (
            <div className={styles.stack}>
              {libraryBooks.map((book, i) => (
                <div
                  key={book.title}
                  className={`${styles.stackItem} ${styles.book}`}
                  style={
                    {
                      zIndex: libraryBooks.length - i,
                      viewTransitionName: `book-${i}`,
                      '--enter-delay': `calc(${i} * var(--stagger))`,
                    } as CSSProperties
                  }
                >
                  <BookCover
                    title={book.title}
                    author={book.author}
                    hue={book.hue}
                    size={i > 0 ? 'small' : 'full'}
                  />
                </div>
              ))}
            </div>
          )}

          {view === 'Shelf' && (
            <div className={styles.shelf}>
              <div className={styles.shelfRow}>
                {libraryBooks.map((book, i) => {
                  const s = SPINES[i % SPINES.length]
                  return (
                    <div
                      key={book.title}
                      className={`${styles.spine} ${styles.book}`}
                      style={
                        {
                          '--spine-hue': `var(--color-${book.hue})`,
                          '--spine-w': `${s.w}px`,
                          '--spine-h': `${s.h}px`,
                          '--spine-tilt': `${s.tilt}deg`,
                          viewTransitionName: `book-${i}`,
                          '--enter-delay': `calc(${i} * var(--stagger))`,
                        } as CSSProperties
                      }
                    >
                      <span className={styles.spineTitle} title={book.title}>
                        {fitted[book.title] ?? book.title}
                      </span>
                      <span className={styles.spineAuthor}>{book.author}</span>
                    </div>
                  )
                })}
              </div>
              <div className={styles.ledge} aria-hidden="true" />
            </div>
          )}

          {view === 'Grid' && (
            <div className={styles.grid}>
              {libraryBooks.map((book, i) => (
                <div
                  key={book.title}
                  className={styles.book}
                  style={
                    {
                      viewTransitionName: `book-${i}`,
                      '--enter-delay': `calc(${i} * var(--stagger))`,
                    } as CSSProperties
                  }
                >
                  <BookCover
                    title={book.title}
                    author={book.author}
                    hue={book.hue}
                    size="small"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <p className={styles.count}>{libraryBooks.length} books</p>
      </div>
    </main>
  )
}

export default Library
