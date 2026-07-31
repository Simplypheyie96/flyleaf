import GlassSurface from '../components/GlassSurface'
import LeafButton from '../components/LeafButton'
import PaperSurface from '../components/PaperSurface'
import ThemeToggle from '../components/ThemeToggle'
import pageStyles from './page.module.css'
import styles from './Styleguide.module.css'

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
      </div>
    </main>
  )
}

export default Styleguide
