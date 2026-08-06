import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import BookCover from '../components/BookCover'
import LeafButton from '../components/LeafButton'
import Mascot from '../components/Mascot'
import Sparkle from '../components/Sparkle'
import PaperSurface from '../components/PaperSurface'
import { type Book, type Entry } from '../data/db'
import { useLibrary, useKeepCount, useRecentKeeps } from '../data/useLibrary'
import { getHandle } from '../data/reader'
import { KIND } from '../journey/kinds'
import FirstPage from '../onboarding/FirstPage'
import { directionFor } from './home/directions'
import pageStyles from './page.module.css'
import styles from './Home.module.css'

/* Home, on the reader's own shelf.

   It ran on sample data until now — a fixed book and three invented memories
   — which was right while the store was being built and is a lie the moment
   the reader has a shelf of their own. Everything on this screen is now read
   from Dexie: the book they are in the middle of, the last few things they
   kept, and the count under the cover.

   THE GREETING IS THE ONE HANDWRITTEN THING. The brief asks for a personal
   hand on the greeting so the app opens like a journal rather than a
   dashboard; the name is the only place it appears, because handwriting used
   twice stops being a signature. A reader who skipped the name gets the
   greeting without one, which reads perfectly well. */

const WAVE_HEIGHTS = [10, 18, 26, 14, 30, 22, 12, 24, 16, 28, 18, 10, 20, 14]

function partOfDay() {
  const hour = new Date().getHours()
  if (hour < 5) return 'Still awake'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function shortDay(iso: string) {
  const at = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(at.getTime())) return iso
  return at.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function seconds(total?: number) {
  if (!total) return ''
  const mins = Math.floor(total / 60)
  const rest = Math.round(total % 60)
  return `${mins}:${String(rest).padStart(2, '0')}`
}

/** A picture, decoded from the row it is already holding. */
function Snapshot({ media }: { media: Blob }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const made = URL.createObjectURL(media)
    setUrl(made)
    return () => URL.revokeObjectURL(made)
  }, [media])

  if (!url) return null
  return <img src={url} alt="" className={styles.snapshot} />
}

/* Each kind is its own object on the thread: a quotation, a sticky note, a
   player, a mounted photograph. The three the sample data had are kept
   exactly as they were drawn; the four that had no sample take the note's
   shape, which is what a card of words is. */
