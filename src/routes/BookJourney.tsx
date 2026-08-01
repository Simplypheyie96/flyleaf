/* The journey — the inside cover of a book, then everything kept from it,
   hanging off one thread in the order it was kept.

   Three ways to read it, and one set of markup behind all three. The switch
   in the tool bar sets `data-variant` on the journey section and nothing else;
   every difference between the Bound Journal, the Scrapbook and the Card Index
   is a presentation of the same DOM, written in Keep.module.css. A variation
   that needed its own JSX would drift from the other two within a week, and
   the reader would be choosing between three half-finished screens instead of
   three views of one finished one.

   On a phone the thread runs down the leading edge rather than the middle. The
   plan drawn for this screen had keeps alternating either side of a centre
   spine on the phone too, and the arithmetic does not survive it: the column is
   about 342px at 390px wide, so a card either side of a centre line gets
   ~165px, and after its own padding that is roughly 117px of text — twelve
   characters a line. A quote would come apart. Against the leading edge each
   card keeps ~310px and, just as usefully, there is only one place the next
   keep can be, so the order is never ambiguous. The centre spine and the
   alternation arrive at the width that can pay for them, near 760px. */

import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import BookCover from '../components/BookCover'
import GlassSurface from '../components/GlassSurface'
import LeafButton from '../components/LeafButton'
import {
  BackIcon,
  BookIcon,
  FairCopyIcon,
  GridIcon,
  MoreIcon,
  SortIcon,
  StackIcon,
  StrandIcon,
} from '../components/TabIcons'
import type { Entry } from '../data/db'
import { useBook, useEntries, useStrands } from '../data/useBook'
import Keep from '../journey/Keep'
import KeepSheet, { type Compose } from '../journey/KeepSheet'
import KeepMenu from '../journey/KeepMenu'
import SiftSheet from '../journey/SiftSheet'
import FairCopySheet from '../journey/FairCopySheet'
import BookMenu from '../journey/BookMenu'
import { colophon, count, epigraph, formatPhrase } from '../journey/lexicon'
import { ALL, arrange, sifting, strandColor, type Sift } from '../journey/order'
import { removeKeep } from '../journey/keeps'
import pageStyles from './page.module.css'
import styles from './BookJourney.module.css'

/* ── The three readings ──────────────────────────────────────────────────── */

type Variant = 'bound' | 'scrap' | 'index'

const VARIANTS: { value: Variant; label: string; Icon: typeof BookIcon }[] = [
  { value: 'bound', label: 'Bound', Icon: BookIcon },
  { value: 'scrap', label: 'Scrapbook', Icon: StackIcon },
  { value: 'index', label: 'Index', Icon: GridIcon },
]

const VIEW_KEY = 'flyleaf-journey-view'

function storedVariant(): Variant {
  try {
    const saved = localStorage.getItem(VIEW_KEY)
    if (saved === 'bound' || saved === 'scrap' || saved === 'index') return saved
  } catch {
    /* Private mode, or storage the browser will not hand over. The default
       reading is a fine answer and is not worth an error for. */
  }
  return 'bound'
}

/** How long a deleted keep stays undoable. Long enough to read the sentence
    and change your mind, short enough that it is gone by the time the reader
    has scrolled somewhere else and forgotten what it was about. */
const UNDO_MS = 9000

interface Undo {
  what: string
  restore: () => Promise<void>
}

