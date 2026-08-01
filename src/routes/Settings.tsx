import PaperSurface from '../components/PaperSurface'
import ThemeToggle from '../components/ThemeToggle'
import pageStyles from './page.module.css'
import styles from './Settings.module.css'

/* One section per card. More arrive in later steps — sign-in and sync,
   supporting the builder, how to install, the legal pages — and each should
   take this same shape: heading and control on one line, a sentence of
   explanation underneath both. */

function Settings() {
  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.column}>
        <header className={styles.masthead}>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>how Flyleaf behaves</p>
        </header>

        <PaperSurface className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle} id="appearance">
              Appearance
            </h2>
            <div className={styles.sectionControl}>
              <ThemeToggle labelledBy="appearance" />
            </div>
            <span className={styles.sectionHint}>
              Auto follows your device from day into night. Day and Night hold
              until you change them.
            </span>
          </div>
        </PaperSurface>
      </div>
    </main>
  )
}

export default Settings
