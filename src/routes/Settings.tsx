import PaperSurface from '../components/PaperSurface'
import ThemeToggle from '../components/ThemeToggle'
import pageStyles from './page.module.css'
import styles from './Stub.module.css'

/* Minimal for now: appearance only. Real settings grow in later steps. */
function Settings() {
  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.column}>
        <PaperSurface rotate={0.6}>
          <div className={styles.card}>
            <h1 className={styles.headline}>Appearance</h1>
            <p className={styles.body}>
              Auto follows your device; Day and Night stay as you set them.
            </p>
            <div className={styles.toggleRow}>
              <ThemeToggle />
            </div>
          </div>
        </PaperSurface>
      </div>
    </main>
  )
}

export default Settings