function MemoryCard({ keep, book, index }: { keep: Entry; book?: Book; index: number }) {
  const rotate = index % 2 === 0 ? 0.6 : -0.6
  const kind = KIND[keep.type]
  const source = book ? book.title : 'a book you removed'
  const to = `/book/${keep.bookId}#keep-${keep.id}`
  /* Seven kinds share three card shapes, so the notch and the corner chip take
     their colour from the registry rather than from a class per kind — a
     character and a place get their own hue without a new rule. */
  const dot = { background: `var(${kind.hue})` }
  const chip = { color: `var(${kind.hue})` }

  if (keep.type === 'quote') {
    return (
      <div className={`${styles.timelineItem} ${styles.memoryQuote}`}>
        <span className={styles.dot} style={dot} aria-hidden="true" />
        <Link to={to} className={styles.memoryLink}>
          <PaperSurface tone="quote" rotate={rotate} className={styles.quoteCard}>
            <span className={styles.chip} style={chip} aria-hidden="true">
              <kind.Icon size={16} />
            </span>
            <span className={styles.quoteMark} aria-hidden="true">
              “
            </span>
            <p className={styles.quoteText}>{keep.text}</p>
            <span className={`${styles.memoryType} ${styles.quoteMeta}`}>{source}</span>
          </PaperSurface>
        </Link>
      </div>
    )
  }

  if (keep.type === 'voice') {
    return (
      <div className={`${styles.timelineItem} ${styles.memoryVoice}`}>
        <span className={styles.dot} style={dot} aria-hidden="true" />
        <Link to={to} className={styles.memoryLink}>
          <PaperSurface tone="voice" rotate={rotate}>
            <span className={styles.chip} style={chip} aria-hidden="true">
              <kind.Icon size={16} />
            </span>
            <div className={styles.voiceRow}>
              {/* The mark, not a control: a recording is played in its own
                  journey, where the orb and the scrubber live. Tapping the
                  card is what takes you there. */}
              <span className={styles.playButton} aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <path fill="currentColor" d="M5 3.5 L 12.5 8 L 5 12.5 Z" />
                </svg>
              </span>
              <div className={styles.waveform} aria-hidden="true">
                {WAVE_HEIGHTS.map((h, i) => (
                  <span key={i} className={styles.wavebar} style={{ height: `${h}px` }} />
                ))}
              </div>
            </div>
            <div className={styles.voiceMeta}>
              <span className={styles.memoryType}>
                Voice memo{keep.duration ? ` · ${seconds(keep.duration)}` : ''}
              </span>
              <span className={styles.memoryType}>{shortDay(keep.keptOn)}</span>
            </div>
          </PaperSurface>
        </Link>
      </div>
    )
  }

  if (keep.type === 'image' && keep.media) {
    return (
      <div className={`${styles.timelineItem} ${styles.memoryNote}`}>
        <span className={styles.dot} style={dot} aria-hidden="true" />
        <Link to={to} className={styles.memoryLink}>
          <PaperSurface tone="image" rotate={rotate} className={styles.pictureCard}>
            <span className={styles.chip} style={chip} aria-hidden="true">
              <kind.Icon size={16} />
            </span>
            <span className={styles.memoryType}>
              {kind.one} · {source}
            </span>
            <span className={styles.mount}>
              <Snapshot media={keep.media} />
            </span>
            {keep.text && <p className={styles.caption}>{keep.text}</p>}
          </PaperSurface>
        </Link>
      </div>
    )
  }

  return (
    <div className={`${styles.timelineItem} ${styles.memoryNote}`}>
      <span className={styles.dot} style={dot} aria-hidden="true" />
      <Link to={to} className={styles.memoryLink}>
        <PaperSurface tone={kind.tone} rotate={rotate} className={styles.noteCard}>
          <span className={styles.chip} style={chip} aria-hidden="true">
            <kind.Icon size={16} />
          </span>
          <span className={styles.memoryType}>
            {kind.one} · {source}
          </span>
          {keep.name && <p className={styles.noteName}>{keep.name}</p>}
          <p className={styles.noteText}>{keep.text}</p>
        </PaperSurface>
      </Link>
    </div>
  )
}

/** The book to put at the top: the one being read, and failing that the one
    most recently shelved. Started-and-unfinished is the real answer; a reader
    who has not said either way still has a book they added last night. */
function inTheMiddleOf(books: Book[]): Book | undefined {
  const reading = books.filter((book) => !book.finishedOn)
  const started = reading.filter((book) => book.startedOn)
  return started[0] ?? reading[0] ?? books[0]
}

