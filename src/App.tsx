import { useState } from 'react'
import GlassSurface from './components/GlassSurface'
import InstallPrompt from './components/InstallPrompt'
import LeafButton from './components/LeafButton'
import PaperSurface from './components/PaperSurface'
import SplashScreen from './components/SplashScreen'
import ThemeToggle from './components/ThemeToggle'
import UpdateToast from './components/UpdateToast'
import { BookIcon, HomeIcon, SettingsIcon } from './components/TabIcons'
import styles from './App.module.css'

const TABS = [
  { label: 'Home', Icon: HomeIcon },
  { label: 'Library', Icon: BookIcon },
  { label: 'Settings', Icon: SettingsIcon },
]

/* Foundations demo — proves tokens, type, materials, and the shell zones.
   Real screens replace this from 02 onward. */
function App() {
  const [activeTab, setActiveTab] = useState('Home')

  const navPills = TABS.map(({ label, Icon }) => {
    const active = activeTab === label
    return (
      <button
        key={label}
        type="button"
        className={styles.navPill}
        aria-pressed={active}
        aria-label={label}
        onClick={() => setActiveTab(label)}
      >
        <Icon />
        {active && <span className={styles.navLabel}>{label}</span>}
      </button>
    )
  })

  return (
    <>
      <SplashScreen />
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

      {/* Shell zones: bottom bar on phones, side rail on iPad/desktop */}
      <div className={styles.bottomBar}>
        <GlassSurface>
          <nav className={styles.barNav} aria-label="Main">
            {navPills}
          </nav>
        </GlassSurface>
      </div>
      <div className={styles.sideRail}>
        <GlassSurface>
          <nav className={styles.railNav} aria-label="Main">
            {navPills}
          </nav>
        </GlassSurface>
      </div>

      <UpdateToast />
      <InstallPrompt />
    </>
  )
}

export default App
