/* TEMPORARY — a side-by-side of the candidate type systems on real Flyleaf
   content, so the direction can be chosen by eye rather than by description.
   Delete this route (and the losing font packages) once a direction is picked.

   Round three, rebuilt around the Lumina reference. Two things it does that
   neither earlier round did:

     · Two fonts, and one of them is the mono. Round two retired mono on the
       grounds that nothing in a book journal was typed on a typewriter. The
       reference says otherwise: mono carries the labels AND the body copy,
       and a high-contrast display serif carries the values. There is no sans
       anywhere, so --font-sans points at the mono in every panel.

     · Labels are mono, values are serif. Flyleaf does the exact inverse today
       — 214 / 502, 43% and "3 memories kept" are all mono and nothing is
       serif — which is why our metadata reads as scattered and theirs reads
       as composed. The stat block below the hero shows the inversion on
       Flyleaf's own numbers.

   Handwriting stays on note cards and nowhere else. */
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/geist-mono'
import '@fontsource-variable/bodoni-moda'
import '@fontsource-variable/bodoni-moda/wght-italic.css'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/fraunces/full-italic.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
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
    key: 'editorial',
    name: '1 · Instrument Serif + Geist Mono',
    note: 'The reference, near enough exactly: a hairline display serif for anything that is a value, a clean grotesque mono for everything that is a label. One weight of serif, so it can never go bold and shouty.',
    className: styles.editorial,
  },
  {
    key: 'didone',
    name: '2 · Bodoni Moda + JetBrains Mono',
    note: 'The same idea pushed further — a true Didone, thick strokes against genuine hairlines. Sharpest and coldest of the three; the most fashion-magazine of them.',
    className: styles.didone,
  },
  {
    key: 'warm',
    name: '3 · Fraunces + IBM Plex Mono',
    note: 'Same structure, softened. Fraunces with its wonk turned off and IBM Plex Mono underneath keep the editorial skeleton but read warmer, which suits a reading journal in daylight better than a hairline Didone does.',
    className: styles.warm,
  },
]

/* The reference's core move, on Flyleaf's own numbers: mono says what it is,
   serif says what it is worth. */
const STATS = [
  { label: 'Progress', value: '43%' },
  { label: 'Pages', value: '214' },
  { label: 'Memories', value: '3' },
  { label: 'Started', value: 'March' },
]

function Specimen() {
  const book = currentlyReading
  const pct = Math.round((book.pagesRead / book.pages) * 100)
  return (
    <>
      <header className={home.masthead}>
        <h1 className={home.title}>Your Personal Archive</h1>
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

      <dl className={styles.stats}>
        {STATS.map((s) => (
          <div key={s.label} className={styles.stat}>
            <dt className={styles.statLabel}>{s.label}</dt>
            <dd className={styles.statValue}>{s.value}</dd>
          </div>
        ))}
      </dl>

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
