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
  ShareIcon,
  SortIcon,
  TrashIcon,
} from '../components/TabIcons'
import { formatsOf, type Book, type Entry, type EntryType } from '../data/db'
import { useBook, useEntries } from '../data/useBook'
import Keep from '../journey/Keep'
import KeepSheet from '../journey/KeepSheet'
import SiftSheet from '../journey/SiftSheet'
import ColophonSheet from '../journey/ColophonSheet'
import FairCopySheet from '../journey/FairCopySheet'
import BookMenu from '../journey/BookMenu'
import { KIND } from '../journey/kinds'
import { count, epigraph, keptLabel } from '../journey/lexicon'
import { finish, removeKeep, setDates, setFormats } from '../journey/keeps'
import {
  ALL,
  ORDERS,
  arrange,
  runsForward,
  sifting,
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
  const { Icon, hue } = KIND[keep.type]
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
  const [siftOpen, setSiftOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [colophonOpen, setColophonOpen] = useState(false)
  const [fairOpen, setFairOpen] = useState(false)
  const [bookOpen, setBookOpen] = useState(false)
  const [armed, setArmed] = useState(false)
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
  const order = ORDERS.find((o) => o.value === sift.order) ?? ORDERS[0]
  const only = sift.types.length
    ? sift.types.map((t) => KIND[t].many).join(' · ')
    : 'All kinds'
  const facts = [
    book.year ? `${book.year}` : null,
    book.pages ? `${book.pages} pages` : null,
    count(keeps.length, { one: 'keep', many: 'keeps' }),
  ]
    .filter(Boolean)
    .join(' · ')

  /* The first notch, and the only one Flyleaf writes itself. Not a card: it is
     an inscription on the page, the way a book's own epigraph is set on the
     paper rather than pinned to it. Never filtered out — it is where the
     thread is tied on — and which end it sits at follows the order, because
     "the day you opened it" at the top of a newest-first list would look like
     the latest news. */
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
            {opening.on ? keptLabel(opening.on) : 'undated'}
          </span>
          <span className={styles.whenKind}>day one</span>
        </p>
        <h2 className={styles.openTitle}>The beginning</h2>
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
          {/* Delete lives up here, where iOS puts a screen's own rare verbs —
              not in the head's face. The sheet it opens still asks first. */}
          <GlassSurface className={styles.capsule}>
            <button
              type="button"
              className={styles.chromeAction}
              onClick={() => {
                setArmed(true)
                setBookOpen(true)
              }}
              aria-label="Delete this book"
            >
              <TrashIcon size={18} />
            </button>
          </GlassSurface>
        </div>

        <div className={styles.headTop}>
          <BookCover
            title={book.title}
            author={book.author}
            covers={book.covers}
            width={88}
            size="small"
            className={styles.cover}
          />
          <div className={styles.about}>
            <h1 className={styles.title}>
              {book.title} <Sparkle size={14} className={styles.spark} />
            </h1>
            <p className={styles.author}>{book.author}</p>
            <p className={styles.facts}>{facts}</p>
          </div>
        </div>

        <div className={styles.meta}>
          <FormatRow
            value={formatsOf(book)}
            onChange={(next) => void setFormats(book.id, next)}
          />

          {/* The reading span, one line: opened, an arrow, closed (or still
              going), and the bookmark. Each piece is its own quiet button —
              the dotted underline is the "you can change this" cue — and the
              calendar opens as a sheet so the pinned head never changes
              height under the reader's thumb. */}
          <div className={styles.span}>
            <button type="button" className={styles.day} onClick={() => setPicking('opened')}>
              Opened <strong>{book.startedOn ? shortDate(book.startedOn) : 'one day'}</strong>
            </button>
            <span className={styles.spanArrow} aria-hidden="true">
              →
            </span>
            <button type="button" className={styles.day} onClick={() => setPicking('closed')}>
              {book.finishedOn ? (
                <>
                  Closed <strong>{shortDate(book.finishedOn)}</strong>
                </>
              ) : (
                <em>still reading</em>
              )}
            </button>
            <button
              type="button"
              className={styles.bookmark}
              onClick={() => {
                setArmed(false)
                setBookOpen(true)
              }}
            >
              {book.pagesRead ? `p. ${book.pagesRead}` : 'bookmark'}
            </button>
          </div>
        </div>

        {/* ── The rail: sift, count, share ──────────────────────────────── */}
        <div className={styles.rail}>
          <GlassSurface className={styles.railGlass}>
            <div className={styles.railRow}>
              <button
                type="button"
                className={styles.sift}
                data-on={sifting(sift) || sift.order !== 'kept' || undefined}
                onClick={() => setSiftOpen(true)}
              >
                <SortIcon size={17} />
                <span className={styles.siftWhat}>{only}</span>
                <span className={styles.siftHow}>{order.label}</span>
              </button>
              <span className={styles.count}>
                {rows.length}
                {sifting(sift) && <span className={styles.of}>/{keeps.length}</span>}
              </span>
              <button
                type="button"
                className={styles.shareBtn}
                onClick={() => setShareOpen(true)}
                aria-label="Share this journey"
              >
                <ShareIcon size={18} />
              </button>
            </div>
          </GlassSurface>
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

          {rows.length === 0 && keeps.length > 0 && (
            <p className={styles.nothing}>
              Nothing on this thread matches that.{' '}
              <button
                type="button"
                className={styles.clear}
                onClick={() => setSift({ ...ALL, order: sift.order })}
              >
                Show all kinds
              </button>
            </p>
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

      {/* Two ways out, in plain words. The pretty names live inside. */}
      <Sheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        label="Share this journey"
        name="journey-share"
      >
        <header className={sheet.head}>
          <h2 className={sheet.title}>Share this journey</h2>
          <button
            type="button"
            className={sheet.iconButton}
            onClick={() => setShareOpen(false)}
            aria-label="Close"
          >
            <CloseIcon size={20} />
          </button>
        </header>
        <div className={sheet.body}>
          <div className={sheet.rows}>
            <button
              type="button"
              className={sheet.row}
              onClick={() => {
                setShareOpen(false)
                setColophonOpen(true)
              }}
            >
              <ColophonIcon size={20} />
              <span className={sheet.rowText}>
                A summary card
                <span className={sheet.rowHint}>
                  The whole journey, set small on one beautiful card
                </span>
              </span>
            </button>
            <button
              type="button"
              className={sheet.row}
              onClick={() => {
                setShareOpen(false)
                setFairOpen(true)
              }}
            >
              <FairCopyIcon size={20} />
              <span className={sheet.rowText}>
                Draft my review
                <span className={sheet.rowHint}>
                  Everything you wrote, gathered into a review you can edit
                </span>
              </span>
            </button>
          </div>
        </div>
      </Sheet>

      <SiftSheet
        open={siftOpen}
        onClose={() => setSiftOpen(false)}
        sift={sift}
        onChange={setSift}
        keeps={keeps}
        showing={rows.length}
      />

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
        armed={armed}
        onRemoved={() => {
          setBookOpen(false)
          navigate('/library')
        }}
      />
    </main>
  )
}

export default BookJourney
