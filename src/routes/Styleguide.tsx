import GlassSurface from '../components/GlassSurface'
import BookCover from '../components/BookCover'
import type { CoverHue } from '../components/BookCover'
import LeafButton from '../components/LeafButton'
import PaperSurface from '../components/PaperSurface'
import ThemeToggle from '../components/ThemeToggle'
import pageStyles from './page.module.css'
import styles from './Styleguide.module.css'

/* Invented titles, as everywhere else in this repo — no real book, author, or
   reference is ever surfaced in the app. Twelve is enough to see all five
   families and to catch two neighbours drawing the same motif. */
const COVER_SPECIMENS: { title: string; author: string; hue: CoverHue }[] = [
  { title: 'The Lantern Season', author: 'A. Winters', hue: 'image' },
  { title: 'Salt Meridian', author: 'R. Okonkwo', hue: 'voice' },
  { title: 'A Field Guide to Quiet Hours', author: 'M. Hale', hue: 'quote' },
  { title: 'The Cartographer’s Daughter', author: 'E. Vasquez', hue: 'highlight' },
  { title: 'Winter Ferry', author: 'J. Adeyemi', hue: 'note' },
  { title: 'The Paper Orchard', author: 'L. Brennan', hue: 'quote' },
  { title: 'Nine Kinds of Weather', author: 'S. Mbeki', hue: 'highlight' },
  { title: 'The Long Room', author: 'T. Fairweather', hue: 'image' },
  { title: 'Hollow Bones', author: 'C. Nakamura', hue: 'voice' },
  { title: 'Every Small Hour', author: 'D. Oyelaran', hue: 'note' },
  { title: 'The Tin Almanac', author: 'P. Strand', hue: 'image' },
  { title: 'Marginalia', author: 'K. Ellery', hue: 'quote' },
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

        {/* Generated covers, shown against the five entry hues. Kept here
            permanently: this is where you check that a book's cover has not
            drifted, since the same titles must draw the same art forever. */}
        <section className={styles.covers}>
          {COVER_SPECIMENS.map(({ title, author, hue }) => (
            <BookCover key={title} title={title} author={author} hue={hue} />
          ))}
        </section>
      </div>
    </main>
  )
}

export default Styleguide
