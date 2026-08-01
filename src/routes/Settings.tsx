import PaperSurface from '../components/PaperSurface'
import ThemeToggle from '../components/ThemeToggle'
import pageStyles from './page.module.css'
import styles from './Settings.module.css'

/* Appearance is the only section that exists yet — sign-in and sync arrive in
   step 09, the support card in 10, how-to-install in 11, the legal links in
   12. So the job of this one section is to state the pattern clearly enough
   that those four can be dropped in without a second look being invented for
   each of them:

     a section is a paper card with one heading and a stack of rows,
     a row is a label, an optional hint, and one control.

   Everything else on this page follows the app rather than itself: the
   masthead is the Library's, and the theme control is the same segmented
   track as the bottom bar and the shelf's view switcher. */
function Settings() {
  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.column}>
        <header className={styles.masthead}>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>how Flyleaf behaves</p>
        </header>

        <PaperSurface className={styles.section}>
          <h2 className={styles.sectionTitle}>Appearance</h2>

          <div className={styles.row}>
            <div className={styles.rowText}>
              <span className={styles.rowLabel} id="theme-label">
                Theme
              </span>
              <span className={styles.rowHint}>
                Auto follows your device. Day and Night stay as you set them.
              </span>
            </div>
            {/* Named by the visible label rather than carrying its own, so
                "Theme" is not announced twice. */}
            <ThemeToggle labelledBy="theme-label" />
          </div>
        </PaperSurface>
      </div>
    </main>
  )
}

export default Settings
