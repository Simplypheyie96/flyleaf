import GlassSurface from '../components/GlassSurface'
import BookCover from '../components/BookCover'
import LeafButton from '../components/LeafButton'
import PaperSurface from '../components/PaperSurface'
import ThemeToggle from '../components/ThemeToggle'
import pageStyles from './page.module.css'
import styles from './Styleguide.module.css'

/* Invented titles, as everywhere else in this repo — no real book, author, or
   reference is ever surfaced in the app. Twelve is enough to see all five
   families and to catch two neighbours drawing the same motif. */
const COVER_SPECIMENS: { title: string; author: string }[] = [
  { title: 'The Lantern Season', author: 'A. Winters' },
  { title: 'Salt Meridian', author: 'R. Okonkwo' },
  { title: 'A Field Guide to Quiet Hours', author: 'M. Hale' },
  { title: 'The Cartographer’s Daughter', author: 'E. Vasquez' },
  { title: 'Winter Ferry', author: 'J. Adeyemi' },
  { title: 'The Paper Orchard', author: 'L. Brennan' },
  { title: 'Nine Kinds of Weather', author: 'S. Mbeki' },
  { title: 'The Long Room', author: 'T. Fairweather' },
  { title: 'Hollow Bones', author: 'C. Nakamura' },
  { title: 'Every Small Hour', author: 'D. Oyelaran' },
  { title: 'The Tin Almanac', author: 'P. Strand' },
  { title: 'Marginalia', author: 'K. Ellery' },
]

/* The approved 01 swatch card, kept as a living reference at /styleguide. */
function Styleguide() {
  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.column}>
        <header className={styles.masthead}>
          <p className={styles.greeting}>Good evening, reader.</p>
          <h1 className={styles.title}>Flyleaf</h1>
        </header>

        <div>
          <PaperSurface taped rotate={-1.2} className={styles.entryCard}>
            <p className={styles.cardLine}>“Every book deserves a flyleaf.”</p>
            <p className={styles.cardCaption}>Paper — content surface</p>
          </PaperSurface>

          <GlassSurface className={styles.glassOverlap}>
            <ThemeToggle />
          </GlassSurface>
        </div>

        <div className={styles.buttons}>
          <LeafButton>Begin a journey</LeafButton>
          <LeafButton variant="plus" aria-label="Add an entry">
            +
          </LeafButton>
          <LeafButton disabled>Begin a journey</LeafButton>
        </div>

        {/* Generated covers. Twelve titles, so all four arrangements and every
            thread pair are on screen at once. Kept here permanently: this is
            where you check that a book's cover has not drifted, since the same
            titles must draw the same art forever. */}
        <section className={styles.covers}>
          {COVER_SPECIMENS.map(({ title, author }) => (
            <BookCover key={title} title={title} author={author} />
          ))}
        </section>
      </div>
    </main>
  )
}

export default Styleguide
