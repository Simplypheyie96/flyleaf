import GlassSurface from './components/GlassSurface'
import LeafButton from './components/LeafButton'
import PaperSurface from './components/PaperSurface'
import ThemeToggle from './components/ThemeToggle'
import styles from './App.module.css'

/* Foundations demo — proves tokens, type, and the two materials.
   Replaced by real screens from 02 onward. */
function App() {
  return (
    <main className={styles.page}>
      <div className={styles.column}>
        <header className={styles.masthead}>
          <p className={styles.greeting}>Good evening, reader.</p>
          <h1 className={styles.title}>Flyleaf</h1>
        </header>

        <div>
          <PaperSurface taped rotate={-1.2} className={styles.entryCard}>
            <p className={styles.cardLine}>“Every book deserves a flyleaf.”</p>
            <p className={styles.cardCaption}>Paper — content surface</p>
          </PaperSurface>

          <GlassSurface className={styles.glassBar}>
            <nav className={styles.glassNav} aria-label="Demo">
              <span className={styles.glassLabel}>Library</span>
              <span className={styles.glassLabel}>Search</span>
              <span className={styles.glassLabel}>Settings</span>
            </nav>
          </GlassSurface>
        </div>

        <div className={styles.buttons}>
          <LeafButton>Begin a journey</LeafButton>
          <LeafButton variant="plus" aria-label="Add an entry">
            +
          </LeafButton>
          <LeafButton disabled>Begin a journey</LeafButton>
        </div>

        <GlassSurface className={styles.togglePaper}>
          <ThemeToggle />
        </GlassSurface>
      </div>
    </main>
  )
}

export default App