function BookJourney() {
  const { id } = useParams()
  const navigate = useNavigate()
  const parsed = Number(id)
  const bookId = Number.isFinite(parsed) ? parsed : undefined

  const book = useBook(bookId)
  const keeps = useEntries(bookId)
  const strands = useStrands(bookId)

  const [variant, setVariant] = useState<Variant>(storedVariant)
  const [sift, setSift] = useState<Sift>(ALL)
  const [compose, setCompose] = useState<Compose | null>(null)
  const [menuKeep, setMenuKeep] = useState<Entry | null>(null)
  const [siftOpen, setSiftOpen] = useState(false)
  const [fairOpen, setFairOpen] = useState(false)
  const [bookOpen, setBookOpen] = useState(false)
  const [undo, setUndo] = useState<Undo | null>(null)

  const rows = useMemo(
    () => arrange(keeps ?? [], strands ?? [], sift),
    [keeps, strands, sift],
  )

  function choose(next: Variant) {
    setVariant(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      /* See above: the reading still changes, it just will not be remembered. */
    }
  }

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
    setMenuKeep(null)
    setUndo({
      what:
        keep.strandMark === 'open'
          ? 'That keep and the strand it opened are gone.'
          : 'That one is gone.',
      restore,
    })
  }

  // Dexie has not answered yet. Nothing, rather than a skeleton: the answer is
  // local and arrives within a frame or two, and a shape that flashes is worse
  // than a page that appears.
  if (book === undefined) return <main className={pageStyles.page} />

  if (book === null) {
    return (
      <main className={pageStyles.page}>
        <div className={`${pageStyles.column} ${styles.journeyColumn}`}>
          <Link to="/library" className={styles.back}>
            <BackIcon size={18} />
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

  const kept = keeps ?? []
  const threads = strands ?? []
  const running = threads.filter((s) => !s.closedAt)
  const said = epigraph(book, kept, threads)
  const foot = colophon(book, kept, threads)
  const showing = new Set(rows.map((r) => r.keep.id)).size

  /* How far the bookmark sits into the block, 0–1. Only drawn when both
     numbers exist: a ribbon at an invented depth is worse than no ribbon. */
  const depth =
    book.pages && book.pagesRead !== undefined
      ? Math.min(1, Math.max(0, book.pagesRead / book.pages))
      : null

  return (
    <main className={pageStyles.page}>
      <div className={`${pageStyles.column} ${styles.journeyColumn}`}>
        <Link to="/library" className={styles.back}>
          <BackIcon size={18} />
          <span>Library</span>
        </Link>

        {/* The inside cover. On the sky rather than on a card, because a card
            here would make the book one more keepsake among the keepsakes
            below instead of the thing they all belong to. */}
        <header className={styles.insideCover}>
          <div className={styles.jacket}>
            <div className={styles.opening}>
              <BookCover
                title={book.title}
                author={book.author}
                covers={book.covers}
                width={200}
                rotate={-1.5}
              />
            </div>
            {/* Progress as a thing in the book rather than a number about it.
                The ribbon sits where the reader's own bookmark would sit —
                that far into the block of pages — so how far in is read from
                the shape, at a glance, before any figure is. */}
            {depth !== null && (
              <span
                className={styles.bookmark}
                style={{ '--depth': depth } as React.CSSProperties}
                aria-hidden="true"
              />
            )}
          </div>

          <div className={styles.identity}>
            <h1 className={styles.title}>{book.title}</h1>
            <p className={styles.author}>{book.author}</p>

            <p className={styles.epigraph}>{said.line}</p>
            {said.hint && <p className={styles.hint}>{said.hint}</p>}

            <p className={styles.reading}>
              {formatPhrase(book) || 'Not marked yet'}
              {depth !== null && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span className={styles.depth}>
                    page {book.pagesRead} of {book.pages}
                  </span>
                </>
              )}
            </p>

            <button
              type="button"
              className={styles.aboutBook}
              onClick={() => setBookOpen(true)}
            >
              <MoreIcon size={16} />
              About this book
            </button>
          </div>
        </header>

        {/* The tool bar. The three readings on the leading side, the two things
            you can do to the whole journey on the trailing side — the same
            arrangement the library uses for its own views. */}
        <div className={styles.tools}>
          <GlassSurface className={styles.switcher}>
            <div
              role="radiogroup"
              aria-label="How to lay the journey out"
              className={styles.tabs}
            >
              {VARIANTS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={variant === value}
                  aria-label={label}
                  className={styles.tab}
                  onClick={() => choose(value)}
                >
                  <Icon size={17} />
                  {/* The word only for the reading you are in — the same rule
                      the library and the settings tabs already follow, and the
                      reason three tabs fit beside two actions on a phone. */}
                  {variant === value && (
                    <span className={styles.tabLabel} aria-hidden="true">
                      {label}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </GlassSurface>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.action}
              data-on={sifting(sift) || sift.order !== 'kept' || undefined}
              onClick={() => setSiftOpen(true)}
              aria-label="How to read this journey"
            >
              <SortIcon size={19} />
            </button>
            <button
              type="button"
              className={styles.action}
              onClick={() => setFairOpen(true)}
              aria-label="Fair copy"
            >
              <FairCopyIcon size={19} />
            </button>
          </div>
        </div>

        {/* What is still being followed, and the one place to tie it off. A
            strand nobody can close quietly becomes clutter. */}
        {running.length > 0 && (
          <div className={styles.following}>
            <span className={styles.followingLabel}>
              <StrandIcon size={14} />
              Following
            </span>
            {running.map((s) => (
              <button
                key={s.id}
                type="button"
                className={styles.strandTab}
                style={{ '--strand': strandColor(s.hue) } as React.CSSProperties}
                onClick={() => setCompose({ as: 'tie', strand: s })}
              >
                <span className={styles.swatch} aria-hidden="true" />
                {s.name}
                <span className={styles.tieOff}>tie off</span>
              </button>
            ))}
          </div>
        )}

        {sifting(sift) && (
          <p className={styles.sifted}>
            Showing {count(showing, { one: 'keep', many: 'keeps' })} of {kept.length}.{' '}
            <button
              type="button"
              className={styles.clear}
              onClick={() => setSift({ ...ALL, order: sift.order })}
            >
              Show everything
            </button>
          </p>
        )}

        {rows.length > 0 ? (
          <section
            className={styles.journey}
            data-variant={variant}
            aria-label="Everything kept from this book"
          >
            {/* Fragments, not wrappers. The Scrapbook lays each sheet over the
                one above it with `.keep + .keep`, and a div around every row
                would break that adjacency and quietly flatten the variation
                back into a list. */}
            {rows.map((row, i) => (
              <Fragment key={`${row.keep.id}-${row.divider ?? ''}`}>
                {row.divider && <h2 className={styles.divider}>{row.divider}</h2>}
                <Keep
                  row={row}
                  strands={threads}
                  last={i === rows.length - 1}
                  onMenu={setMenuKeep}
                  onMotif={(motif) =>
                    setSift((s) => ({ ...s, motif: s.motif === motif ? null : motif }))
                  }
                />
              </Fragment>
            ))}
          </section>
        ) : (
          <p className={styles.absent}>
            {kept.length
              ? 'Nothing here matches that. Change what you are looking for, or show everything again.'
              : 'The thread starts with the first thing you keep.'}
          </p>
        )}

        {/* The colophon: the book's own end matter, set the way a printer would
            set it — terms and details, no charts, no streaks. */}
        {foot.length > 0 && (
          <dl className={styles.colophon}>
            {foot.map(({ term, detail }) => (
              <div key={term} className={styles.colophonLine}>
                <dt>{term}</dt>
                <dd>{detail}</dd>
              </div>
            ))}
          </dl>
        )}

        {/* Sticky rather than fixed: it rides above the journey but stays
            inside the reading column, so it never sits over the bottom bar and
            never floats out over a card's trailing edge on a wide screen. The
            undo is inside it so the two are spaced by a flex gap rather than by
            one of them being told how tall the other is. */}
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

          <GlassSurface className={styles.dockInner}>
            {/* The row is its own element because GlassSurface puts the class
                on its outer shell and lays the children out inside a scrim one
                level down — laying out from the shell leaves the two buttons
                stacked. */}
            <div className={styles.dockRow}>
              <LeafButton className={styles.keepIt} onClick={() => setCompose({ as: 'keep' })}>
                Keep something
              </LeafButton>
              {/* Labelled either way: the words are dropped on a narrow phone
                  so the primary button keeps its own on one line, and the name
                  is on the button itself rather than in the span, so nothing
                  is lost when the span goes. */}
              <button
                type="button"
                className={styles.startStrand}
                aria-label="Start a strand"
                onClick={() => setCompose({ as: 'strand' })}
              >
                <StrandIcon size={17} />
                <span className={styles.startStrandLabel}>Start a strand</span>
              </button>
            </div>
          </GlassSurface>
        </div>
      </div>

      <KeepSheet
        open={compose !== null}
        onClose={() => setCompose(null)}
        book={book}
        strands={threads}
        mode={compose ?? { as: 'keep' }}
      />

      <KeepMenu
        open={menuKeep !== null}
        onClose={() => setMenuKeep(null)}
        keep={menuKeep}
        book={book}
        strands={threads}
        onEdit={() => {
          if (!menuKeep) return
          const editing = menuKeep
          setMenuKeep(null)
          setCompose({ as: 'keep', editing })
        }}
        onDelete={() => {
          if (menuKeep) void deleteKeep(menuKeep)
        }}
      />

      <SiftSheet
        open={siftOpen}
        onClose={() => setSiftOpen(false)}
        sift={sift}
        onChange={setSift}
        keeps={kept}
        strands={threads}
        showing={showing}
      />

      <FairCopySheet
        open={fairOpen}
        onClose={() => setFairOpen(false)}
        book={book}
        keeps={kept}
        strands={threads}
      />

      <BookMenu
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        book={book}
        keeps={kept}
        onRemoved={() => {
          setBookOpen(false)
          navigate('/library')
        }}
      />
    </main>
  )
}

export default BookJourney
