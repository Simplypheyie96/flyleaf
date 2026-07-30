import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import GlassSurface from './components/GlassSurface'
import InstallPrompt from './components/InstallPrompt'
import LeafButton from './components/LeafButton'
import SplashScreen from './components/SplashScreen'
import { BookIcon, HomeIcon, SettingsIcon } from './components/TabIcons'
import UpdateToast from './components/UpdateToast'
import Home from './routes/Home'
import Library from './routes/Library'
import Settings from './routes/Settings'
import Styleguide from './routes/Styleguide'
import TypeSpec from './routes/TypeSpec'
import styles from './App.module.css'

const TABS = [
  { label: 'Home', to: '/', Icon: HomeIcon },
  { label: 'Library', to: '/library', Icon: BookIcon },
  { label: 'Settings', to: '/settings', Icon: SettingsIcon },
]

function NavPills() {
  return (
    <>
      {TABS.map(({ label, to, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={styles.navPill}
          aria-label={label}
        >
          {({ isActive }) => (
            <>
              <Icon />
              {isActive && <span className={styles.navLabel}>{label}</span>}
            </>
          )}
        </NavLink>
      ))}
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <SplashScreen />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/library" element={<Library />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/styleguide" element={<Styleguide />} />
        <Route path="/typespec" element={<TypeSpec />} />
      </Routes>

      {/* Shell zones: bottom capsule bar + adjacent add action on phones,
          side rail on iPad/desktop */}
      <div className={styles.bottomBar}>
        <GlassSurface>
          <nav className={styles.barNav} aria-label="Main">
            <NavPills />
          </nav>
        </GlassSurface>
        <LeafButton variant="plus" aria-label="Add a book">
          +
        </LeafButton>
      </div>
      <div className={styles.sideRail}>
        <GlassSurface>
          <nav className={styles.railNav} aria-label="Main">
            <NavPills />
          </nav>
        </GlassSurface>
        <LeafButton variant="plus" aria-label="Add a book">
          +
        </LeafButton>
      </div>

      <UpdateToast />
      <InstallPrompt />
    </BrowserRouter>
  )
}

export default App
