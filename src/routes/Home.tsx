import { Link, useLocation } from 'react-router-dom'
import LeafButton from '../components/LeafButton'
import PaperSurface from '../components/PaperSurface'
import { NoteIcon, QuoteIcon } from '../components/TabIcons'
import {
  currentlyReading,
  recentMemories,
} from '../data/sample'
import pageStyles from './page.module.css'
import styles from './Home.module.css'

const MEMORY_ICONS = {
  quote: QuoteIcon,
  note: NoteIcon,
}

function Sparkle({ className }: { className: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12 2 C 13 8 16 11 22 12 C 16 13 13 16 12 22 C 11 16 8 13 2 12 C 8 11 11 8 12 2 Z"
      />
    </svg>
  )
}

/* The warm landing: archive masthead → still reading → memory timeline.
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
              <p className={styles.emptyBody}>
                Add the first book you want to remember.
              </p>
              <LeafButton>+ Add a book</LeafButton>
            </div>
          </PaperSurface>
        ) : (
          <>
            <section aria-labelledby="still-reading">
              <div className={styles.sectionHead}>
                <h2 id="still-reading" className={styles.sectionLabel}>
                  Still reading
                </h2>
                <Link className={styles.viewAll} to="/library">
                  View all
                </Link>
              </div>
              <PaperSurface rotate={-0.6}>
                <div className={styles.hero}>
                  <div className={styles.cover} aria-hidden="true">
                    <span className={styles.coverTitle}>{book.title}</span>
                    <span className={styles.coverAuthor}>{book.author}</span>
                  </div>
                  <div className={styles.heroInfo}>
                    <h3 className={styles.heroTitle}>{book.title}</h3>
                    <p className={styles.heroAuthor}>{book.author}</p>
                    <div className={styles.gauge}>
                      <div className={styles.gaugeHead}>
                        <span>Progress</span>
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
                        <div
                          className={styles.gaugeFill}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                    <p className={styles.entryHint}>
                      {book.pagesRead} of {book.pages} · {book.entryHint}
                    </p>
                  </div>
                </div>
              </PaperSurface>
            </section>

            <section aria-labelledby="recent-memories">
              <div className={styles.sectionHead}>
                <h2 id="recent-memories" className={styles.sectionLabel}>
                  Recent memories
                </h2>
                <Sparkle
                  className={`${styles.sparkle} ${styles.sparkleMemories}`}
                />
              </div>
              <div className={styles.timeline}>
                {recentMemories.map((memory, i) => {
                  const Icon = MEMORY_ICONS[memory.type]
                  const typeClass =
                    memory.type === 'quote'
                      ? styles.memoryQuote
                      : styles.memoryNote
                  return (
                    <div
                      key={memory.text}
                      className={`${styles.timelineItem} ${typeClass}`}
                    >
                      <span className={styles.dot} aria-hidden="true" />
                      <PaperSurface
                        tone={memory.type}
                        rotate={i % 2 === 0 ? 0.6 : -0.6}
                      >
                        <span className={styles.chip} aria-hidden="true">
                          <Icon size={16} />
                        </span>
                        <span className={styles.memoryType}>
                          {memory.type} · {memory.source}
                        </span>
                        <p className={styles.memoryText}>{memory.text}</p>
                      </PaperSurface>
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}

export default Home
