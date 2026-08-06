/* The journey — everything one reader kept from one book, on one page.

   One bar stands still and everything else is one scroll.

   **The chrome is pinned.** Back, share, draft, delete — the verbs that belong
   to the book rather than to the reading — and, once the book itself has gone
   up, the book's name.

   **Everything else scrolls, and that is the whole of the animation.** The
   cover, the record and the dates are the first thing in the thread rather
   than a pinned block that folds itself away as you read. They used to be
   pinned: a 192px head that collapsed once the thread had moved 72px, which
   meant it had to give back 176px the reader had never scrolled — the thread
   outran the finger by double and went on moving for a sixth of a second after
   the finger stopped. Nothing in the timing function could fix that; a head
   taller than the distance that triggers it has to shove the page. Scrolled
   instead, it leaves at exactly the speed of the thumb, comes back at exactly
   the speed of the thumb, and turns around mid-gesture because it is not an
   animation at all.

   The sift rail is what stays: it sticks to the top of the thread as the book
   passes under it, and takes its glass at the moment it lands there.

   **The thread is the journey.** A dashed line runs down the gutter; every
   keep is a notch on it with its kind knotted at the line; the first notch is
   the opening — the day the book was cracked, written by the app in the
   book's own voice, and never a card: it is an inscription, not a keep.

   Kinds are told apart by structure, not tint — see journey/Keep.tsx. What
   can be done to a keep is done on the keep: date, share, edit and delete all
   live in the card's own foot, and there is no per-card menu.

   The app's own tab bar and "+" are hidden on this route by App: a book is a
   room you go into and come back out of, and a second differently-shaped add
   button three inches from the first was the app asking the reader to work
   out which "+" they meant. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import BookCover from '../components/BookCover'
import FormatRow from '../components/FormatRow'
import GlassSurface from '../components/GlassSurface'
import Mascot from '../components/Mascot'
import Sheet from '../components/Sheet'
import Sparkle from '../components/Sparkle'
import CalendarPicker from '../components/date/CalendarPicker'
import { shortDate, spanPair, todayISO } from '../components/date/dates'
import {
  CheckIcon,
  ChevronIcon,
  CloseIcon,
  FairCopyIcon,
  KeepIcon,
  OpeningIcon,
  ShareIcon,
  SortIcon,
  TrashIcon,
} from '../components/TabIcons'
import { formatsOf, type Entry, type EntryType } from '../data/db'
import { useBook, useEntries } from '../data/useBook'
import { did } from '../onboarding/progress'
import Keep from '../journey/Keep'
import KeepSheet from '../journey/KeepSheet'
import KeepsakeSheet from '../journey/KeepsakeSheet'
import PlateSheet from '../journey/PlateSheet'
import FairCopySheet from '../journey/FairCopySheet'
import BookMenu from '../journey/BookMenu'
import { KIND, KINDS, SIDE } from '../journey/kinds'
import { epigraph, keptLabel } from '../journey/lexicon'
import { finish, removeKeep, setDates, setFormats } from '../journey/keeps'
import {
  ALL,
  ORDERS,
  arrange,
  runsForward,
  toggleType,
  type Order,
  type Row,
  type Sift,
  type Tie,
} from '../journey/order'
import pageStyles from './page.module.css'
import sheet from '../journey/sheet.module.css'
import styles from './BookJourney.module.css'

/** How long a deleted keep stays undoable. Long enough to read the sentence
    and change your mind, short enough that it is gone by the time the reader
    has scrolled somewhere else and forgotten what it was about. */
const UNDO_MS = 9000

/** How long after the thread stops moving the floating action looks at what it
    is standing on. Long enough that the tail of a flick doesn't trigger it,
    short enough that it has settled before a thumb arrives. */
const SETTLE_MS = 140

/** The furthest the action will step up off a verb row, and the reach the
    circles have past their drawing — the same (--tap-min - --act-size) / 2 the
    row itself is built on, and 8px of air so a cleared row is visibly cleared.

    The cap is a guard, not a target: the step is measured, and the measurement
    is bounded by the action's own height plus a target's, so it lands near 100
    at worst. Verb rows sit at least 177px apart on the densest thread in the
    app, so a step this size can never carry the action onto a second row. */
const STEP_MAX = 120
const REACH = 5
const AIR = 8

interface Undo {
  what: string
  restore: () => Promise<void>
}

/* The order, in the fewest words that still name it. Used on the control
   itself, where there is only ever room for a phrase — the sheet behind it is
   where the orders get their full sentence. */
