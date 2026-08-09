import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import BookCover from '../components/BookCover'
import { coversOf } from '../books/covers'
import { floatPins, isPinned } from '../data/pins'
import { floss, palette } from '../books/CoverArt'
import SpineArt from '../books/SpineArt'
import SpineMark from '../books/SpineMark'
import { seedFrom } from '../books/seed'
import GlassSurface from '../components/GlassSurface'
import LeafButton from '../components/LeafButton'
import Bunny from '../rabbit/Bunny'
import { PREVIEW_BARE } from './home/Draw'
import Results from '../search/Results'
import { useArchive } from '../search/archive'
import search from '../search/search.module.css'
import Sparkle from '../components/Sparkle'
import PaperSurface from '../components/PaperSurface'
import Sheet from '../components/Sheet'
import {
  CheckIcon,
  FeedIcon,
  FilterIcon,
  GridIcon,
  SearchIcon,
  ShelfIcon,
  PinIcon,
  SortIcon,
} from '../components/TabIcons'
import { formatsOf, type Book, type Entry } from '../data/db'
import { KIND } from '../journey/kinds'
import { KEEP, keptLabel } from '../journey/lexicon'
import { useKeepCounts, useLatestKeeps, useLibrary } from '../data/useLibrary'
import { shelved } from '../motion/shelfLanding'
import { runSwitch } from '../motion/viewSwitch'
import type { FadePhase } from '../motion/viewSwitch'
import pageStyles from './page.module.css'
import styles from './Library.module.css'

/* Stack is gone, at the owner's call, and the reasoning holds: a pile you
   deal through one book at a time is charming at five books and useless at
   thirty, and a default view that stops working when the library succeeds is
   the wrong default. Three layouts remain, each with a job. */
type ShelfView = 'Shelf' | 'Grid' | 'Feed'
const VIEW_KEY = 'flyleaf-shelf-view'

const VIEWS: { id: ShelfView; Icon: typeof ShelfIcon; hint: string }[] = [
  { id: 'Shelf', Icon: ShelfIcon, hint: 'standing, spines out' },
  { id: 'Grid', Icon: GridIcon, hint: 'covers in a grid' },
  { id: 'Feed', Icon: FeedIcon, hint: 'one to a row, with the last thing kept' },
]

/* ---- Sorting and sifting the shelf ----

   The sort answers "in what order"; the sieve answers "which ones at all".
   Both live in dropdown sheets beside the search field, both persist, and
   both move the books with the same morph the view switch uses — a book
   sliding to its sorted place says what happened better than a list
   repainting ever could. */

type ShelfSort = 'added' | 'title' | 'author' | 'started' | 'finished' | 'memories'
const SORT_KEY = 'flyleaf-shelf-sort'

const SORTS: { id: ShelfSort; label: string; hint: string }[] = [
  { id: 'added', label: 'Recently added', hint: 'newest on the shelf first' },
  { id: 'title', label: 'Title', hint: 'A to Z' },
  { id: 'author', label: 'Author', hint: 'A to Z, then by title' },
  { id: 'started', label: 'Recently started', hint: 'the book you began last, first' },
  { id: 'finished', label: 'Recently finished', hint: 'the book you closed last, first' },
  { id: 'memories', label: 'Most memories', hint: 'the books you have kept the most from' },
]

type ShelfSieve =
  | 'all'
  | 'reading'
  | 'finished'
  | 'unstarted'
  | 'kept'
  | 'physical'
  | 'digital'
  | 'audio'
const SIEVE_KEY = 'flyleaf-shelf-sieve'

const SIEVES: { id: ShelfSieve; label: string; hint: string }[] = [
  { id: 'all', label: 'All books', hint: 'the whole shelf' },
  { id: 'reading', label: 'Still reading', hint: 'started and not yet finished' },
  { id: 'finished', label: 'Finished', hint: 'read to the end' },
  { id: 'unstarted', label: 'Not started yet', hint: 'waiting for you' },
  { id: 'kept', label: 'Has memories', hint: 'something saved from it' },
  { id: 'physical', label: 'On paper', hint: 'the physical copies' },
  { id: 'digital', label: 'On a screen', hint: 'the ebooks' },
  { id: 'audio', label: 'Audiobooks', hint: 'the ones you listen to' },
]

