import { Link, useLocation } from 'react-router-dom'
import BookCover from '../components/BookCover'
import LeafButton from '../components/LeafButton'
import Mascot from '../components/Mascot'
import Sparkle from '../components/Sparkle'
import PaperSurface from '../components/PaperSurface'
import { QuoteIcon, VoiceIcon } from '../components/TabIcons'
import { currentlyReading, recentMemories } from '../data/sample'
import type { SampleMemory } from '../data/sample'
import pageStyles from './page.module.css'
import styles from './Home.module.css'

const WAVE_HEIGHTS = [10, 18, 26, 14, 30, 22, 12, 24, 16, 28, 18, 10, 20, 14]

/* Each entry type is its own object: a quotation, a sticky note, a player. */
function MemoryCard({ memory, index }: { memory: SampleMemory; index: number }) {
  const rotate = index % 2 === 0 ? 0.6 : -0.6

  if (memory.type === 'quote') {
    return (
      <div className={`${styles.timelineItem} ${styles.memoryQuote}`}>
        <span className={styles.dot} aria-hidden="true" />
        <PaperSurface tone="quote" rotate={rotate} className={styles.quoteCard}>
          <span className={styles.chip} aria-hidden="true">
            <QuoteIcon size={16} />
          </span>
          <span className={styles.quoteMark} aria-hidden="true">
            “
          </span>
          <p className={styles.quoteText}>{memory.text}</p>
          <span className={`${styles.memoryType} ${styles.quoteMeta}`}>{memory.source}</span>
        </PaperSurface>
      </div>
    )
  }

  if (memory.type === 'voice') {
    return (
      <div className={`${styles.timelineItem} ${styles.memoryVoice}`}>
        <span className={styles.dot} aria-hidden="true" />
        <PaperSurface tone="voice" rotate={rotate}>
          <span className={styles.chip} aria-hidden="true">
            <VoiceIcon size={16} />
          </span>
          <div className={styles.voiceRow}>
            <button type="button" className={styles.playButton} aria-label="Play voice memo">
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path fill="currentColor" d="M5 3.5 L 12.5 8 L 5 12.5 Z" />
              </svg>
            </button>
            <div className={styles.waveform} aria-hidden="true">
              {WAVE_HEIGHTS.map((h, i) => (
                <span key={i} className={styles.wavebar} style={{ height: `${h}px` }} />
              ))}
            </div>
          </div>
          <div className={styles.voiceMeta}>
            <span className={styles.memoryType}>Voice memo · {memory.duration}</span>
            <span className={styles.memoryType}>{memory.date}</span>
          </div>
        </PaperSurface>
      </div>
    )
  }

  return (
    <div className={`${styles.timelineItem} ${styles.memoryNote}`}>
      <span className={styles.dot} aria-hidden="true" />
      <PaperSurface tone="note" rotate={rotate} className={styles.noteCard}>
        <span className={styles.memoryType}>Note · {memory.source}</span>
        <p className={styles.noteText}>{memory.text}</p>
      </PaperSurface>
    </div>
  )
}

/* The warm landing: archive masthead → currently reading → memory timeline.
   Sample data until 03 (covers) and the entry store are wired.
   `?empty` previews the first-time reader state. */
function Home() {
  const empty = new URLSearchParams(useLocation().search).has('empty')
  const book = currentlyReading
  const progressPct = Math.round((book.pagesRead / book.pages) * 100)

  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.column}>
        <header className={styles.masthead}>
          <h1 className={styles.title}>Your Personal Archive</h1>
          <p className={styles.subtitle}>collecting whispers and ink</p>
          <Sparkle className={`${styles.sparkle} ${styles.sparkleMast}`} />
        </header>

        {empty ? (
          <PaperSurface taped rotate={-0.8}>
            <div className={styles.empty}>
              <h2 className={styles.emptyHeadline}>Your shelf is waiting.</h2>
              <p className={styles.emptyBody}>Add the first book you want to remember.</p>
              <LeafButton>+ Add a book</LeafButton>
            </div>
          </PaperSurface>
        ) : (
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
              {/* The card is the way into the book, so the whole card is the
                  control — not a "view" link tucked under it. A reader who taps
                  a cover expects to be in the book, and a card that shows a
                  title, a cover and a progress bar and then does nothing when
                  touched is the app telling them they read it wrong.

                  The link is outside the paper rather than inside it so the tap
                  target is the card including its padding; wrapping only the
                  content would leave a dead 24px frame that looks tappable.

                  The id is written here until the book store lands. */}
              <Link to="/book/111111" className={styles.heroLink}>
                <PaperSurface rotate={-0.4} className={styles.heroCard}>
                  <div className={styles.hero}>
                    <BookCover title={book.title} author={book.author} width={104} rotate={-2} />
                    <div className={styles.heroInfo}>
                      <h3 className={styles.heroTitle}>{book.title}</h3>
                      <p className={styles.heroAuthor}>{book.author}</p>
                      <div className={styles.gauge}>
                        <div className={styles.gaugeHead}>
                          <span>
                            {book.pagesRead} / {book.pages}
                          </span>
                          <span>{progressPct}%</span>
                        </div>
                        <div
                          className={styles.gaugeTrack}
                          role="progressbar"
                          aria-label="Reading progress"
                          aria-valuenow={book.pagesRead}
                          aria-valuemin={0}
                          aria-valuemax={book.pages}
                        >
                          <div className={styles.gaugeFill} style={{ width: `${progressPct}%` }} />
                        </div>
                      </div>
                      <p className={styles.entryHint}>
                        {book.memories} {book.memories === 1 ? 'memory' : 'memories'} kept
                      </p>
                    </div>
                  </div>
                </PaperSurface>
              </Link>
            </section>

            <section aria-labelledby="recent-memories">
              <div className={styles.sectionHead}>
                <h2 id="recent-memories" className={styles.sectionLabel}>
                  Recent memories
                </h2>
                <Sparkle className={`${styles.sparkle} ${styles.sparkleMemories}`} />
              </div>
              <div className={styles.timeline}>
                {recentMemories.map((memory, i) => (
                  <MemoryCard key={`${memory.type}-${i}`} memory={memory} index={i} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}

export default Home
