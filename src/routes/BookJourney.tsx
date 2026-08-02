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

import { Fragment, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import BookCover from '../components/BookCover'
import FormatRow from '../components/FormatRow'
import GlassSurface from '../components/GlassSurface'
import LeafButton from '../components/LeafButton'
import Sheet from '../components/Sheet'
import Sparkle from '../components/Sparkle'
import CalendarPicker from '../components/date/CalendarPicker'
import { shortDate, todayISO } from '../components/date/dates'
import {
  ChevronIcon,
  CloseIcon,
  ColophonIcon,
  FairCopyIcon,
  OpeningIcon,
  PlusIcon,
  SortIcon,
  TrashIcon,
} from '../components/TabIcons'
import { formatsOf, type Book, type Entry, type EntryType } from '../data/db'
import { useBook, useEntries } from '../data/useBook'
import Keep from '../journey/Keep'
import KeepSheet from '../journey/KeepSheet'
import ColophonSheet from '../journey/ColophonSheet'
import FairCopySheet from '../journey/FairCopySheet'
import BookMenu from '../journey/BookMenu'
import { KIND, KINDS } from '../journey/kinds'
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
  const { Icon, hue, one } = KIND[keep.type]
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
        {/* The meta line: when and where at the leading edge, what at the
            trailing one — every notch on the thread is named the same way. */}
        <p className={styles.when}>
          <span className={styles.whenDay}>
            {keptLabel(keep.keptOn)}
            {keep.page !== undefined && ` · p. ${keep.page}`}
          </span>
          <span className={styles.whenKind}>{one}</span>
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
  const [colophonOpen, setColophonOpen] = useState(false)
  const [fairOpen, setFairOpen] = useState(false)
  const [bookOpen, setBookOpen] = useState(false)
  const [undo, setUndo] = useState<Undo | null>(null)

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
          <span className={styles.whenKind}>the beginning</span>
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
          <GlassSurface className={styles.capsule}>
            <Link to="/library" className={styles.back} aria-label="Back to the Library">
              <ChevronIcon size={19} dir="left" />
            </Link>
          </GlassSurface>
          {/* The book's three verbs share one pill — more than one button
              together lives in one container. The delete sheet still asks. */}
          <GlassSurface className={styles.capsule}>
            <div className={styles.chromeSet}>
              <button
                type="button"
                className={styles.chromeAction}
                onClick={() => setColophonOpen(true)}
                aria-label="Share a summary card — the whole journey, set small"
                title="Share a summary card"
              >
                <ColophonIcon size={18} />
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
            contained block instead of a column of rows. */}
        <div className={styles.headTop}>
          <BookCover
            title={book.title}
            author={book.author}
            covers={book.covers}
            width={78}
            size="small"
            className={styles.cover}
          />
          <div className={styles.about}>
            <h1 className={styles.title}>
              {book.title} <Sparkle size={13} className={styles.spark} />
            </h1>
            <p className={styles.author}>
              {book.author} · {facts}
            </p>

            <FormatRow
              small
              value={formatsOf(book)}
              onChange={(next) => void setFormats(book.id, next)}
            />

            <div className={styles.dates}>
              <button type="button" className={styles.dateCol} onClick={() => setPicking('opened')}>
                <span className={styles.dateLabel}>Started</span>
                <span className={styles.dateVal}>
                  {book.startedOn ? shortDate(book.startedOn) : 'Pick a day'}
                </span>
              </button>
              <button type="button" className={styles.dateCol} onClick={() => setPicking('closed')}>
                <span className={styles.dateLabel}>Finished</span>
                <span className={styles.dateVal}>
                  {book.finishedOn ? shortDate(book.finishedOn) : 'In progress'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Filter and sort, separated ────────────────────────────────── */}
        <div className={styles.tabsRow}>
          {/* The same toggle-chip language as everywhere else in the app —
              formats, days, views — so it is obviously a set of buttons and
              obviously stackable: quotes and notes together is two taps, and
              All is the way back. */}
          <div className={styles.tabs} role="group" aria-label="Show only">
            <button
              type="button"
              className={styles.tab}
              aria-pressed={sift.types.length === 0}
              data-on={sift.types.length === 0 || undefined}
              onClick={() => setSift((s) => ({ ...s, types: [], motif: null }))}
            >
              All
            </button>
            {KINDS.map((t) => {
              const { Icon, many } = KIND[t]
              return (
                <button
                  key={t}
                  type="button"
                  className={styles.tab}
                  aria-pressed={sift.types.includes(t)}
                  data-on={sift.types.includes(t) || undefined}
                  style={{ '--kind': `var(${KIND[t].hue})` } as CSSProperties}
                  onClick={() => setSift((s) => toggleType(s, t))}
                >
                  <Icon size={14} />
                  {many}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            className={styles.sortBtn}
            onClick={() =>
              setSift((s) => {
                const at = ORDERS.findIndex((o) => o.value === s.order)
                return { ...s, order: ORDERS[(at + 1) % ORDERS.length].value }
              })
            }
            aria-label="Change the order"
          >
            {SORT_SHORT[sift.order]}
            <SortIcon size={14} />
          </button>
        </div>
      </header>

      {/* ── The scroll: only the thread moves ───────────────────────────── */}
      <div className={styles.scroller}>
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
                Nothing kept yet. The first quote, note, voice memo or picture
                you keep will hang right here on the thread.
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

          {/* ── The dock ──────────────────────────────────────────────── */}
          <div className={styles.dock}>
            {undo && (
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
            )}
            <LeafButton className={styles.keepIt} onClick={() => setAdding('quote')}>
              <PlusIcon size={18} />
              Keep something
            </LeafButton>
          </div>
        </div>
      </div>

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

      <ColophonSheet
        open={colophonOpen}
        onClose={() => setColophonOpen(false)}
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
