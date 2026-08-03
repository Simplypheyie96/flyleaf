/* The journey — everything one reader kept from one book, on one page.

   The page is two zones, and only the second one moves.

   **The head stands still.** Back, the book, how it is being read, its dates,
   and the sift rail are pinned; they are the room the journey happens in, and
   a room does not scroll away. Everything below them — the thread — scrolls
   underneath, fading out as it passes under the rail.

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
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import { formatsOf, type Book, type Entry, type EntryType } from '../data/db'
import { useBook, useEntries } from '../data/useBook'
import Keep from '../journey/Keep'
import KeepSheet from '../journey/KeepSheet'
import KeepsakeSheet from '../journey/KeepsakeSheet'
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
  book: Book
  tie?: Tie
  /* False once every visible keep is the same substance — see `showSide` at
     the call site. */
  showSide: boolean
  onEdit: (keep: Entry) => void
  onDelete: (keep: Entry) => void
}

function Notch({ keep, book, tie, showSide, onEdit, onDelete }: NotchProps) {
  const { Icon, hue, side } = KIND[keep.type]
  return (
    <li
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
        <Keep keep={keep} book={book} onEdit={onEdit} onDelete={onDelete} />
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
  const entries = useEntries(bookId)

  const [sift, setSift] = useState<Sift>(ALL)
  /* Two nulls rather than one union: `adding` carries which kind the sheet
     opens on, `editing` carries the keep it opens filled in, and a sheet can
     never be both. */
  const [adding, setAdding] = useState<EntryType | null>(null)
  const [editing, setEditing] = useState<Entry | null>(null)
  const [picking, setPicking] = useState<'opened' | 'closed' | null>(null)
  const [ordering, setOrdering] = useState(false)
  const [keepsakeOpen, setKeepsakeOpen] = useState(false)
  const [fairOpen, setFairOpen] = useState(false)
  const [bookOpen, setBookOpen] = useState(false)
  const [undo, setUndo] = useState<Undo | null>(null)
  /* The head is pinned, which means the room it takes is room the thread never
     gets back. Reading is what asks for that room back — see `onScroll`. */
  const [headOpen, setHeadOpen] = useState(true)
  const [keepShown, setKeepShown] = useState(true)
  const scroller = useRef<HTMLDivElement>(null)
  const lastTop = useRef(0)

  /* The head folds itself as the thread moves, and comes back at the top.

     Two thresholds rather than one, because a single line would flap: at the
     boundary, folding grows the scroller, which can shift the reader back
     across the line and reopen it, and so on for as long as the finger is
     down. FOLD_AT is far enough in to mean "reading"; UNFOLD_AT is close
     enough to the top to mean "back for the book".

     And it only folds when folding buys something: on a two-keep thread the
     head is most of the page, collapsing it clamps scrollTop back to the top,
     and the reader would watch it shut and open once for nothing. */
  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const room = el.scrollHeight - el.clientHeight
    setHeadOpen((open) => (open ? !(room > 240 && el.scrollTop > 72) : el.scrollTop < 16))

    /* And the way to keep more gets out of the way of what is already kept.
       Fixed in the trailing corner, it sits on top of whatever card happens to
       be passing under it — on a phone that is a paragraph with a hole in it.
       Moving down the thread is reading, so it leaves; the moment the reader
       stops or comes back up it is under the thumb again. The 6px deadband is
       so a fingertip's worth of drift doesn't flicker it. */
    const from = lastTop.current
    lastTop.current = el.scrollTop
    if (Math.abs(el.scrollTop - from) < 6) return
    setKeepShown(el.scrollTop < from || el.scrollTop < 16)
  }, [])

  const keeps = useMemo(() => entries ?? [], [entries])
  const rows: Row[] = useMemo(() => arrange(keeps, sift), [keeps, sift])

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
        {opening.hint && <p className={styles.openHint}>{opening.hint}</p>}
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

          {/* Folded, the head still has to say which book this is — and the
              name is the way back to the rest of it, so there is no separate
              control to explain. */}
          {!headOpen && (
            <button
              type="button"
              className={styles.miniTitle}
              onClick={() => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-expanded={false}
              aria-controls="journey-head"
              title="Back to the top of the book"
            >
              {book.title}
            </button>
          )}

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

        {/* Everything about the book lives beside its cover — name, author,
            how it is being read, and its dates — so the head holds one
            contained block instead of a column of rows.

            It folds itself. Reading is the signal: once the thread is moving
            the cover and the dates are worth about a card and a half, and
            scrolling back to the top is how you say you want them again. The
            wrapper is what animates (0fr/1fr on a grid row) so the block can
            collapse without its contents reflowing on the way; `inert` keeps
            the clipped date buttons out of the tab order while it is shut. */}
        <div
          className={styles.headFold}
          id="journey-head"
          data-folded={!headOpen || undefined}
          inert={!headOpen}
        >
          {/* One child, and that is load-bearing. `grid-template-rows` only sizes
            the rows it declares: a second child auto-places into an *implicit*
            row, which stays `auto` no matter what the explicit row is set to.
            Folded, that left the dates collapsed to nothing visible but still
            holding 48px of their own row open — a band of empty sky under the
            chrome that nobody could see and everybody could feel. Everything
            that folds goes inside here. */}
          <div className={styles.headInner}>
            <div className={styles.headTop}>
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
          </div>
        </div>

        {/* ── One line: what to show, and the order it hangs in ─────────── */}
        <div className={styles.tabsRow}>
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
      </header>

      {/* ── The scroll: only the thread moves ───────────────────────────── */}
      <div className={styles.scroller} ref={scroller} onScroll={onScroll}>
        <div className={`${pageStyles.column} ${styles.column}`}>
          <ol className={styles.thread}>
            {forward && seal}
            {rows.map(({ keep, tie }) => (
              <Notch
                key={keep.id}
                keep={keep}
                book={book}
                tie={tie}
                showSide={showSide}
                onEdit={setEditing}
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

          {/* ── The end of the thread ─────────────────────────────────── */}
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
        type="button"
        className={styles.keepIt}
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
