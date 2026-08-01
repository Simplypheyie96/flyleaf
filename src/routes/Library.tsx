import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import BookCover from '../components/BookCover'
import { floss, palette } from '../books/CoverArt'
import SpineArt from '../books/SpineArt'
import SpineMark from '../books/SpineMark'
import { seedFrom } from '../books/seed'
import GlassSurface from '../components/GlassSurface'
import {
  ChevronIcon,
  GridIcon,
  SearchIcon,
  ShelfIcon,
  StackIcon,
} from '../components/TabIcons'
import type { Book } from '../data/db'
import { useLibrary } from '../data/useLibrary'
import { shelved } from '../motion/shelfLanding'
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
const SPINE_MARK = 18 // the stitched device between the title and the byline
const SPINE_GAP = 11 // the least clear space on either side of that device

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

/** The byline as it actually renders — uppercased and tracked out by the
    stylesheet, neither of which is in the data. */
function bylineRun(author: string) {
  return runLength(author.toUpperCase(), styles.spineAuthor, 0.08)
}

/* Prefer to drop whole words. Cutting mid-word doesn't read as shortened, it
   reads as a different book: "The Lantern Season" clipped to a budget gives
   "The Lantern Seas…", a plausible title that doesn't exist. Characters only
   come off when a single word is itself longer than the spine. */
