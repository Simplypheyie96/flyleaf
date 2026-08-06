import { useEffect, useState } from "react";
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import AddBookSheet from "./components/AddBookSheet";
import GlassSurface from "./components/GlassSurface";
import InstallPrompt from "./components/InstallPrompt";
import LeafButton from "./components/LeafButton";
import SplashScreen from "./components/SplashScreen";
import { BookIcon, HomeIcon, SettingsIcon } from "./components/TabIcons";
import UpdateToast from "./components/UpdateToast";
import BackupNudge from "./components/BackupNudge";
import Welcome from "./onboarding/Welcome";
import BoardLab from "./routes/BoardLab";
import BookJourney from "./routes/BookJourney";
import CardLab from "./routes/CardLab";
import HomeLab from "./routes/HomeLab";
import Home from "./routes/Home";
import Library from "./routes/Library";
import Settings from "./routes/Settings";
import Styleguide from "./routes/Styleguide";
import styles from "./App.module.css";
import toast from "./components/Toast.module.css";

const TABS = [
  { label: "Home", to: "/", Icon: HomeIcon },
  { label: "Library", to: "/library", Icon: BookIcon },
  { label: "Settings", to: "/settings", Icon: SettingsIcon },
];

function NavPills() {
  return (
    <>
      {TABS.map(({ label, to, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
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
  );
}

/* The app's own furniture: the tab bar on a phone, the rail on a desktop, and
   the one "+" that adds a book.

   It renders inside the router rather than beside it because one screen does
   not want it. A book's journey is a room you go into and come back out of:
   it has its own back bar, its own way to add something, and its own bottom
   dock. Painted over that, the tab bar offered a second, differently-shaped
   add button for a different thing three inches from the first, and three
   tabs out of the room the reader had just chosen to be in. A detail screen
   with a back affordance does not also need the map. */
function Shell({ onAdd }: { onAdd: () => void }) {
  const { pathname } = useLocation();
  // A journey is a room you go into and come back out of; the card gallery is
  // a workbench. Neither wants the app's map painted over it.
  if (pathname.startsWith("/book/") || pathname.startsWith("/lab/")) return null;

  return (
    <>
      {/* Shell zones: bottom capsule bar + adjacent add action on phones,
          side rail on iPad/desktop */}
      <div className={styles.bottomBar}>
        <GlassSurface>
          <nav className={styles.barNav} aria-label="Main">
            <NavPills />
          </nav>
        </GlassSurface>
        <LeafButton variant="plus" aria-label="Add a book" onClick={onAdd}>
          +
        </LeafButton>
      </div>
      <div className={styles.sideRail}>
        <GlassSurface>
          <nav className={styles.railNav} aria-label="Main">
            <NavPills />
          </nav>
        </GlassSurface>
        <LeafButton variant="plus" aria-label="Add a book" onClick={onAdd}>
          +
        </LeafButton>
      </div>
    </>
  );
}

function App() {
  // The add action exists twice — once in the phone's bottom bar, once in the
  // desktop rail — but there is only ever one sheet, so it is opened from
  // here rather than from either shell.
  const [adding, setAdding] = useState(false);
  // What the add sheet should already have typed in it — the Library's
  // "Find a book" scope hands its words over this way.
  const [seed, setSeed] = useState("");

  useEffect(() => {
    function find(event: Event) {
      setSeed((event as CustomEvent<string>).detail ?? "");
      setAdding(true);
    }
    window.addEventListener("flyleaf-find-book", find);
    return () => window.removeEventListener("flyleaf-find-book", find);
  }, []);

  return (
    <BrowserRouter>
      <SplashScreen />
      {/* Outside the routes on purpose: the welcome is the app's front door,
          not a page, and it must cover whichever screen a fresh install lands
          on. It removes itself the moment it is answered or skipped. */}
      <Welcome />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/library" element={<Library />} />
        <Route path="/book/:id" element={<BookJourney />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/styleguide" element={<Styleguide />} />
        <Route path="/lab/cards" element={<CardLab />} />
        <Route path="/lab/home" element={<HomeLab />} />
        <Route path="/lab/board" element={<BoardLab />} />
      </Routes>

      <Shell onAdd={() => setAdding(true)} />
      <AddBookSheet
        open={adding}
        seed={seed}
        onClose={() => {
          setAdding(false);
          setSeed("");
        }}
      />

      {/* One column, so an update landing while the install invite is up
          stacks instead of overlapping it. */}
      <div className={toast.dock}>
        <UpdateToast />
        <InstallPrompt />
        <BackupNudge />
      </div>
    </BrowserRouter>
  );
}

export default App;
