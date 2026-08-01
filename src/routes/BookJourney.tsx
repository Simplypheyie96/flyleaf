/* The journey — everything one reader kept from one book.

   Three readings of it, and they are three screens rather than three skins.
   The old version put one set of markup on the page and re-dressed it with a
   `data-variant`, which meant the only things the "variations" could disagree
   about were paddings and borders: the cover was always in the same place, the
   entries were always one column in one order, and the choice the reader was
   being offered was between three densities of the same idea.

   Each reading now owns its own masthead and its own arrangement, and this
   file owns only what all three share — the data, the back bar, the switch,
   the sift, the fair copy, the dock, and every sheet. See journey/layout.ts
   for the whole of what a reading is handed.

   The tab bar and the app's own "+" do not paint over this route at all; App
   hides them, because a book is a room you go into and come back out of. It
   has a back bar to leave by and a dock of its own to add with, and a second
   differently-shaped add button three inches from the first was the app asking
   the reader to work out which "+" they meant. */

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import BackBar, { useCollapse } from '../components/BackBar'
import GlassSurface from '../components/GlassSurface'
import LeafButton from '../components/LeafButton'
import {
  BackIcon,
  BookIcon,
  FairCopyIcon,
  MoreIcon,
  SortIcon,
  StackIcon,
  StrandIcon,
} from '../components/TabIcons'
import type { Entry, Strand } from '../data/db'
import { useBook, useEntries, useStrands } from '../data/useBook'
import Ledger from '../journey/Ledger'
import Deck from '../journey/Deck'
import Weave from '../journey/Weave'
import type { Reading } from '../journey/layout'
import KeepSheet, { type Compose } from '../journey/KeepSheet'
import KeepMenu from '../journey/KeepMenu'
import SiftSheet from '../journey/SiftSheet'
import FairCopySheet from '../journey/FairCopySheet'
import BookMenu from '../journey/BookMenu'
import { colophon, count } from '../journey/lexicon'
import { ALL, arrange, sifting, strandColor, type Sift } from '../journey/order'
import { removeKeep } from '../journey/keeps'
import pageStyles from './page.module.css'
import styles from './BookJourney.module.css'

/* ── The three readings ──────────────────────────────────────────────────── */

type View = 'ledger' | 'deck' | 'weave'

const READINGS: {
  value: View
  label: string
  Icon: typeof BookIcon
  Screen: (props: Reading) => React.ReactNode
}[] = [
  { value: 'ledger', label: 'Ledger', Icon: BookIcon, Screen: Ledger },
  { value: 'deck', label: 'Deck', Icon: StackIcon, Screen: Deck },
  { value: 'weave', label: 'Weave', Icon: StrandIcon, Screen: Weave },
]

const VIEW_KEY = 'flyleaf-journey-view'

function storedView(): View {
  try {
    const saved = localStorage.getItem(VIEW_KEY)
    if (saved === 'ledger' || saved === 'deck' || saved === 'weave') return saved
  } catch {
    /* Private mode, or storage the browser will not hand over. The default
       reading is a fine answer and is not worth an error for. */
  }
  return 'ledger'
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

  const { sentinel, collapsed } = useCollapse()
  const [view, setView] = useState<View>(storedView)
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

  function choose(next: View) {
    setView(next)
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
      <main className={`${pageStyles.page} ${styles.page}`}>
        <div className={`${pageStyles.column} ${styles.column}`}>
          <Link to="/library" className={styles.plainBack}>
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
  const foot = colophon(book, kept, threads)
  const showing = new Set(rows.map((r) => r.keep.id)).size
  const reading = READINGS.find((r) => r.value === view) ?? READINGS[0]

  function tie(strand: Strand) {
    setCompose({ as: 'tie', strand })
  }

  /* The chrome that is the same in all three, handed to whichever reading is
     on so it can decide where it sits. In the Ledger it is a toolbar under a
     quiet header; in the Deck it lands under a masthead. It is the same
     element either way, which is what makes the switch feel like a switch and
     not like three different pages that happen to be linked. */
  const tools = (
    <div className={styles.chrome}>
      <div className={styles.tools}>
        <GlassSurface className={styles.switcher}>
          <div role="radiogroup" aria-label="How to read this journey" className={styles.tabs}>
            {READINGS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={view === value}
                aria-label={label}
                className={styles.tab}
                onClick={() => choose(value)}
              >
                <Icon size={17} />
                {/* The word only for the reading you are in — the same rule the
                    library and the settings tabs already follow, and the reason
                    three tabs fit beside two actions on a phone. */}
                {view === value && (
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
            aria-label="What to show, and in what order"
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

      {/* What is still being followed, and the one place to tie it off — except
          in the Weave, which is a page of strands and puts the tie-off at the
          foot of the strand it closes. A second copy of it up here would be
          two controls for one thing on one screen. */}
      {view !== 'weave' && running.length > 0 && (
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
              onClick={() => tie(s)}
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
    </div>
  )

  return (
    <main className={`${pageStyles.page} ${styles.page}`}>
      <div className={`${pageStyles.column} ${styles.column}`}>
        <BackBar
          to="/library"
          from="Library"
          title={book.title}
          collapsed={collapsed}
          action={
            <button
              type="button"
              className={styles.barAction}
              onClick={() => setBookOpen(true)}
              aria-label="About this book"
            >
              <MoreIcon size={20} />
            </button>
          }
        />

        <reading.Screen
          book={book}
          keeps={kept}
          strands={threads}
          rows={rows}
          sift={sift}
          tools={tools}
          sentinel={sentinel}
          onMenu={setMenuKeep}
          onMotif={(motif) =>
            setSift((s) => ({ ...s, motif: s.motif === motif ? null : motif }))
          }
          onAbout={() => setBookOpen(true)}
          onTie={tie}
        />

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
            inside the reading column, so it never floats out over a card's
            trailing edge on a wide screen. The undo is inside it so the two are
            spaced by a flex gap rather than by one being told how tall the
            other is. */}
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
                  is on the button itself rather than in the span, so nothing is
                  lost when the span goes. */}
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
