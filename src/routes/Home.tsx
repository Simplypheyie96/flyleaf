import { useLocation } from 'react-router-dom'
import LeafButton from '../components/LeafButton'
import PaperSurface from '../components/PaperSurface'
import { NoteIcon, QuoteIcon } from '../components/TabIcons'
import {
  booksInProgress,
  currentlyReading,
  recentMemories,
} from '../data/sample'
import pageStyles from './page.module.css'
import styles from './Home.module.css'

const MEMORY_ICONS = {
  quote: QuoteIcon,
  note: NoteIcon,
}

/* The warm landing: greeting → still reading → recent memories → add.
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
          <p className={styles.greeting}>Welcome back, reader.</p>
          {!empty && (
            <p className={styles.prompt}>{booksInProgress} books in progress</p>
          )}
        </header>

        {empty ? (
          <PaperSurface taped rotate={-0.8}>
            <div className={styles.empty}>
              <h1 className={styles.emptyHeadline}>Your shelf is waiting.</h1>
              <p className={styles.emptyBody}>
                Add the first book you want to remember.
              </p>
              <LeafButton>+ Add a book</LeafButton>
            </div>
          </PaperSurface>
        ) : (
          <>
            <section aria-labelledby="still-reading">
              <h1 id="still-reading" className={styles.sectionLabel}>
                Still reading
              </h1>
              <PaperSurface rotate={-0.6}>
                <div className={styles.hero}>
                  <div className={styles.cover} aria-hidden="true">
                    <span className={styles.coverTitle}>{book.title}</span>
                    <span className={styles.coverAuthor}>{book.author}</span>
                  </div>
                  <div className={styles.heroInfo}>
                    <h2 className={styles.heroTitle}>{book.title}</h2>
                    <p className={styles.heroAuthor}>{book.author}</p>
                    <div
                      className={styles.progressTrack}
                      role="progressbar"
                      aria-label="Reading progress"
                      aria-valuenow={book.pagesRead}
                      aria-valuemin={0}
                      aria-valuemax={book.pages}
                    >
                      <div
                        className={styles.progressFill}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <p className={styles.progressLine}>
                      {book.pagesRead} of {book.pages} ·{' '}
                      {book.highlightsThisWeek} highlights this week
                    </p>
                    <p className={styles.entryHint}>{book.entryHint}</p>
                  </div>
                </div>
              </PaperSurface>
            </section>

            <section aria-labelledby="recent-memories">
              <h2 id="recent-memories" className={styles.sectionLabel}>
                Recent memories
              </h2>
              <div className={styles.memories}>
                {recentMemories.map((memory, i) => {
                  const Icon = MEMORY_ICONS[memory.type]
                  const typeClass =
                    memory.type === 'quote'
                      ? styles.memoryQuote
                      : styles.memoryNote
                  return (
                    <PaperSurface
                      key={memory.text}
                      rotate={i % 2 === 0 ? 0.7 : -0.7}
                      taped={i === 0}
                      className={typeClass}
                    >
                      <div className={styles.memoryHead}>
                        <span className={styles.memoryIcon}>
                          <Icon size={16} />
                        </span>
                        <span className={styles.memoryType}>
                          {memory.type} · {memory.source}
                        </span>
                      </div>
                      <p className={styles.memoryText}>{memory.text}</p>
                    </PaperSurface>
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
