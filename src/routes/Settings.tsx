import PaperSurface from '../components/PaperSurface'
import Sparkle from '../components/Sparkle'
import ThemeToggle from '../components/ThemeToggle'
import Journey from '../settings/Journey'
import { openInstallGuide } from '../settings/installable'
import { GUIDES, detect, installed } from '../settings/platform'
import card from '../settings/settings.module.css'
import pageStyles from './page.module.css'
import styles from './Settings.module.css'

/* One section per card, in the order a reader needs them: who they are, where
   their journey lives, then how the app looks, then the things you read once
   and never again.

   The card shape itself moved to `src/settings/settings.module.css` when the
   page grew past a single switch — heading and control on one line, a sentence
   of explanation underneath both. */

/* The install row.

   It stays on the page when Flyleaf is already installed rather than
   disappearing: a reader who has it on their phone is exactly the reader who
   wants it on their iPad too, and a guide that vanishes the moment it works
   is a guide nobody can hand to anyone. Only the sentence under it changes. */
function InstallCard() {
  const here = installed()

  return (
    <PaperSurface className={card.section}>
      <div className={card.sectionHead}>
        <h2 className={card.sectionTitle}>On your home screen</h2>
        <span className={card.sectionHint}>
          {here
            ? 'Flyleaf is installed on this device. The guide covers every other one.'
            : `Flyleaf can live on your home screen with its own icon, and works offline either way.`}
        </span>
      </div>
      <div className={card.links}>
        <button type="button" className={card.link} onClick={openInstallGuide}>
          How to install Flyleaf
          <span className={card.linkHint} aria-hidden="true">
            {GUIDES[detect()].label}
          </span>
        </button>
      </div>
    </PaperSurface>
  )
}

function Settings() {
  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.column}>
        <header className={styles.masthead}>
          <h1 className={styles.title}>
            Settings <Sparkle size={15} className={styles.spark} />
          </h1>
          <p className={styles.subtitle}>how Flyleaf behaves</p>
        </header>

        <Journey />

        <InstallCard />

        <PaperSurface className={card.section}>
          <div className={card.sectionHead}>
            <h2 className={card.sectionTitle} id="appearance">
              Appearance
            </h2>
            <div className={card.sectionControl}>
              <ThemeToggle labelledBy="appearance" />
            </div>
            <span className={card.sectionHint}>
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