function Hero({ book }: { book: Book }) {
  const kept = useKeepCount(book.id)
  const pages = book.pages ?? 0
  const read = book.pagesRead ?? 0
  const pct = pages > 0 ? Math.min(100, Math.round((read / pages) * 100)) : null

  return (
    <Link to={`/book/${book.id}`} className={styles.heroLink}>
      <PaperSurface rotate={-0.4} className={styles.heroCard}>
        <div className={styles.hero}>
          <BookCover
            title={book.title}
            author={book.author}
            covers={book.covers}
            width={104}
            rotate={-2}
          />
          <div className={styles.heroInfo}>
            <h3 className={styles.heroTitle}>{book.title}</h3>
            <p className={styles.heroAuthor}>{book.author}</p>
            {pct !== null && (
              <div className={styles.gauge}>
                <div className={styles.gaugeHead}>
                  <span>
                    {read} / {pages}
                  </span>
                  <span>{pct}%</span>
                </div>
                <div
                  className={styles.gaugeTrack}
                  role="progressbar"
                  aria-label="Reading progress"
                  aria-valuenow={read}
                  aria-valuemin={0}
                  aria-valuemax={pages}
                >
                  <div className={styles.gaugeFill} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}
            <p className={styles.entryHint}>
              {kept === undefined
                ? ' '
                : kept === 0
                  ? 'Nothing kept from this one yet'
                  : `${kept} ${kept === 1 ? 'memory' : 'memories'} kept`}
            </p>
          </div>
        </div>
      </PaperSurface>
    </Link>
  )
}

function Home() {
  const books = useLibrary()
  const recent = useRecentKeeps(6)
  const [name, setName] = useState(getHandle)

  /* THE CANDIDATE SWITCH, AND IT IS TEMPORARY.

     `?home=a|b|c` swaps the body of this page for one of the directions in
     home/directions.tsx, and `&empty` forces the first-run state so both can be
     compared without emptying the database. /lab/home iframes this page at
     phone width to put them side by side.

     With no query the page is exactly what it was — the old feed — so nothing
     ships until a direction is chosen. Both this block and the feed under it
     come out at that point; see home/directions.tsx. */
  const query = new URLSearchParams(useLocation().search)
  const candidate = directionFor(query.get('home'))
  const forceEmpty = query.has('empty')

  useEffect(() => {
    const sync = () => setName(getHandle())
    window.addEventListener('flyleaf-reader', sync)
    return () => window.removeEventListener('flyleaf-reader', sync)
  }, [])

  /* `undefined` is Dexie still opening. A shelf must not flash its own empty
     state on the way in — the same rule the Library keeps. */
  const shelf = books ?? []
  const settled = books !== undefined
  const book = inTheMiddleOf(shelf)
  const keeps = recent ?? []
  const byId = new Map(shelf.map((b) => [b.id, b]))

  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.column}>
        <header className={styles.masthead}>
          <p className={styles.hello}>
            {partOfDay()}
            {name ? (
              <>
                , <span className={styles.who}>{name}</span>
              </>
            ) : (
              '.'
            )}
          </p>
          <h1 className={styles.title}>Your Personal Archive</h1>
          <p className={styles.subtitle}>collecting whispers and ink</p>
          <Sparkle className={`${styles.sparkle} ${styles.sparkleMast}`} />
        </header>

        {!candidate && <FirstPage />}

        {candidate ? (
          /* A direction owns the whole body, including its own first-run
             state and its own line about which book this is. That is the
             point of comparing them: a home screen is not a section under a
             hero, it is what the screen is. */
          <candidate.Body empty={forceEmpty || (settled && shelf.length === 0)} />
        ) : settled && shelf.length === 0 ? (
          <PaperSurface taped rotate={-0.8}>
            <div className={styles.empty}>
              <h2 className={styles.emptyHeadline}>Your shelf is waiting.</h2>
              <p className={styles.emptyBody}>Add the first book you want to remember.</p>
              <LeafButton
                onClick={() => window.dispatchEvent(new CustomEvent('flyleaf-find-book', { detail: '' }))}
              >
                + Add a book
              </LeafButton>
            </div>
          </PaperSurface>
        ) : (
          book && (
            <>
              <section aria-labelledby="currently-reading">
                <div className={styles.sectionHead}>
                  <h2 id="currently-reading" className={styles.sectionLabel}>
                    Currently reading
                  </h2>
                  {/* The lane is the gap between the end of the heading and the
                      right edge of the card, and it is the mascot's whole world:
                      the creature's travel is written as a share of it, so the
                      heading is a wall it cannot pass without anything having to
                      measure the words. The lane takes no vertical space of its
                      own — the strip hangs out of it — so putting the creature
                      here does not push the card down away from its label. */}
                  <div className={styles.mascotLane}>
                    <Mascot />
                  </div>
                </div>
                <Hero book={book} />
              </section>

              {keeps.length > 0 && (
                <section aria-labelledby="recent-memories">
                  <div className={styles.sectionHead}>
                    <h2 id="recent-memories" className={styles.sectionLabel}>
                      Recent memories
                    </h2>
                    <Sparkle className={`${styles.sparkle} ${styles.sparkleMemories}`} />
                  </div>
                  <div className={styles.timeline}>
                    {keeps.map((keep, i) => (
                      <MemoryCard
                        key={keep.id}
                        keep={keep}
                        book={byId.get(keep.bookId)}
                        index={i}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )
        )}
      </div>
    </main>
  )
}

export default Home
