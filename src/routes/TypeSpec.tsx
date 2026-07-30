/* TEMPORARY — a side-by-side of the three candidate type systems on real
   Flyleaf content, so the direction can be chosen by eye rather than by
   description. Delete this route (and the losing font packages) once a
   direction is picked. */
import '@fontsource-variable/literata'
import '@fontsource-variable/literata/wght-italic.css'
import '@fontsource-variable/instrument-sans'
import '@fontsource-variable/caveat'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/fraunces/wght-italic.css'
import '@fontsource-variable/newsreader'
import '@fontsource-variable/newsreader/wght-italic.css'
import '@fontsource/space-mono'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/inter-tight'
import '@fontsource-variable/inter-tight/wght-italic.css'

import BookCover from '../components/BookCover'
import PaperSurface from '../components/PaperSurface'
import { QuoteIcon } from '../components/TabIcons'
import { currentlyReading } from '../data/sample'
import pageStyles from './page.module.css'
import home from './Home.module.css'
import styles from './TypeSpec.module.css'

const SYSTEMS = [
  {
    key: 'reading',
    name: 'A · The reading room',
    note: 'Literata — the typeface Google built for Play Books — with Instrument Sans and Caveat. A well-made paperback: warm, sturdy, calm.',
    className: styles.reading,
  },
  {
    key: 'press',
    name: 'B · The small press',
    note: 'Fraunces (old-style, with wonk) over Newsreader and Space Mono. An independent literary journal — the Kafka/RED direction.',
    className: styles.press,
  },
  {
    key: 'journal',
    name: 'C · The modern journal',
    note: 'Bricolage Grotesque over Inter Tight. A current app that happens to hold books — the GO Plus direction. Biggest departure.',
    className: styles.journal,
  },
]

function Specimen() {
  const book = currentlyReading
  const pct = Math.round((book.pagesRead / book.pages) * 100)
  return (
    <>
      <header className={home.masthead}>
        <h1 className={home.title}>Your Personal Archive</h1>
        <p className={home.subtitle}>collecting whispers and ink</p>
      </header>

      <div className={home.sectionHead}>
        <h2 className={home.sectionLabel}>Still reading</h2>
      </div>
      <PaperSurface rotate={-0.4} className={home.heroCard}>
        <div className={home.hero}>
          <BookCover
            title={book.title}
            author={book.author}
            hue="image"
            width={104}
            rotate={-2}
          />
          <div className={home.heroInfo}>
            <h3 className={home.heroTitle}>{book.title}</h3>
            <p className={home.heroAuthor}>{book.author}</p>
            <div className={home.gauge}>
              <div className={home.gaugeHead}>
                <span>
                  {book.pagesRead} / {book.pages}
                </span>
                <span>{pct}%</span>
              </div>
              <div className={home.gaugeTrack}>
                <div className={home.gaugeFill} style={{ width: `${pct}%` }} />
              </div>
            </div>
            <p className={home.entryHint}>{book.memories} memories kept</p>
          </div>
        </div>
      </PaperSurface>

      <div className={home.sectionHead}>
        <h2 className={home.sectionLabel}>Recent memories</h2>
      </div>
      <div className={`${home.timelineItem} ${home.memoryQuote} ${styles.loose}`}>
        <PaperSurface tone="quote" rotate={0.6} className={home.quoteCard}>
          <span className={home.chip} aria-hidden="true">
            <QuoteIcon size={16} />
          </span>
          <span className={home.quoteMark} aria-hidden="true">
            “
          </span>
          <p className={home.quoteText}>The rain kept its own kind of time.</p>
          <span className={`${home.memoryType} ${home.quoteMeta}`}>
            The Lantern Season
          </span>
        </PaperSurface>
      </div>
      <div className={`${home.timelineItem} ${home.memoryNote} ${styles.loose}`}>
        <PaperSurface tone="note" rotate={-0.6} className={home.noteCard}>
          <span className={home.memoryType}>Note · Chapter 12</span>
          <p className={home.noteText}>
            The lighthouse chapter reads like a memory of the future.
          </p>
        </PaperSurface>
      </div>
    </>
  )
}

function TypeSpec() {
  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.column}>
        {SYSTEMS.map((s) => (
          <section key={s.key} className={`${styles.panel} ${s.className}`}>
            <div className={styles.tag}>
              <strong>{s.name}</strong>
              <span>{s.note}</span>
            </div>
            <Specimen />
          </section>
        ))}
      </div>
    </main>
  )
}

export default TypeSpec