const SORT_SHORT: Record<Order, string> = {
  kept: 'as kept',
  newest: 'newest',
  book: 'by page',
}

/* ── One notch ────────────────────────────────────────────────────────────
   The gutter holds the thread and the knot; the card hangs off it. The card
   carries its own date in its foot, so the notch adds nothing but the knot. */

interface NotchProps {
  keep: Entry
  tie?: Tie
  /* False once every visible keep is the same substance — see `showSide` at
     the call site. */
  showSide: boolean
  onEdit: (keep: Entry) => void
  onShare: (keep: Entry) => void
  onDelete: (keep: Entry) => void
}

function Notch({ keep, tie, showSide, onEdit, onShare, onDelete }: NotchProps) {
  const { Icon, hue, side } = KIND[keep.type]
  return (
    <li
      id={`keep-${keep.id}`}
      className={styles.notch}
      style={
        {
          '--kind': `var(${hue})`,
          ...(tie ? { '--weight': tie.weight } : {}),
        } as CSSProperties
      }
      data-tie={tie ? '' : undefined}
      data-up={tie?.up ? '' : undefined}
      data-down={tie?.down ? '' : undefined}
      data-kind={keep.type}
    >
      <span className={styles.gutter} aria-hidden="true">
        <span className={styles.knot}>
          <Icon size={13} />
        </span>
      </span>
      <div className={styles.hang}>
        {/* When, where, and which substance. It used to name the *kind* here
            too, on all thirteen keeps at once — a tag on a quote that already
            looks like a quote is a caption on a photograph of itself, and the
            knot in the gutter carries that now.

            What it does say is whether this came out of the book or out of the
            reader. That is the one thing Home promised and the page could not
            otherwise show, and it belongs in the keep's own line rather than
            over the rail as something to sift by. Set in the book's serif
            against the mono, because it is the page talking about itself and
            not another field.

            It is its own child of the line rather than a tail on the date, so
            the line's space-between actually has two things to push apart and
            the substance lands on the trailing edge — the date holds the left
            margin the card's text already holds, the whisper holds the right,
            and the empty middle is what makes the row read as balanced.

            And it leaves when it stops being a contrast: with one substance on
            screen the trailing edge is the same two words thirteen times, and
            the empty middle stops reading as balance and starts reading as a
            phrase adrift. */}
        <p className={styles.when}>
          <span className={styles.whenDay}>
            {keptLabel(keep.keptOn)}
            {keep.page !== undefined && ` · p. ${keep.page}`}
          </span>
          {showSide && <em className={styles.whenSide}>{SIDE[side].word}</em>}
        </p>
        <Keep keep={keep} onEdit={onEdit} onShare={onShare} onDelete={onDelete} />
      </div>
    </li>
  )
}

