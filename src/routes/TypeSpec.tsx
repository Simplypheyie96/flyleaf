/* TEMPORARY — a side-by-side of the candidate type systems on real Flyleaf
   content, so the direction can be chosen by eye rather than by description.
   Delete this route (and the losing font packages) once a direction is picked.

   Round two. Round one showed three FOUR-voice systems, which is the thing
   that actually looked wrong: serif + sans + typewriter mono + handwriting all
   on one card. Every panel below is built on a role split instead —

     voice     the book and the reader: titles, quotes, section heads
     structure the app: labels, counts, metadata, nav, buttons
     hand      one accent, note cards only

   Typewriter mono is retired in all three. What made it read as a small label
   was the uppercase and the letterspacing, not the monospacing, so those stay
   and only the family changes. */
import '@fontsource-variable/source-serif-4'
import '@fontsource-variable/source-serif-4/wght-italic.css'
import '@fontsource-variable/source-sans-3'
import '@fontsource-variable/crimson-pro'
import '@fontsource-variable/crimson-pro/wght-italic.css'
import '@fontsource-variable/inter-tight'
import '@fontsource-variable/newsreader'
import '@fontsource-variable/newsreader/wght-italic.css'
import '@fontsource-variable/caveat'

import BookCover from '../components/BookCover'
import PaperSurface from '../components/PaperSurface'
import { QuoteIcon } from '../components/TabIcons'
import { currentlyReading } from '../data/sample'
import pageStyles from './page.module.css'
import home from './Home.module.css'
import styles from './TypeSpec.module.css'

const SYSTEMS = [
  {
    key: 'kin',
    name: '1 · One superfamily',
    note: 'Source Serif 4 and Source Sans 3 — a serif and a sans drawn by the same hand to sit together. Nothing can clash by construction; the hierarchy is size, weight and italic only.',
    className: styles.kin,
  },
  {
    key: 'roles',
    name: '2 · Strict roles',
    note: 'Crimson Pro for the voice, Inter Tight for the structure. Deliberately unlike each other, so a quote reads as something a person wrote and a label reads as something the app said.',
    className: styles.roles,
  },
  {
    key: 'solo',
    name: '3 · One family, full stop',
    note: 'Newsreader alone — titles, quotes, labels, counts, all of it. Separated only by size, weight and tracking. The most book-like, and the quietest.',
    className: styles.solo,
  },
]

function Specimen() {
  const book = currentlyReading
  const pct = Math.round((book.pagesRead / book.pages) * 100)
  return (
    <>
      <header className={home.masthead}>
        <h1 className={home.title}>Your Personal Archive</h1>
        {/* handwriting has come off the subtitle — it now belongs to the voice */}
        <p className={`${home.subtitle} ${styles.voiceSub}`}>
          collecting whispers and ink
        </p>
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