/* Missing dates sort to the back, not to 1970. `??`-ing an absent ISO date to
   the empty string and comparing descending does exactly that. */
function arrange(books: Book[], sort: ShelfSort, counts: Record<number, number>): Book[] {
  const by = [...books]
  switch (sort) {
    case 'title':
      return by.sort((a, b) => a.title.localeCompare(b.title))
    case 'author':
      return by.sort(
        (a, b) => a.author.localeCompare(b.author) || a.title.localeCompare(b.title),
      )
    case 'started':
      return by.sort((a, b) => (b.startedOn ?? '').localeCompare(a.startedOn ?? ''))
    case 'finished':
      return by.sort((a, b) => (b.finishedOn ?? '').localeCompare(a.finishedOn ?? ''))
    case 'memories':
      return by.sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0))
    default:
      return by // useLibrary already answers newest-added first
  }
}

function sift(books: Book[], sieve: ShelfSieve, counts: Record<number, number>): Book[] {
  switch (sieve) {
    case 'reading':
      return books.filter((b) => b.startedOn && !b.finishedOn)
    case 'finished':
      return books.filter((b) => b.finishedOn)
    case 'unstarted':
      return books.filter((b) => !b.startedOn && !b.finishedOn)
    case 'kept':
      return books.filter((b) => (counts[b.id] ?? 0) > 0)
    case 'physical':
    case 'digital':
    case 'audio':
      return books.filter((b) => formatsOf(b).includes(sieve))
    default:
      return books
  }
}

/** The way into a book's journey, laid over the book itself.

    An overlay rather than a wrapper because all three views draw a book
    differently and two of them care exactly where their children sit: a spine
    is a vertical flex row of stitching, title, mark and author, and a link
    around that lot would be a new box in the middle of it. Sitting on top
    instead means the shelf keeps the layout it was built with, and the whole
    cover — not just its title — is the target, which is the 44px rule met by
    the object rather than by padding added around a word.

    The label is real text, hidden by `.reach`, so this reads as "Open The
    Bell Jar" to a screen reader rather than as an unlabelled link. */
function OpenJourney({ book }: { book: Book }) {
  return (
    <Link to={`/book/${book.id}`} className={styles.reach}>
      Open {book.title}
    </Link>
  )
}

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

/* ---- Filling a shelf, then starting the next one ----
   A bookcase is not one board. When a board runs out of room the next book
   goes on the shelf below it, and that is the whole rule here: pack books
   left to right until the next one would not fit, then open a new board.

   Packed in JavaScript rather than with `flex-wrap`, because wrapping gives
   you rows of books and no shelves for them to stand on — one `.ledge` cannot
   draw itself under four rows. Chunking here means each row gets its own
   board, which is what a bookcase actually looks like.

   The widths are the ones the stylesheet will use, taken from the same table
   the spines are sized from, so the arithmetic and the layout cannot drift.
   Index is global, never per-row: a book keeps its thickness when the book
   before it moves to another shelf. */
const SHELF_INSET = 16 // .shelfRow padding-inline, each end (--space-4)
const SHELF_GAP = 6 // the gap between two books, per the stylesheet
const SHELF_LEAN = 9 // the last book's 3° lean and its 3px shoulder

type Shelved = { book: Book; i: number }

function packShelf(books: Book[], room: number): Shelved[][] {
  const rows: Shelved[][] = []
  if (!books.length) return rows
  // Before the board has been measured there is no width to pack against, so
  // everything goes on one shelf — which is what the first paint has always
  // shown, and it is corrected in the same frame the observer fires.
  const fits = room > 0 ? room - SHELF_INSET * 2 - SHELF_LEAN : Infinity
  let row: Shelved[] = []
  let used = 0
  books.forEach((book, i) => {
    const w = SPINES[i % SPINES.length].w
    const step = row.length ? SHELF_GAP + w : w
    // Never leave a board empty: a book wider than the whole shelf still has
    // to stand somewhere, and one book overhanging is better than a blank row.
    if (row.length && used + step > fits) {
      rows.push(row)
      row = [{ book, i }]
      used = w
    } else {
      row.push({ book, i })
      used += step
    }
  })
  rows.push(row)
  return rows
}