function cutTo(title: string, budget: number) {
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

/* What this spine can carry, title and byline together.

   The byline is the part that gives way. It keeps its full form as long as the
   whole title fits beside it, and drops to the surname the moment it doesn't
   — which is what is printed on most real narrow spines anyway, and which
   buys back twenty to forty pixels of title.

   The order matters, and it took a shelf reading "A Field Guide to… / Salt… /
   The…" to see it. Every one of those was a full name spelled out down the
   foot of the spine while the title above it was cut to a word. Nobody finds a
   book on a shelf by its author's first initial. */
function fitSpine(title: string, author: string, spineHeight: number) {
  // Head padding, the device and a gap either side of it, foot padding. What
  // the title and the byline then share is everything that is left.
  const shared =
    spineHeight - SPINE_HEAD - SPINE_PAD * 2 - SPINE_MARK - SPINE_GAP * 2

  if (runLength(title, styles.spineTitle) <= shared - bylineRun(author)) {
    return { title, author }
  }

  const surname = author.trim().split(/\s+/).pop() || author
  return { title: cutTo(title, shared - bylineRun(surname)), author: surname }
}

function getStoredView(): ShelfView {
  const stored = localStorage.getItem(VIEW_KEY)
  return stored === 'Shelf' || stored === 'Grid' ? stored : 'Stack'
}

/* ---- Stack: a deck you deal through ----

   The pile used to be scenery. Four books at fixed angles, the top one whole
   and the rest showing a corner, and no way at all to reach the ones
   underneath — which made the default view of the library the one view that
   could not show you your library.

   So the pile keeps its shape and gains a front. Every book holds a slot
   measured from whichever one is currently facing you, and moving the front
   re-slots all of them at once; the transition between two slots is the swap
   animation, and there is no separate animation code for it. Books past the
   fourth slot sit at the back with nothing showing: a pile reads as deep at
   four, and a reader with sixty books does not need sixty elements each
   transitioning to a position nobody can see.

   Three ways in, because they are wanted at different moments: the arrows for
   deliberate paging and for a keyboard, a swipe for a thumb, and a tap on any
   book you can actually see for when you know which one you want. */

/** How many books are drawn behind the front one. */
const DECK_DEPTH = 3

/** How far a drag has to travel across before it counts as turning the deck
    rather than as a tap that wandered. */
const SWIPE_MIN = 40

/** How long the arc runs, in step with `--dur-move`. Held here as well because
    the arc has to be taken off the card once it lands, and a keyframe cannot
    tell React it has finished. Slightly over so the class outlives the paint. */
const DEAL_MS = 460

/** Past this many books the dots stop being countable and become a texture,
    and a plain count is the more honest indicator. */
const PIP_MAX = 8

function StackDeck({ books }: { books: Book[] }) {
  const n = books.length
  const [active, setActive] = useState(0)
  /* The one book on an arc rather than a straight glide — see the `deal`
     keyframe. Held by id, not by index, so that a shelf changing underneath a
     running animation cannot point it at a different book. */
  const [dealing, setDealing] = useState<number | null>(null)
  const clear = useRef(0)
  const from = useRef<{ x: number; y: number } | null>(null)

  // A book removed from under the front one must not leave the deck pointing
  // past its own end.
  useEffect(() => {
    if (active >= n) setActive(0)
  }, [active, n])

  useEffect(() => () => window.clearTimeout(clear.current), [])

  function turn(by: 1 | -1) {
    if (n < 2) return
    const next = (active + by + n) % n
    /* Whichever book crosses between the front and the back is the one that
       travels furthest, and it is the only one that gets the arc. Going
       forward that is the book leaving the front; going back it is the one
       arriving at it, lifted off the bottom of the pile and laid on top. */
    const traveller = by === 1 ? books[active] : books[next]
    setActive(next)
    setDealing(traveller?.id ?? null)
    window.clearTimeout(clear.current)
    clear.current = window.setTimeout(() => setDealing(null), DEAL_MS)
  }

  /* A tap and a swipe start identically, so they are told apart on the way up
     by how far the pointer went. Measured on the deck rather than on each
     book, so a swipe that begins on a buried corner still turns the pile. */
  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    from.current = { x: event.clientX, y: event.clientY }
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = from.current
    from.current = null
    if (!start) return
    const dx = event.clientX - start.x
    // Vertical wins ties: the page scrolls, and a scroll that turned the deck
    // on the way past would be maddening.
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(event.clientY - start.y)) return
    turn(dx < 0 ? 1 : -1)
  }

  return (
    <div className={styles.deck}>
      <div
        className={styles.stack}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          from.current = null
        }}
      >
        {books.map((book, i) => {
          const slot = (i - active + n) % n
          const buried = slot > DECK_DEPTH
          return (
            <div
              key={book.id}
              className={`${styles.stackItem} ${styles.book}`}
              data-slot={Math.min(slot, DECK_DEPTH)}
              data-buried={buried || undefined}
              data-dealing={book.id === dealing || undefined}
              style={
                {
                  zIndex: n - slot,
                  viewTransitionName: `book-${book.id}`,
                  '--enter-delay': `calc(${i} * var(--stagger))`,
                } as CSSProperties
              }
            >
              {/* The arc lives on its own element. The book outside it is
                  already carrying `translate`/`rotate`/`scale` for its slot
                  and `transform` for the press, and there is no fourth
                  channel left to put a swing in. */}
              <span className={styles.dealt}>
                <BookCover
                  title={book.title}
                  author={book.author}
                  covers={book.covers}
                />
              </span>

              {/* Only what is showing can be reached. The front book has no
                  button over it: it is the one you are already looking at,
                  and a control that does nothing is worse than none. */}
              {slot > 0 && !buried && (
                <button
                  type="button"
                  className={styles.reach}
                  onClick={() => {
                    setActive(i)
                    setDealing(null)
                  }}
                >
                  Bring {book.title} to the front
                </button>
              )}
            </div>
          )
        })}
      </div>

      {n > 1 && (
        <div className={styles.deckControls}>
          <button
            type="button"
            className={styles.deckArrow}
            onClick={() => turn(-1)}
            aria-label="Previous book"
          >
            <ChevronIcon size={20} dir="left" />
          </button>

          {/* Which book of how many. Pips while they can still be counted at a
              glance; past that the count itself is the honest answer, and
              forty dots is not an indicator, it is a texture. */}
          {n <= PIP_MAX ? (
            <div
              className={styles.pips}
              role="status"
              aria-label={`Book ${active + 1} of ${n}`}
            >
              {books.map((book, i) => (
                <span
                  key={book.id}
                  className={styles.pip}
                  data-on={i === active || undefined}
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : (
            <p
              className={styles.tally}
              role="status"
              aria-label={`Book ${active + 1} of ${n}`}
            >
              <span aria-hidden="true">
                {active + 1} / {n}
              </span>
            </p>
          )}

          <button
            type="button"
            className={styles.deckArrow}
            onClick={() => turn(1)}
            aria-label="Next book"
          >
            <ChevronIcon size={20} dir="right" />
          </button>
        </div>
      )}
    </div>
  )
}

/* The full bookshelf: Stack (emotional default) · Shelf · Grid.
   Search here is the entry point to the archive search surface (06). */
function Library() {
  const books = useLibrary()
  const libraryBooks = books ?? []

  /* Tell the add sheet the moment a book it is waiting for is on screen, so
     the cover it is holding can finish travelling here. Before paint, because
     that is when the view transition snapshots the shelf — an effect that ran
     after would be a frame too late. */
  useLayoutEffect(() => {
    shelved(libraryBooks.map((book) => book.id))
  })
  const [view, setView] = useState<ShelfView>(getStoredView)
  const [phase, setPhase] = useState<FadePhase>('idle')
  const [fitted, setFitted] = useState<
    Record<string, { title: string; author: string }>
  >({})
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
            book.id,
            fitSpine(book.title, book.author, SPINES[i % SPINES.length].h),
          ]),
        ),
      )
    }

    measure()
    document.fonts?.ready.then(measure)
    return () => {
      live = false
    }
    // Re-fit when the shelf itself changes: a book added at the front moves
    // every book behind it onto a different spine, with a different budget.
  }, [view, books])

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

        {/* `data-shelf` is how the add sheet knows there is somewhere for a
            book to land. Added here rather than checked by route so it stays
            true by construction: if this is on screen, so are the books. */}
        <div className={phaseClass} data-shelf>
          {/* Only once Dexie has answered. `books` is undefined until then,
              and a full library must not flash its own empty state on the way
              in. */}
          {books && libraryBooks.length === 0 && (
            <p className={styles.empty}>
              Nothing on the shelf yet. Add the book you are reading, and it
              will be here — cover and all.
            </p>
          )}

          {libraryBooks.length > 0 && view === 'Stack' && (
            <StackDeck books={libraryBooks} />
          )}

          {libraryBooks.length > 0 && view === 'Shelf' && (
            <div className={styles.shelf}>
              <div className={styles.shelfRow}>
                {libraryBooks.map((book, i) => {
                  const s = SPINES[i % SPINES.length]
                  const seed = seedFrom(book.title, book.author)
                  const { ground, a, b } = palette(seed)
                  return (
                    <div
                      key={book.id}
                      className={`${styles.spine} ${styles.book}`}
                      style={
                        {
                          /* The same hue the book's own board is tinted, so a
                             title is one colour whichever way the shelf is
                             showing it — and so it does not change colour
                             because something was added before it. */
                          '--spine-hue': ground,
                          /* The two threads the cover is worked in. The spine
                             is stitched in them as well, so a book is one
                             piece of needlework whichever way it is turned. */
                          '--floss-a': floss(a),
                          '--floss-b': floss(b),
                          '--spine-w': `${s.w}px`,
                          '--spine-h': `${s.h}px`,
                          '--spine-tilt': `${s.tilt}deg`,
                          viewTransitionName: `book-${book.id}`,
                          '--enter-delay': `calc(${i} * var(--stagger))`,
                        } as CSSProperties
                      }
                    >
                      {/* The stitching, behind the type. Handed the spine's own
                          box so a stitch is the same length on every book —
                          see SpineArt for why it is not sized by CSS. */}
                      <SpineArt
                        seed={seed}
                        w={s.w}
                        h={s.h}
                        className={styles.spineArt}
                      />
                      <span className={styles.spineTitle} title={book.title}>
                        {fitted[book.id]?.title ?? book.title}
                      </span>
                      <SpineMark seed={seed} className={styles.spineMark} />
                      {/* Often only the surname — see fitSpine — so the whole
                          name has to stay reachable on the spine itself. */}
                      <span className={styles.spineAuthor} title={book.author}>
                        {fitted[book.id]?.author ?? book.author}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className={styles.ledge} aria-hidden="true" />
            </div>
          )}

          {libraryBooks.length > 0 && view === 'Grid' && (
            <div className={styles.grid}>
              {libraryBooks.map((book, i) => (
                <div
                  key={book.id}
                  className={styles.book}
                  style={
                    {
                      viewTransitionName: `book-${book.id}`,
                      '--enter-delay': `calc(${i} * var(--stagger))`,
                    } as CSSProperties
                  }
                >
                  <BookCover
                    title={book.title}
                    author={book.author}
                    covers={book.covers}
                    size="small"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {libraryBooks.length > 0 && (
          <p className={styles.count}>
            {libraryBooks.length} {libraryBooks.length === 1 ? 'book' : 'books'}
          </p>
        )}
      </div>
    </main>
  )
}

export default Library
