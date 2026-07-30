import { useState } from 'react'
import GlassSurface from './components/GlassSurface'
import InstallPrompt from './components/InstallPrompt'
import LeafButton from './components/LeafButton'
import PaperSurface from './components/PaperSurface'
import SplashScreen from './components/SplashScreen'
import ThemeToggle from './components/ThemeToggle'
import UpdateToast from './components/UpdateToast'
import styles from './App.module.css'

const TABS = ['Library', 'Search', 'Settings']

/* Foundations demo — proves tokens, type, materials, and the shell zones.
   Real screens replace this from 02 onward. */
function App() {
  const [activeTab, setActiveTab] = useState('Library')

  const navPills = TABS.map((tab) => (
    <button
      key={tab}
      type="button"
      className={styles.navPill}
      aria-pressed={activeTab === tab}
      onClick={() => setActiveTab(tab)}
    >
      {tab}
    </button>
  ))

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