/* One book, stood on its end. Split out of the shelf when the shelf grew a
   second board: the same spine now gets rendered from inside a row loop inside
   a board loop, and two levels of nesting around fifty lines of markup is how
   a difference creeps in between the top shelf and the one below it. */
function Spine({
  book,
  i,
  fit,
  lean,
}: {
  book: Book
  i: number
  fit?: { title: string; author: string }
  lean: boolean
}) {
  const s = SPINES[i % SPINES.length]
  const seed = seedFrom(book.title, book.author)
  const { ground, a, b } = palette(seed)
  return (
    <div
      className={`${styles.spine} ${styles.book}`}
      data-lean={lean || undefined}
      style={
        {
          /* The same hue the book's own board is tinted, so a title is one
             colour whichever way the shelf is showing it — and so it does not
             change colour because something was added before it. */
          '--spine-hue': ground,
          /* The two threads the cover is worked in. The spine is stitched in
             them as well, so a book is one piece of needlework whichever way
             it is turned. */
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
      {/* The stitching, behind the type. Handed the spine's own box so a stitch
          is the same length on every book — see SpineArt for why it is not
          sized by CSS. */}
      <SpineArt seed={seed} w={s.w} h={s.h} className={styles.spineArt} />
      <span className={styles.spineTitle} title={book.title}>
        {fit?.title ?? book.title}
      </span>
      <SpineMark seed={seed} className={styles.spineMark} />
      {/* Often only the surname — see fitSpine — so the whole name has to stay
          reachable on the spine itself. */}
      <span className={styles.spineAuthor} title={book.author}>
        {fit?.author ?? book.author}
      </span>
      <OpenJourney book={book} />
    </div>
  )
}

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
  // 'Stack' may still be on devices that chose it before it was retired.
  // Grid is the default — the owner's call: covers are the fastest read of a
  // shelf, and the one layout that scales from three books to three hundred.
  return VIEWS.some((v) => v.id === stored) ? (stored as ShelfView) : 'Grid'
}

function getStoredSort(): ShelfSort {
  const stored = localStorage.getItem(SORT_KEY)
  return SORTS.some((s) => s.id === stored) ? (stored as ShelfSort) : 'added'
}

function getStoredSieve(): ShelfSieve {
  const stored = localStorage.getItem(SIEVE_KEY)
  return SIEVES.some((s) => s.id === stored) ? (stored as ShelfSieve) : 'all'
}

/* ---- Feed: the shelf as a reading log ----

   The other three views all answer "which books do I have". This one answers
   "what have I been doing in them", which is a different question and the one
   a reader actually opens the app holding. So the row leads with the book but
   is mostly the last thing kept from it, printed on that keep's own tint — the
   same surface the journey prints it on, so a reader recognises a quote as a
   quote before reading a word of it.

   A book with nothing kept yet is not hidden and not apologised for. It gets a
   line saying so, because an empty row is the most useful thing on the screen:
   it is the book you meant to write something about. */

/** What the excerpt says when the keep has no words of its own. A voice note
    and a picture are not text, and printing an empty string under a title
    would read as a bug rather than as a recording. */
function excerpt(keep: Entry) {
  if (keep.text?.trim()) return keep.text.trim()
  if (keep.type === 'voice') {
    const secs = Math.round(keep.duration ?? 0)
    return secs > 0 ? `${secs} seconds, in your own voice.` : 'A recording.'
  }
  if (keep.type === 'image') return 'A picture from the page.'
  return `A ${KEEP[keep.type].one}.`
}

/** The one thing the shelf can say about a book without opening it: that it is
    finished, or else how long it is.

    IT USED TO CLAIM TO SAY HOW FAR IN THE READER WAS, and it could not. That
    number lived in a field nothing in the app ever wrote, so it was only ever
    filled in on the demo shelf. A page count comes from the search that
    shelved the book and is true for every book that has one. */
function bookmark(book: Book) {
  if (book.finishedOn) return 'Finished'
  return book.pages ? `${book.pages} pages` : null
}

function FeedRow({
  book,
  keep,
  style,
}: {
  book: Book
  keep: Entry | undefined
  style?: CSSProperties
}) {
  const where = bookmark(book)
  const kind = keep ? KIND[keep.type] : null

  return (
    <li className={`${styles.feedRow} ${styles.book}`} style={style}>
      {/* Thumb, so the drawn board carries its motif and nothing else. At a
          68px jacket the typeset title is a grey smudge, and the row sets the
          same title beside it in type you can actually read — printing it on
          both made the board look like a mistake, and made a screen reader say
          every book's name twice before reaching what was kept from it. */}
      <div className={styles.feedJacket}>
        <BookCover
          title={book.title}
          author={book.author}
          covers={coversOf(book)}
          size="thumb"
        />
      </div>

      <div className={styles.feedBody}>
        <h2 className={styles.feedTitle}>{book.title}</h2>
        <p className={styles.feedAuthor}>{book.author}</p>
        {where && <p className={styles.feedWhere}>{where}</p>}

        {keep && kind ? (
          <PaperSurface tone={kind.tone} className={styles.feedKeep}>
            <span className={styles.feedKeepHead}>
              <kind.Icon size={15} />
              <span className={styles.feedKeepKind}>{kind.one}</span>
              <span className={styles.feedKeepWhen}>{keptLabel(keep.keptOn)}</span>
            </span>
            {/* Clamped rather than cut in the string, so the whole keep is
                still on the page for anything that reads it rather than
                looks at it — and so the clamp follows the column width
                instead of guessing at it. */}
            <p className={styles.feedKeepText}>{excerpt(keep)}</p>
          </PaperSurface>
        ) : (
          <p className={styles.feedNothing}>Nothing kept from this one yet.</p>
        )}
      </div>

      <OpenJourney book={book} />
    </li>
  )
}

/* The full bookshelf: Stack (emotional default) · Shelf · Grid · Feed.
   Search here is the entry point to the archive search surface (06). */
function Library() {
  const books = useLibrary()
  /* Memoised, not `books ?? []` inline: while Dexie is opening, an inline
     fallback is a NEW empty array on every render, and everything derived
     from it — `shown`, and the spine-fitting effect keyed on `shown` —
     re-derives forever. That effect sets state, so the fresh identity was a
     render loop, found the hard way. */
  const libraryBooks = useMemo(() => books ?? [], [books])
  const [view, setView] = useState<ShelfView>(getStoredView)
  const [sort, setSort] = useState<ShelfSort>(getStoredSort)
  const [sieve, setSieve] = useState<ShelfSieve>(getStoredSieve)
  const [phase, setPhase] = useState<FadePhase>('idle')
  // Which of the two dropdown sheets is open, if either.
  const [tool, setTool] = useState<'sort' | 'sieve' | null>(null)

  /* Counts drive one sort and one sieve, but they are asked for always:
     Dexie counts inside an index without materialising rows, and having them
     already here means choosing "Most memories" moves the books in the same
     frame as the tap. */
  const counts = useKeepCounts(libraryBooks.map((book) => book.id))

  /* The shelf as the reader has asked to see it. Sift first, then arrange —
     order-of-operations matters only for work, not results, and sorting the
     survivors is less work. */
  const shown = useMemo(
    /* Pins float last, on top of whatever the reader asked for. A pin is not
       a seventh sort — it says "these two or three stay where I can see
       them", and that has to hold true whether the shelf is by title, by
       date, or by how much is kept in it. A pinned book that a sieve has
       ruled out stays ruled out: the reader asked to see only finished books
       and a pin is not an exemption from the question. */
    () => floatPins(arrange(sift(libraryBooks, sieve, counts ?? {}), sort, counts ?? {})),
    [libraryBooks, sieve, sort, counts],
  )

  /* Asked for unconditionally rather than only in the Feed view: it is one
     indexed row per book, and running it here means switching into the Feed
     shows the keeps in the same frame as the covers instead of a beat later. */
  const latest = useLatestKeeps(shown.map((book) => book.id))

  /* Tell the add sheet the moment a book it is waiting for is on screen, so
     the cover it is holding can finish travelling here. Before paint, because
     that is when the view transition snapshots the shelf — an effect that ran
     after would be a frame too late. */
  useLayoutEffect(() => {
    shelved(shown.map((book) => book.id))
  })

  /* THE ARCHIVE SEARCH (06) LIVES HERE, not in a tab of its own.

     What the reader is looking for is nearly always a thing they kept, and
     the things they kept are the books on this shelf — so the field that
     finds them belongs over the shelf, and typing in it replaces the shelf
     with what it found rather than opening a second screen to hold the
     answer.

     Two scopes, said in words rather than implied: everything you have kept,
     and the catalogue of books you do not have yet. The second hands off to
     the add sheet with the words already typed, because the catalogue search
     and the add flow are the same act — you do not look a book up in order to
     read about it, you look it up in order to shelve it. */
  const [query, setQuery] = useState('')
  const found = useArchive(query)
  const asking = query.trim().length >= 2

  /* Handing the words to the add sheet, which is the one place in the app
     that knows how to turn a catalogue result into a shelved book with a
     cover. An event rather than a prop: the sheet is mounted once at the root
     beside the two shells that open it, and threading a setter through the
     router to reach it would make every route that never searches carry the
     add flow's state. */
  function findBook(words: string) {
    window.dispatchEvent(new CustomEvent('flyleaf-find-book', { detail: words.trim() }))
  }

  /* Open a dropdown sheet on the choice that is already in force.

     `showModal` gives focus to the first focusable thing inside the dialog,
     and these sheets carry no close button — so the first focusable thing is
     a *choice*, always the top one, whatever is actually set. The focus ring
     (2px of --color-accent-text, the darkest ink in the sheet) reads louder
     than the chosen row's own marks, which are a pale wash and a small check
     — two rows wearing two different "this one" signals, the wrong one
     wearing the stronger. Focusing the chosen row instead puts both signals
     on the same row. It is also where a keyboard reader wants to start.

     Sheet's own showModal runs before this: it is the child, and child
     effects run first. */
  const chosenRow = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (tool) chosenRow.current?.focus()
  }, [tool])
  const [fitted, setFitted] = useState<
    Record<string, { title: string; author: string }>
  >({})
  const timers = useRef<number[]>([])

  /* How wide the bookcase actually is. Measured rather than taken from the
     column token, because the column is a clamp against the viewport and the
     rail moves it again at 1024 — the only number that can be trusted is the
     one the box ends up with. A ResizeObserver, not a window listener: the
     case also changes width when the side rail appears without the window
     doing anything. */
  const board = useRef<HTMLDivElement>(null)
  const [room, setRoom] = useState(0)
  useEffect(() => {
    const el = board.current
    if (!el) return
    const watch = new ResizeObserver(([entry]) => {
      setRoom(entry.contentRect.width)
    })
    watch.observe(el)
    return () => watch.disconnect()
  }, [view, books])

  const shelfRows = useMemo(() => packShelf(shown, room), [shown, room])

  /* Measure before paint, so a title is never briefly shown at a length that
     doesn't fit. Then measure again when the fonts land: on a cold load the
     first pass runs against the fallback serif, whose metrics are not the
     book face's, and a budget measured against the wrong face is the wrong
     budget. */
  useLayoutEffect(() => {
    if (view !== 'Shelf') return

    let live = true
    const measure = () => {
      if (!live) return
      typeCache.clear()
      setFitted(
        Object.fromEntries(
          shown.map((book, i) => [
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
    // Re-fit when the shelf itself changes: a book added at the front — or a
    // sort moving one — puts every book behind it on a different spine, with
    // a different budget.
  }, [view, shown])

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

  /* Sorting and sifting ride the same morph as the view switch: every book
     carries a view-transition name, so re-ordering the array slides each one
     to its new place instead of repainting the list. */
  function orderBy(next: ShelfSort) {
    setTool(null)
    if (next === sort) return
    localStorage.setItem(SORT_KEY, next)
    runSwitch(() => setSort(next), { setPhase, schedule })
  }

  function showOnly(next: ShelfSieve) {
    setTool(null)
    if (next === sieve) return
    localStorage.setItem(SIEVE_KEY, next)
    runSwitch(() => setSieve(next), { setPhase, schedule })
  }

  // Only the cross-fade path ever sets a phase, so a non-idle phase means the
  // wrapper is mid-fade. Morph leaves it alone and moves the books instead.
  const phaseClass = phase !== 'idle' ? styles[phase] : ''

  const hasBooks = libraryBooks.length > 0 && !PREVIEW_BARE
  /* Named once and used twice — the branch that renders the card and the class
     that centres it must not be able to disagree about whether the shelf is
     empty. */
  const shelfBare = Boolean(books) && (PREVIEW_BARE || libraryBooks.length === 0)

  return (
    <main className={pageStyles.page}>
      {/* The view is on the column because on a desktop screen the three views
          do not want the same width, and only CSS needs to know. A shelf and a
          contact sheet are objects laid side by side — width buys more books.
          The feed is a list of rows with an excerpt in them, and a list widened
          to 1100px is a line of text nobody can track back to the start of. So
          Shelf and Grid open up past 1024 and Feed holds its measure. */}
      <div
        className={`${pageStyles.column} ${styles.shelfColumn}`}
        data-view={view}
      >
        {/* The name and, on a narrow column, the folded-up display control.
            Nothing else may share this line: the only way "The Library" is
            never allowed to wrap is that a display serif never competes for
            the row with anything that grows. */}
        <header className={styles.masthead}>
          <div className={styles.mastheadName}>
            <h1 className={styles.title}>
              The Library <Sparkle size={15} className={styles.spark} />
            </h1>
            <p className={styles.subtitle}>every book you keep</p>
          </div>

          {/* The three view tabs live up here beside the name — the owner's
              call, and the right one: how the shelf is laid out is a property
              of the shelf, not of the search. Three pills always fit beside
              the title, so the old fold-away button this replaced is gone
              entirely. */}
          {hasBooks && (
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
          )}
        </header>

        {/* One toolbar: search flexes; sort and filter hold the corner. They
            share a row because they are the same kind of thing — ways of
            asking the shelf a question — and none of it arrives until there
            are books; a search field over an empty shelf is a promise the
            screen cannot keep. */}
        {hasBooks && (
          <div className={styles.toolbar}>
            <GlassSurface className={styles.search}>
              <div className={styles.searchInner}>
                <SearchIcon size={18} />
                {/* The placeholder is measured, not guessed: this field is
                    151px wide on a 375px phone once the sort and filter pills
                    have taken their corner, and "Search everything you have
                    kept" needed 243px of it, so the end of the sentence ran
                    off the field. The whole sentence is still said in the
                    aria-label, where length costs nothing. */}
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder="Search everything"
                  aria-label="Search your books and memories"
                  autoComplete="off"
                  spellCheck={false}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </GlassSurface>
            <GlassSurface className={styles.switcher}>
              <div className={styles.switcherInner}>
                {/* aria-pressed says "a non-default choice is in force", so a
                    glance — or a screen reader pass — can tell a sorted,
                    sifted shelf from the whole one. */}
                <button
                  type="button"
                  className={styles.viewPill}
                  aria-haspopup="dialog"
                  aria-pressed={sort !== 'added'}
                  aria-label={`Sort — ${SORTS.find((s) => s.id === sort)?.label}`}
                  title="Sort the shelf"
                  onClick={() => setTool('sort')}
                >
                  <SortIcon size={20} />
                </button>
                <button
                  type="button"
                  className={styles.viewPill}
                  aria-haspopup="dialog"
                  aria-pressed={sieve !== 'all'}
                  aria-label={`Filter — ${SIEVES.find((s) => s.id === sieve)?.label}`}
                  title="Show only some of the shelf"
                  onClick={() => setTool('sieve')}
                >
                  <FilterIcon size={20} />
                </button>
              </div>
            </GlassSurface>
          </div>
        )}

        {/* The two scopes. They arrive with the words rather than sitting
            over an empty field, because until something is typed there is no
            question for them to answer. */}
        {asking && (
          <GlassSurface className={search.scopes}>
            <button type="button" className={search.scope} aria-pressed={true}>
              Everything you kept
            </button>
            <button
              type="button"
              className={search.scope}
              aria-pressed={false}
              onClick={() => findBook(query)}
            >
              Find a book
            </button>
          </GlassSurface>
        )}

        {asking && found.status === 'done' && (
          <Results
            archive={found.archive}
            query={found.query}
            onFindBook={() => findBook(query)}
          />
        )}

        {asking && found.status !== 'done' && (
          <p className={styles.empty}>Looking through everything you have kept…</p>
        )}

        {!asking && (
          <>
        {/* `data-shelf` is how the add sheet knows there is somewhere for a
            book to land. Added here rather than checked by route so it stays
            true by construction: if this is on screen, so are the books. */}
        <div
          className={[phaseClass, shelfBare ? styles.bareStage : '']
            .filter(Boolean)
            .join(' ')}
          data-shelf
        >
          {/* Only once Dexie has answered. `books` is undefined until then,
              and a full library must not flash its own empty state on the way
              in. */}
          {shelfBare && (
            <PaperSurface taped rotate={-0.8} className={styles.bare}>
              {/* THE RABBIT, ASLEEP — not the two leaning spines that were
                  here. A drawing of a shelf on the screen that says the shelf
                  is empty is the sentence again in ink; it adds a picture and
                  no meaning. The creature adds the one thing a still drawing
                  cannot: a state. Nothing is happening in this library, so
                  nothing is happening to the rabbit either — eyes shut, ears
                  gone soft, breathing slowed to two-thirds. The reader reads
                  the situation off the animal before reading the line. */}
              {/* A side, not a width: every pose is the same sitting animal in
                  a square box.

                  180 rather than the 252 the card would allow. The card
                  measures 316 with 32 of paper padding each side, so 252 is the
                  content box to the pixel — and a square drawing at 252 is 252
                  tall as well, which is most of the card before a word of copy
                  is read. 180 leaves 36 clear either side inside the padding,
                  and still reads larger than the 152 on a book's thread, which
                  is right: an empty library is the bigger silence. */}
              <Bunny pose="sleep" size={180} />
              <p className={styles.bareLine}>Nothing on the shelf yet.</p>
              <p className={styles.bareHint}>
                Add the book you are reading and it lands here — cover, spine
                and all. The rabbit will get up.
              </p>
              <LeafButton onClick={() => findBook('')}>Add a book</LeafButton>
            </PaperSurface>
          )}

          {hasBooks && view === 'Shelf' && (
            <div className={styles.shelf} ref={board}>
              {shelfRows.map((row, r) => (
                /* A board per row, each with its own ledge under it. The key is
                   the first book on the shelf rather than the row number, so a
                   board keeps its identity when a book added above it pushes
                   the whole case down a place. */
                <div className={styles.board} key={row[0].book.id}>
                  <div className={styles.shelfRow}>
                    {row.map(({ book, i }) => (
                      <Spine
                        key={book.id}
                        book={book}
                        i={i}
                        fit={fitted[book.id]}
                        /* Only the very last book in the case leans into the
                           empty run. A book at the end of a full shelf has a
                           shelf under it, not room. */
                        lean={r === shelfRows.length - 1 && i === shown.length - 1}
                      />
                    ))}
                  </div>
                  <div className={styles.ledge} aria-hidden="true" />
                </div>
              ))}
            </div>
          )}

          {/* The sieve can honestly answer "none of them". That is said in
              words rather than by a silent blank, and the whole shelf is one
              tap away — on the filter that caused it. */}
          {hasBooks && shown.length === 0 && (
            <p className={styles.empty}>
              Nothing on the shelf matches “
              {SIEVES.find((s) => s.id === sieve)?.label.toLowerCase()}”.
            </p>
          )}

          {hasBooks && view === 'Feed' && (
            <ol className={styles.feed}>
              {shown.map((book, i) => (
                <FeedRow
                  key={book.id}
                  book={book}
                  keep={latest?.[book.id]}
                  /* The stagger and the shared name are on the row rather
                     than inside it, so the cover that flies here from the
                     add sheet lands in the same place it does in the Grid. */
                  style={
                    {
                      viewTransitionName: `book-${book.id}`,
                      '--enter-delay': `calc(${i} * var(--stagger))`,
                    } as CSSProperties
                  }
                />
              ))}
            </ol>
          )}

          {hasBooks && view === 'Grid' && (
            <div className={styles.grid}>
              {shown.map((book, i) => (
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
                    covers={coversOf(book)}
                    size="small"
                  />
                  {/* Why this one is at the front. Without it a pinned shelf
                      just looks like a shelf sorted wrong — the reader can
                      see the order but not the reason for it. Small, on the
                      jacket's corner, and silent to screen readers because
                      the row's own label already says it. */}
                  {isPinned(book) && (
                    <span className={styles.pinned} aria-hidden="true">
                      <PinIcon size={12} filled />
                    </span>
                  )}
                  <OpenJourney book={book} />
                </div>
              ))}
            </div>
          )}
        </div>

        {hasBooks && (
          <p className={styles.count}>
            {sieve === 'all'
              ? `${shown.length} ${shown.length === 1 ? 'book' : 'books'}`
              : `${shown.length} of ${libraryBooks.length} ${
                  libraryBooks.length === 1 ? 'book' : 'books'
                } — ${SIEVES.find((s) => s.id === sieve)?.label.toLowerCase()}`}
          </p>
        )}
          </>
        )}

        {/* The two dropdowns, written out in words. A toolbar glyph has to
            make do with a funnel; this is where a reader finds out what it
            means. One Sheet element per tool so each keeps its own label. */}
        <Sheet
          open={tool === 'sort'}
          onClose={() => setTool(null)}
          label="Sort the shelf"
          name="sort"
        >
          <h2 className={styles.sheetTitle}>In what order</h2>
          <div className={styles.viewList} role="group" aria-label="Sort the shelf">
            {SORTS.map(({ id, label, hint }) => (
              <button
                key={id}
                ref={tool === 'sort' && sort === id ? chosenRow : null}
                type="button"
                className={styles.viewRow}
                aria-pressed={sort === id}
                onClick={() => orderBy(id)}
              >
                <span className={styles.viewText}>
                  <span className={styles.viewLabel}>{label}</span>
                  <span className={styles.viewHint}>{hint}</span>
                </span>
                {sort === id && (
                  <span className={styles.viewTick}>
                    <CheckIcon size={18} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </Sheet>

        <Sheet
          open={tool === 'sieve'}
          onClose={() => setTool(null)}
          label="Show only some of the shelf"
          name="sieve"
        >
          <h2 className={styles.sheetTitle}>Show only</h2>
          <div className={styles.viewList} role="group" aria-label="Show only">
            {SIEVES.map(({ id, label, hint }) => (
              <button
                key={id}
                ref={tool === 'sieve' && sieve === id ? chosenRow : null}
                type="button"
                className={styles.viewRow}
                aria-pressed={sieve === id}
                onClick={() => showOnly(id)}
              >
                <span className={styles.viewText}>
                  <span className={styles.viewLabel}>{label}</span>
                  <span className={styles.viewHint}>{hint}</span>
                </span>
                {sieve === id && (
                  <span className={styles.viewTick}>
                    <CheckIcon size={18} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </Sheet>
      </div>
    </main>
  )
}

export default Library
