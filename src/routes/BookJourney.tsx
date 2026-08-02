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

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import BookCover from '../components/BookCover'
import FormatRow from '../components/FormatRow'
import GlassSurface from '../components/GlassSurface'
import Sheet from '../components/Sheet'
import CalendarPicker from '../components/date/CalendarPicker'
import { shortDate, spanDate, todayISO } from '../components/date/dates'
import {
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

/* The sort control cycles rather than opening a sheet: four orders is a loop
   a thumb can walk, and the reference draws it exactly this way — one small
   typewritten word with a glyph. */
const SORT_SHORT: Record<Order, string> = {
  kept: 'as kept',
  newest: 'newest',
  book: 'by page',
  motif: 'by motif',
}

/* ── One notch ────────────────────────────────────────────────────────────
   The gutter holds the thread and the knot; the card hangs off it. The card
   carries its own date in its foot, so the notch adds nothing but the knot. */

interface NotchProps {
  keep: Entry
  book: Book
  tie?: Tie
  onMotif: (motif: string) => void
  onEdit: (keep: Entry) => void
  onDelete: (keep: Entry) => void
}

function Notch({ keep, book, tie, onMotif, onEdit, onDelete }: NotchProps) {
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
            and the empty middle is what makes the row read as balanced. */}
        <p className={styles.when}>
          <span className={styles.whenDay}>
            {keptLabel(keep.keptOn)}
            {keep.page !== undefined && ` · p. ${keep.page}`}
          </span>
          <em className={styles.whenSide}>{SIDE[side].word}</em>
        </p>
        <Keep keep={keep} book={book} onMotif={onMotif} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </li>
  )
}

/* A group heading is its own item on the thread rather than a title inside the
   next card, so that the knots stay on one line down the page — a heading
   tucked into a notch would push that notch's knot out of the column. The line
   still runs behind it: an order changes what is being shown, not where the
   journey goes. */
function Divider({ label }: { label: string }) {
  return (
    <li className={styles.notch} data-divider="">
      <span className={styles.gutter} aria-hidden="true" />
      <h2 className={styles.divider}>{label}</h2>
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
    setHeadOpen((open) =>
      open ? !(room > 240 && el.scrollTop > 72) : el.scrollTop < 16,
    )

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
            That book isn’t on your shelf. It may have been removed from this
            device.
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
        <p className={styles.openLine}>{opening.line}</p>
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
          <div className={styles.about}>
            {/* No ornament in here. The title measures 252px in the column's
                254 — it fits on one line by two pixels, and the little star
                that used to ride the last word was 18 of them, so the one
                decorative mark on the head was the sole reason the name of
                the book broke across two. */}
            <h1 className={styles.title}>{book.title}</h1>
            <p className={styles.author}>
              {book.author} · {facts}
            </p>

            <FormatRow
              small
              value={formatsOf(book)}
              onChange={(next) => void setFormats(book.id, next)}
            />

          </div>
        </div>

        {/* The reading span, on one line, as one pill, on a line of its own.

            It was two labelled columns: STARTED over its date, FINISHED over
            its date, four lines of chrome and two dashed underlines to say
            what an arrow says on its own. A date, an arrow and a second date
            is already a sentence — the labels were repeating what the shape
            of it had told you.

            It used to live in the column beside the cover, and that is what
            made the head look lopsided: the text column ran 46px past the
            bottom of the board, so the board sat in the top corner of a tall
            empty rectangle. Out here the two columns above end level with
            each other and the dates get a full line to sit on.

            Each end is still its own button, so the halves stay separately
            tappable at full pill height, and the arrow between them is not
            one of them. */}
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
              {book.startedOn ? spanDate(book.startedOn) : 'no start yet'}
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
              {book.finishedOn ? spanDate(book.finishedOn) : 'still reading'}
            </button>
          </div>
        ) : (
          <div className={styles.span}>
            <button
              type="button"
              className={styles.spanEnd}
              onClick={() => setPicking('opened')}
            >
              Add reading dates
            </button>
          </div>
        )}
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
              aria-pressed={sift.types.length === 0 && !sift.motif}
              data-on={(sift.types.length === 0 && !sift.motif) || undefined}
              onClick={() => setSift((s) => ({ ...s, types: [], motif: null }))}
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
              size of every other round control in the app, and the order it is
              currently in is what it says when you ask it. */}
          <button
            type="button"
            className={styles.sortBtn}
            onClick={() =>
              setSift((s) => {
                const at = ORDERS.findIndex((o) => o.value === s.order)
                return { ...s, order: ORDERS[(at + 1) % ORDERS.length].value }
              })
            }
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
            {rows.map(({ keep, divider, tie }) => (
              <Fragment key={keep.id}>
                {divider && <Divider label={divider} />}
                <Notch
                  keep={keep}
                  book={book}
                  tie={tie}
                  onMotif={(motif) =>
                    setSift((s) => ({ ...s, motif: s.motif === motif ? null : motif }))
                  }
                  onEdit={setEditing}
                  onDelete={(k) => void deleteKeep(k)}
                />
              </Fragment>
            ))}
            {!forward && seal}
          </ol>

          {/* Two empty states, one leaf. A filter that comes up dry offers
              the way back; a journey with nothing kept yet says what will
              live here — in the book's own serif, on a dashed leaf, not as a
              bare sentence floating in the dark. */}
          {rows.length === 0 && keeps.length > 0 && (
            <div className={styles.nothing}>
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
              <span>
                Nothing on this thread yet. Whatever this book whispers to you,
                and whatever you put down in your own ink, will hang right here.
              </span>
            </div>
          )}

          {/* ── The end of the thread ─────────────────────────────────── */}
          <div className={styles.ending}>
            <span className={styles.tail} aria-hidden="true" />
            <p className={styles.endLine}>
              {book.finishedOn
                ? 'That is the whole of this one.'
                : 'The thread is still running.'}
            </p>
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
            value={
              (picking === 'opened' ? book.startedOn : book.finishedOn) ?? todayISO()
            }
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

      <FairCopySheet
        open={fairOpen}
        onClose={() => setFairOpen(false)}
        book={book}
        keeps={keeps}
      />

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