function BookJourney() {
  const { id } = useParams()
  const navigate = useNavigate()
  const parsed = Number(id)
  const bookId = Number.isFinite(parsed) ? parsed : undefined

  const book = useBook(bookId)

  // Opening a book's thread is the second step of the first page, and it is a
  // visit rather than a keep — so it records itself once a real book is under
  // it, not merely because the route matched.
  useEffect(() => {
    if (book) did('journey')
  }, [book])
  const entries = useEntries(bookId)

  const [sift, setSift] = useState<Sift>(ALL)
  /* Two nulls rather than one union: `adding` carries which kind the sheet
     opens on, `editing` carries the keep it opens filled in, and a sheet can
     never be both. */
  const [adding, setAdding] = useState<EntryType | null>(null)
  const [editing, setEditing] = useState<Entry | null>(null)
  /* Which keep is being made into a picture. Null closes the plate sheet; the
     sheet itself remembers the last one it was handed, so the picture doesn't
     blink out from under the closing animation. */
  const [sharing, setSharing] = useState<Entry | null>(null)
  const [picking, setPicking] = useState<'opened' | 'closed' | null>(null)
  const [ordering, setOrdering] = useState(false)
  const [keepsakeOpen, setKeepsakeOpen] = useState(false)
  const [fairOpen, setFairOpen] = useState(false)
  const [bookOpen, setBookOpen] = useState(false)
  const [undo, setUndo] = useState<Undo | null>(null)
  /* Whether the book itself has gone up under the chrome. Not a fold and not a
     threshold the reader can feel — it is one observation of where the head
     block actually is, and all it changes is what the bar says and what the
     rail is made of. */
  const [parked, setParked] = useState(false)
  const [keepShown, setKeepShown] = useState(true)
  const [keepStep, setKeepStep] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)
  const head = useRef<HTMLDivElement>(null)
  const keepIt = useRef<HTMLButtonElement>(null)
  const lastTop = useRef(0)
  const settle = useRef<number | undefined>(undefined)

  /* The action steps over the verbs it would otherwise be standing on.

     It is fixed in the trailing corner, and the verb rows now end at their
     card's trailing edge, which on a phone is the same edge — so wherever a
     row comes to rest in the bottom --fab-size of the screen, delete is under
     a button that isn't delete. The row used to solve this by standing 61px
     inside its own card forever; the cost of the collision belongs to the
     thing that floats, not to every card it floats over.

     Only at rest, and that is the whole reason this is workable. Testing for
     contact while the thread moves fires once per card and flickers the button
     the length of the thread — moving is `keepShown`'s job and it already does
     it. This runs once, SETTLE_MS after the last scroll event.

     The resting box is read from the computed insets rather than from
     getBoundingClientRect, because the step is a transform: a rect would
     measure the button where the last step put it, and every check would move
     the box it was checking against. Insets don't move. */
  const step = useCallback(() => {
    const fab = keepIt.current
    const thread = scroller.current
    if (!fab || !thread) return

    const style = getComputedStyle(fab)
    const bottom = window.innerHeight - parseFloat(style.insetBlockEnd)
    const right = window.innerWidth - parseFloat(style.insetInlineEnd)
    const rest = { top: bottom - fab.offsetHeight, bottom, left: right - fab.offsetWidth, right }

    // The highest row it is touching, measured at the reach rather than at the
    // drawing: a thumb aims at the 44px target, not at the 34px circle.
    let highest = Infinity
    for (const row of thread.querySelectorAll('[data-acts]')) {
      const at = row.getBoundingClientRect()
      const clear =
        at.right + REACH <= rest.left ||
        at.left - REACH >= rest.right ||
        at.bottom + REACH <= rest.top ||
        at.top - REACH >= rest.bottom
      if (!clear) highest = Math.min(highest, at.top - REACH)
    }

    setKeepStep(
      highest === Infinity ? 0 : Math.min(STEP_MAX, Math.round(rest.bottom - highest + AIR)),
    )
  }, [])

  /* Everything that could move a verb row goes through here, and the timer
     restarts each time, so the measurement happens once — after the last of
     whatever it was. That is what makes "only at rest" true for more than
     scrolling: a filter change or an edit rewrites the thread under a corner
     that is not moving, and a step measured on the first frame of that is a
     step measured against rows that are no longer there. */
  const bump = useCallback(() => {
    window.clearTimeout(settle.current)
    settle.current = window.setTimeout(step, SETTLE_MS)
  }, [step])

  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget
      bump()

      /* And the way to keep more gets out of the way of what is already kept.
         Fixed in the trailing corner, it sits on top of whatever card happens
         to be passing under it — on a phone that is a paragraph with a hole in
         it. Moving down the thread is reading, so it leaves; the moment the
         reader stops or comes back up it is under the thumb again. The 6px
         deadband is so a fingertip's worth of drift doesn't flicker it. */
      const from = lastTop.current
      lastTop.current = el.scrollTop
      if (Math.abs(el.scrollTop - from) < 6) return
      setKeepShown(el.scrollTop < from || el.scrollTop < 16)
    },
    [bump],
  )

  const keeps = useMemo(() => entries ?? [], [entries])
  const rows: Row[] = useMemo(() => arrange(keeps, sift), [keeps, sift])

  /* ARRIVING FROM THE SEARCH. A result in the Library links to
     /book/42#keep-317, and the browser cannot honour that hash itself: the
     thread is not in the document when the route mounts — Dexie has not
     answered — so by the time the notch exists the navigation is long over.

     So it is honoured here, once, on the render where the keep first exists.
     `rows.length` is the trigger rather than a timeout, and the guard keeps a
     later re-render (a filter, a new keep) from yanking the reader back to
     where they came in. */
  const { hash } = useLocation()
  const arrived = useRef('')
  useEffect(() => {
    if (!hash.startsWith('#keep-') || arrived.current === hash || !rows.length) return
    const notch = document.getElementById(hash.slice(1))
    if (!notch) return
    arrived.current = hash
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    notch.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' })
    // A brief mark, so the reader's eye lands on the right card in a thread
    // of forty. Removed rather than left on: it is an answer to a question
    // that has now been answered.
    notch.dataset.found = ''
    const timer = setTimeout(() => delete notch.dataset.found, 2400)
    return () => clearTimeout(timer)
  }, [hash, rows.length])

  /* Where the book is, asked once per crossing rather than once per frame.

     The moment the head block's last pixel goes up past the top of the thread,
     the bar takes the book's name and the rail — which is directly under the
     head and sticky — lands and takes its glass. The same instant, without
     either being told a number: the rail sticks when the head has gone, so a
     threshold of 0 against the head IS the rail landing. Nothing to keep in
     step and no height copied into a second place to go stale.

     An observer rather than a scrollTop test, and one threshold rather than
     the old fold's two: nothing here resizes the thread any more, so the
     crossing cannot move underneath itself and flap.

     Keyed on the book and not on nothing. Dexie answers a frame or two after
     mount, and until it does this route renders an empty page — so on the one
     pass an empty dependency list would run, neither element exists yet, and
     the observer would give up for the life of the page. */
  useEffect(() => {
    const cover = head.current
    const thread = scroller.current
    if (!cover || !thread) return
    const watch = new IntersectionObserver(([seen]) => setParked(!seen.isIntersecting), {
      root: thread,
      threshold: 0,
    })
    watch.observe(cover)
    return () => watch.disconnect()
  }, [book])

  /* Once when the thread first draws, again whenever it is refiltered,
     reordered or edited, and again on anything that resizes the thread — a
     rotation, a phone's browser bar retracting. None of those are scrolls, and
     all of them move what is under the corner. */
  useEffect(() => {
    const thread = scroller.current
    if (!thread) return
    bump()
    const watch = new ResizeObserver(bump)
    watch.observe(thread)
    window.addEventListener('resize', bump)
    return () => {
      watch.disconnect()
      window.removeEventListener('resize', bump)
      window.clearTimeout(settle.current)
    }
  }, [rows, bump])

  /* The substance word is a contrast, not a caption.

     Down the whole thread some cards say "a whisper" and some say "your own
     ink", and the difference between two adjacent lines is the entire
     information. Filter to one kind — or to any set that happens to be all one
     substance — and every card repeats the same two words at the far trailing
     edge of its meta line, with nothing to be different from. At that point it
     has stopped labelling anything and is just a phrase floating on the right
     of the page, which is exactly what it looks like. */
  const showSide = useMemo(
    () => new Set(rows.map((row) => KIND[row.keep.type].side)).size > 1,
    [rows],
  )

  /* The undo clears itself. Kept in an effect rather than a timeout set at the
     call site, so that deleting a second keep before the first bar expires
     restarts the clock instead of leaving a stale one to fire early. */
  useEffect(() => {
    if (!undo) return
    const t = setTimeout(() => setUndo(null), UNDO_MS)
    return () => clearTimeout(t)
  }, [undo])

  async function deleteKeep(keep: Entry) {
    const restore = await removeKeep(keep)
    setUndo({ what: `That ${KIND[keep.type].one} is gone.`, restore })
  }

  // Dexie has not answered yet. Nothing, rather than a skeleton: the answer is
  // local and arrives within a frame or two, and a shape that flashes is worse
  // than a page that appears.
  if (book === undefined) return <main className={pageStyles.page} />

  if (book === null) {
    return (
      <main className={pageStyles.page}>
        <div className={pageStyles.column}>
          <Link to="/library" className={styles.plainBack}>
            <ChevronIcon size={19} dir="left" />
            <span>Library</span>
          </Link>
          <p className={styles.missing}>
            That book isn’t on your shelf. It may have been removed from this device.
          </p>
        </div>
      </main>
    )
  }

  const opening = epigraph(book, keeps)
  const forward = runsForward(sift.order)
  /* Digits, not words: this is a data line, and "ten" makes a number harder
     to find than "10". The spelled-out counts stay in the prose surfaces
     (the colophon), where they belong. */
  const facts = `${keeps.length} ${keeps.length === 1 ? 'keep' : 'keeps'}`
  /* Both ends at once, because the year on one of them depends on the other. */
  const span = spanPair(book.startedOn, book.finishedOn)

  /* The first notch, and the only one Flyleaf writes itself. Not a card: it is
     an inscription on the page, named on its meta line like every other notch
     — "day one" at the leading edge, "the beginning" at the trailing one.
     Never filtered out — it is where the thread is tied on — and which end it
     sits at follows the order, because "the day you opened it" at the top of
     a newest-first list would look like the latest news. */
  const seal = (
    <li className={styles.notch} data-opening="" key="opening">
      <span className={styles.gutter} aria-hidden="true">
        <span className={styles.knot}>
          <OpeningIcon size={14} />
        </span>
      </span>
      <div className={styles.hang}>
        <p className={styles.when}>
          <span className={styles.whenDay}>
            {opening.on ? keptLabel(opening.on) : 'undated'} · day one
          </span>
        </p>
        {/* The accent on the initial. It hangs at the letter's leading
            shoulder rather than beside the words, because the initial is the
            thing being marked — and it is the app's own star, the one on the
            Home and Library mastheads, so the inscription is decorated with
            something the reader has already met rather than with an ornament
            invented for one line.

            It has to come *after* the text and be lifted out of flow: an
            inline element ahead of the words means there is no first letter
            for `::first-letter` to raise, and the initial silently disappears. */}
        <p className={styles.openLine}>
          {opening.line}
          <Sparkle size={12} className={styles.openSpark} />
        </p>
      </div>
    </li>
  )

  return (
    <main className={`${pageStyles.page} ${styles.page}`}>
      {/* ── The pinned head ─────────────────────────────────────────────── */}
      <header className={`${pageStyles.column} ${styles.pinned}`}>
        <div className={styles.chromeRow}>
          {/* One verb: out of the room. */}
          <GlassSurface className={styles.capsule}>
            <div className={styles.chromeSet}>
              <Link to="/library" className={styles.back} aria-label="Back to the Library">
                <ChevronIcon size={19} dir="left" />
              </Link>
            </div>
          </GlassSurface>

          {/* Once the book has gone up, the bar still has to say which book
              this is — and the name is the way back to it, so there is no
              separate control to explain.

              Always in the markup, faded rather than conditional. Mounting it
              on the crossing swapped a nothing for a fully-formed word in one
              frame, which is the one hard edge left on a page whose whole
              motion is now continuous; and a button that appears has to be
              taken out of the tab order while it is not there, which is what
              `inert` is doing. */}
          <button
            type="button"
            className={styles.miniTitle}
            data-on={parked || undefined}
            inert={!parked}
            onClick={() => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            title="Back to the top of the book"
          >
            {book.title}
          </button>

          {/* The book's three verbs share one pill — more than one button
              together lives in one container. The delete sheet still asks. */}
          <GlassSurface className={styles.capsule}>
            <div className={styles.chromeSet}>
              {/* A share button, and it says so with the glyph the phone
                  already uses for sharing — the same one on every keep. It
                  wore a colophon mark and read "share this reading", which is
                  a phrase, not a verb: nobody scanning a row of round icons
                  works out that the leaf is how you send the book on. */}
              <button
                type="button"
                className={styles.chromeAction}
                onClick={() => setKeepsakeOpen(true)}
                aria-label="Share — as a card, a picture, or plain text"
                title="Share"
              >
                <ShareIcon size={18} />
              </button>
              <button
                type="button"
                className={styles.chromeAction}
                onClick={() => setFairOpen(true)}
                aria-label="Draft my review — everything you wrote, gathered to edit"
                title="Draft my review"
              >
                <FairCopyIcon size={18} />
              </button>
              <button
                type="button"
                className={`${styles.chromeAction} ${styles.chromeDanger}`}
                onClick={() => setBookOpen(true)}
                aria-label="Delete this book"
                title="Delete this book"
              >
                <TrashIcon size={18} />
              </button>
            </div>
          </GlassSurface>
        </div>
      </header>

      {/* ── The scroll: the book, the rail, and the thread, in one move ──── */}
      <div className={styles.scroller} ref={scroller} onScroll={onScroll}>
        <div className={`${pageStyles.column} ${styles.column}`}>
          {/* Everything about the book lives beside its cover — name, author,
              how it is being read, and its dates — so this is one contained
              block instead of a column of rows.

              And it is the first thing in the thread, not a pinned zone above
              it. Reading takes it away because reading scrolls, which is the
              only mechanism on this page that has ever moved at the speed the
              reader is moving. */}
          <div className={styles.headTop} ref={head}>
            {/* Sized in CSS rather than by prop, because its width is not a
            free choice any more: the board's height is the height of the
            record beside it, and 2:3 is what turns one into the other. */}
            <BookCover
              title={book.title}
              author={book.author}
              covers={book.covers}
              size="small"
              className={styles.cover}
            />
            {/* Everything that is *about* the book, in one column: name, byline,
            formats, dates. The cover is the other column and holds nothing
            but the cover.

            Two alignment edges on the whole head, which is the point. The
            dates used to sit outside this block on a full-width line of
            their own, so their leading edge lined up with the spine of the
            book and with nothing in the column of writing above them —
            three edges to read where there should have been two. */}
            <div className={styles.about}>
              {/* One column with one rhythm, and exactly one thing bound tighter
              than the rest.

              It used to be two groups held apart by a seam, and the seam was
              where the head went wrong: the record's floor came off the
              cover's 2:3, `space-between` pushed every spare pixel into that
              one join, and a short title turned it into a band of dead air
              under the byline that belonged to nothing. The join was doing
              the work of the leftover space.

              Now the column is even — 16 down its whole length — and the
              grouping is carried by the one gap that is *tighter*: the title
              and its byline sit at 8, half of everything else, which is the
              whole of the 2× the grouping needs. Spare height falls to the
              foot of the column, where a cover taller than its own caption
              is just what a book beside a paragraph looks like. */}
              <div className={styles.identity}>
                {/* Up to two lines. One line was a height rule — it kept the
                pinned head the same size per book — but it also truncated
                most real titles at this width, and the space it saved was
                the space that opened under the byline. Two lines spends it
                on the name instead. The full text stays on the element. */}
                <h1 className={styles.title} title={book.title}>
                  {book.title}
                </h1>
                <p className={styles.author}>
                  {book.author} · {facts}
                </p>
              </div>

              {/* No wrapper. The row used to sit in a div whose only job was to
              carry a top margin, and that margin was one of the three
              hand-placed numbers this column was rebuilt to get rid of. */}
              <FormatRow
                small
                value={formatsOf(book)}
                onChange={(next) => void setFormats(book.id, next)}
              />

              {/* The reading span: one pill, two tappable ends, an arrow between.

              A date, an arrow and a second date is already a sentence, so
              there are no labels — nobody reads "Jul 2 → still reading" and
              wonders which end is which. The two ends are formatted together
              rather than one at a time, which is what stops the same year
              being printed twice inside one pill.

              Each end is its own button and the arrow is neither of them. */}
              {book.startedOn || book.finishedOn ? (
                <div className={styles.span}>
                  <button
                    type="button"
                    className={styles.spanEnd}
                    data-unset={!book.startedOn || undefined}
                    onClick={() => setPicking('opened')}
                    aria-label={
                      book.startedOn
                        ? `Started ${shortDate(book.startedOn)}. Change the day.`
                        : 'No start date yet. Set one.'
                    }
                  >
                    {/* The label carries its own clipping so the button does not.
                    `overflow: hidden` on the button would crop its own 44px
                    tap pseudo back to the 33 it paints. */}
                    <span className={styles.spanText}>{span.start ?? 'no start date'}</span>
                  </button>
                  <span className={styles.spanArrow} aria-hidden="true">
                    →
                  </span>
                  <button
                    type="button"
                    className={styles.spanEnd}
                    data-unset={!book.finishedOn || undefined}
                    onClick={() => setPicking('closed')}
                    aria-label={
                      book.finishedOn
                        ? `Finished ${shortDate(book.finishedOn)}. Change the day.`
                        : 'Still reading. Set the day you finished.'
                    }
                  >
                    <span className={styles.spanText}>{span.finish ?? 'still reading'}</span>
                  </button>
                </div>
              ) : (
                <div className={styles.span}>
                  <button
                    type="button"
                    className={styles.spanEnd}
                    onClick={() => setPicking('opened')}
                  >
                    <span className={styles.spanText}>Add reading dates</span>
                  </button>
                </div>
              )}
            </div>

            {/* The head's own star — see `.headSpark`. Last child on purpose: it
            is lifted out of flow, so its only job in the markup is to be
            somewhere it can never take part in the row's layout. */}
            <Sparkle size={15} className={styles.headSpark} />
          </div>

          {/* ── One line: what to show, and the order it hangs in ─────────
              It sticks to the top of the thread. Under the book while there is
              a book to be under, and a glass bar the instant there isn't —
              which is the same instant the bar above takes the book's name,
              because both are reading one observation of where the head is. */}
          <div className={styles.tabsRow} data-parked={parked || undefined}>
            {/* All, then the kinds one after another, running off the trailing
                edge for the reader to pull through.

                It has been three things and this is the one that costs a single
                line: wrapping put all seven on screen at once but stacked three
                rows deep and ate a third of the pinned head, and dropping the
                names to fit them on one row made seven identical grey glyphs
                nobody should have to decode. Names stay; the row scrolls. */}
            <div className={styles.tabs} role="group" aria-label="Show only">
              <button
                type="button"
                className={styles.tab}
                aria-pressed={sift.types.length === 0}
                data-on={sift.types.length === 0 || undefined}
                onClick={() => setSift((s) => ({ ...s, types: [] }))}
              >
                All
              </button>
              {KINDS.map((t) => {
                const { Icon, label } = KIND[t]
                const on = sift.types.includes(t)
                return (
                  <button
                    key={t}
                    type="button"
                    className={styles.tab}
                    aria-pressed={on}
                    data-on={on || undefined}
                    style={{ '--kind': `var(${KIND[t].hue})` } as CSSProperties}
                    onClick={() => setSift((s) => toggleType(s, t))}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Order, off the other end, as one button and nothing else.

                It used to be its own label, its own glyph and its own hit area
                welded into one shape — two pieces of text and a control, which
                is not a button on this phone or any other. One round control the
                size of every other round control in the app.

                And it used to cycle. Four orders is a loop a thumb can walk, but
                walking it is the only way to find out what the loop contains:
                every tap silently rearranged thirteen cards and named neither
                what had just been applied nor what was coming next, so the
                reader was left inferring the rule from the result. Sorting is a
                choice among four, and a choice among four is a list you can
                read. The sheet says what is being ordered, spells out all four
                orders, and marks the one already in force — one tap to look,
                one tap to change, and no tap that changes something by accident.

                A label beside the glyph would have been the cheap fix and the
                wrong one: it would say where you are and still never say where
                you could go. */}
            <button
              type="button"
              className={styles.sortBtn}
              onClick={() => setOrdering(true)}
              aria-haspopup="dialog"
              aria-label={`Order: ${SORT_SHORT[sift.order]}. Change the order.`}
              title={`Order: ${SORT_SHORT[sift.order]}`}
            >
              <SortIcon size={18} />
            </button>
          </div>

          <ol className={styles.thread}>
            {forward && seal}
            {rows.map(({ keep, tie }) => (
              <Notch
                key={keep.id}
                keep={keep}
                tie={tie}
                showSide={showSide}
                onEdit={setEditing}
                onShare={setSharing}
                onDelete={(k) => void deleteKeep(k)}
              />
            ))}
            {!forward && seal}
          </ol>

          {/* Two empty states, one leaf. A filter that comes up dry offers
              the way back; a journey with nothing kept yet says what will
              live here — in the book's own serif, on a dashed leaf, not as a
              bare sentence floating in the dark. */}
          {rows.length === 0 && keeps.length > 0 && (
            <div className={styles.nothing}>
              <Mascot size={54} />
              <span>Nothing of that kind on this thread yet.</span>
              <button
                type="button"
                className={styles.clear}
                onClick={() => setSift({ ...ALL, order: sift.order })}
              >
                Show everything
              </button>
            </div>
          )}

          {keeps.length === 0 && (
            <div className={styles.nothing}>
              <Mascot size={54} />
              <span>
                Nothing on this thread yet. Whatever this book whispers to you, and whatever you put
                down in your own ink, will hang right here.
              </span>
            </div>
          )}

          {/* ── The end of the thread ───────────────────────────────────

              Only when there is a thread to end. The tail is the drawn line's
              terminus and the sentence is a verdict on what was just read —
              under an empty leaf both are talking about nothing, and "the
              thread is still running" directly contradicts the leaf above it
              saying nothing has been kept. An empty journey gets one creature
              and one sentence, not two of each. */}
          {rows.length > 0 && (
            <div className={styles.ending}>
              <span className={styles.tail} aria-hidden="true" />
              {/* The bed is the sentence's own box, and it is the creature's
                  whole world — see `.endBed`. */}
              <div className={styles.endBed}>
                <p className={styles.endLine}>
                  {book.finishedOn
                    ? 'That is the whole of this one.'
                    : 'The thread is still running.'}
                  <Sparkle size={13} className={styles.endSpark} />
                </p>
                <Mascot size={52} />
              </div>
            </div>
          )}

          {/* ── The undo bar ──────────────────────────────────────────── */}
          {undo && (
            <div className={styles.dock}>
              <div className={styles.undo} role="status">
                <span>{undo.what}</span>
                <button
                  type="button"
                  className={styles.undoAction}
                  onClick={async () => {
                    await undo.restore()
                    setUndo(null)
                  }}
                >
                  Undo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Keep something ──────────────────────────────────────────────
          A floating action in the trailing corner rather than a wide button
          docked across the foot of the thread: the reader is here to read
          what they kept, and the way to keep more should be within a thumb's
          reach without standing in front of the page. */}
      <button
        ref={keepIt}
        type="button"
        className={styles.keepIt}
        style={keepStep ? ({ '--keep-step': `${keepStep}px` } as CSSProperties) : undefined}
        data-away={!keepShown || undefined}
        onClick={() => setAdding('quote')}
        aria-label="Keep something from this book"
        title="Keep something"
      >
        <KeepIcon size={22} />
      </button>

      <KeepSheet
        open={adding !== null || editing !== null}
        onClose={() => {
          setAdding(null)
          setEditing(null)
        }}
        book={book}
        editing={editing ?? undefined}
        start={adding ?? 'quote'}
      />

      {/* The four orders, named.

          Four rows and nothing else on the sheet — no apply button, no second
          section, no "reverse" switch to double it into eight. Tapping a row
          is the decision, so the sheet closes on the tap and the reader sees
          the thread rearrange behind it; asking them to choose and then
          confirm would be two taps for one thought.

          The hints are the reason this exists rather than a menu of four bare
          labels: "Book order" is not self-explanatory on a page that also has
          a date on every card, and "by page, the way the book runs" is. They
          come from ORDERS, so the sheet and the rest of the app cannot drift
          into describing the same four orders differently. */}
      <Sheet
        open={ordering}
        onClose={() => setOrdering(false)}
        label="Order the thread"
        name="journey-order"
      >
        <header className={sheet.head}>
          <h2 className={sheet.title}>Order the thread</h2>
          <button
            type="button"
            className={sheet.iconButton}
            onClick={() => setOrdering(false)}
            aria-label="Close"
          >
            <CloseIcon size={20} />
          </button>
        </header>
        <div className={sheet.body}>
          <div className={sheet.rows} role="group" aria-label="Order">
            {ORDERS.map(({ value, label, hint }) => {
              const on = sift.order === value
              return (
                <button
                  key={value}
                  type="button"
                  className={sheet.row}
                  aria-pressed={on}
                  onClick={() => {
                    setSift((s) => ({ ...s, order: value }))
                    setOrdering(false)
                  }}
                >
                  <span className={sheet.rowText}>
                    <span>{label}</span>
                    <span className={sheet.rowHint}>{hint}</span>
                  </span>
                  {on && (
                    <span className={sheet.tick}>
                      <CheckIcon size={19} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </Sheet>

      {/* The calendar, as a sheet. In the head it would grow the pinned zone
          and shove the thread; here it floats over it. */}
      <Sheet
        open={picking !== null}
        onClose={() => setPicking(null)}
        label="Pick the day"
        name="journey-day"
      >
        <header className={sheet.head}>
          <h2 className={sheet.title}>
            {picking === 'closed' ? 'The day you closed it' : 'The day you opened it'}
          </h2>
          <button
            type="button"
            className={sheet.iconButton}
            onClick={() => setPicking(null)}
            aria-label="Close"
          >
            <CloseIcon size={20} />
          </button>
        </header>
        <div className={sheet.body}>
          <CalendarPicker
            value={(picking === 'opened' ? book.startedOn : book.finishedOn) ?? todayISO()}
            max={todayISO()}
            seed={book.id}
            onChange={(iso) => {
              void setDates(
                book.id,
                picking === 'opened' ? { startedOn: iso } : { finishedOn: iso },
              )
              setPicking(null)
            }}
          />
          {/* Unfinishing has to clear the field rather than blank it, so it
              is its own call and not a date. */}
          {picking === 'closed' && book.finishedOn && (
            <button
              type="button"
              className={styles.unfinish}
              onClick={() => {
                void finish(book.id, null)
                setPicking(null)
              }}
            >
              Still reading it, actually
            </button>
          )}
        </div>
      </Sheet>

      <KeepsakeSheet
        open={keepsakeOpen}
        onClose={() => setKeepsakeOpen(false)}
        book={book}
        keeps={keeps}
      />

      {/* The same press, one keep instead of the whole reading. */}
      <PlateSheet
        open={sharing !== null}
        onClose={() => setSharing(null)}
        keep={sharing}
        book={book}
      />

      <FairCopySheet open={fairOpen} onClose={() => setFairOpen(false)} book={book} keeps={keeps} />

      <BookMenu
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        book={book}
        keeps={keeps}
        onRemoved={() => {
          setBookOpen(false)
          navigate('/library')
        }}
      />
    </main>
  )
}

export default BookJourney
