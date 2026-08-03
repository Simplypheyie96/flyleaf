import { useLocation } from 'react-router-dom'
import BookCover from '../components/BookCover'
import LeafButton from '../components/LeafButton'
import Mascot from '../components/Mascot'
import Sparkle from '../components/Sparkle'
import PaperSurface from '../components/PaperSurface'
import Recent, { type HomeDirection } from './home/Recent'
import { currentlyReading } from '../data/sample'
import pageStyles from './page.module.css'
import styles from './Home.module.css'

const DIRECTIONS: HomeDirection[] = ['a', 'b', 'c']

/* The warm landing: archive masthead → currently reading → whatever the second
   section turns out to be. Sample data until 03 (covers) and the entry store
   are wired.

   Two switches, both temporary. `?empty` previews the first-time reader state.
   `?home=a|b|c` picks between the three candidates for the second section — it
   comes out, along with the two that lose, once one is chosen. */
function Home() {
  const query = new URLSearchParams(useLocation().search)
  const empty = query.has('empty')
  const asked = query.get('home') as HomeDirection | null
  const direction = asked && DIRECTIONS.includes(asked) ? asked : 'a'
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
            <PaperSurface rotate={-0.4} className={styles.heroCard}>
              <div className={styles.hero}>
                <BookCover
                  title={book.title}
                  author={book.author}
                  width={104}
                  rotate={-2}
                />
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
                      <div
                        className={styles.gaugeFill}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                  <p className={styles.entryHint}>
                    {book.memories} {book.memories === 1 ? 'memory' : 'memories'}{' '}
                    kept
                  </p>
                </div>
              </div>
            </PaperSurface>
          </section>
        )}

        {/* Outside the branch on purpose. The first run has to be the same
            page with less in it, not a different page: two sections either
            way, each stating what will land there. */}
        <Recent direction={direction} empty={empty} />
      </div>
    </main>
  )
}

export default Home
