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
import FlowerField from "./brand/FlowerField";
import { BookIcon, HomeIcon, SettingsIcon } from "./components/TabIcons";
import UpdateToast from "./components/UpdateToast";
import Welcome from "./onboarding/Welcome";
import Legal from "./legal/Legal";
import Journal from "./journal/Journal";
import InstallGuide from "./settings/InstallGuide";
import BookJourney from "./routes/BookJourney";
import CardLab from "./routes/CardLab";
import Home from "./routes/Home";
import Library from "./routes/Library";
import Lost from "./routes/Lost";
import Settings from "./routes/Settings";
import Styleguide from "./routes/Styleguide";
import styles from "./App.module.css";

/* The two workbench routes below are ours, not the reader's. They are where a
   card or a token gets looked at under a lamp, and on the live app they are a
   back room somebody could wander into by typing a URL — nothing secret, but
   nothing that belongs to a person keeping a reading journal either.

   Gated on the same flag the preview seed reads, so they stay reachable on
   every branch deploy, which is where they are actually used, and vanish from
   production. Vite folds the constant at build time, so on the live app the
   route elements are not hidden — they are not in the bundle at all. */
declare const __PREVIEW_SEED__: boolean;
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
  // a workbench; a policy is a document you were handed and will hand back;
  // the journal is a sheet of paper about to go through a printer. None of
  // them wants the app's map painted over it — and on the journal the tab bar
  // would be the one thing standing between the reader and the page.
  if (
    pathname.startsWith("/book/") ||
    pathname.startsWith("/lab/") ||
    pathname.startsWith("/legal/") ||
    pathname.startsWith("/journal")
  )
    return null;

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

/* The toasts, in one column so an update landing while the install invite is up
   stacks instead of overlapping it.

   THE BACKUP NUDGE USED TO BE HERE AND IS GONE. 09 asks the app to gently
   nudge readers toward a backup, and this was that nudge: once, at six keeps,
   dismissible, never repeating. It was still wrong. Saving a copy already has
   a permanent home in Settings, so the toast added no route the reader did not
   have — it only added a floating panel across the bottom of whatever they
   were doing, and being once-per-device is no comfort when the once lands on
   the screen you are trying to read. A standing place to do a thing beats an
   interruption telling you to go do it. Backup lives in Settings; the app does
   not chase you about it. (Owner's call, and it overrides 09.)

   Workbench routes get no dock: it is fixed and centred, so it paints its
   toast straight across the middle of whatever is being judged — chrome
   belonging to the app, sitting on top of the thing under the lamp. The
   journal is out for the same reason and one worse: a toast that arrives while
   the print dialog is opening ends up ON the paper.

   A component rather than a condition in App's body, because the pathname test
   needs a hook and App is what renders the router. Same shape as Shell above,
   for the same reason. */
function Dock() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/lab/") || pathname.startsWith("/journal"))
    return null;

  return (
    <div className={toast.dock}>
      <UpdateToast />
      <InstallPrompt />
    </div>
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
  // A sentence somebody typed on their first run, waiting for a book to hang
  // on. It is NOT the search term above — that one gets typed into Open
  // Library, and this one is theirs. See startWriting in routes/home/Draw.tsx
  // for why a keep cannot exist without a book in the first place.
  const [firstKeep, setFirstKeep] = useState("");

  useEffect(() => {
    function find(event: Event) {
      setSeed((event as CustomEvent<string>).detail ?? "");
      setAdding(true);
    }
    function first(event: Event) {
      setFirstKeep((event as CustomEvent<string>).detail ?? "");
    }
    window.addEventListener("flyleaf-find-book", find);
    window.addEventListener("flyleaf-first-keep", first);
    return () => {
      window.removeEventListener("flyleaf-find-book", find);
      window.removeEventListener("flyleaf-first-keep", first);
    };
  }, []);

  return (
    <BrowserRouter>
      {/* Behind every page, before anything: the faint flowers in the sky.
          Fixed and z-indexed under the routes, so no page has to know. */}
      <FlowerField />
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
        <Route path="/legal/:slug" element={<Legal />} />
        <Route path="/journal" element={<Journal />} />
        {__PREVIEW_SEED__ && (
          <>
            <Route path="/styleguide" element={<Styleguide />} />
            <Route path="/lab/cards" element={<CardLab />} />
          </>
        )}
        {/* Last, and it matches everything left over. Without it a mistyped or
            truncated address rendered the chrome over an empty page, which
            looks exactly like an app that has broken rather than an address
            that does not exist. */}
        <Route path="*" element={<Lost />} />
      </Routes>

      <Shell onAdd={() => setAdding(true)} />
      {/* One instance, opened by an event: the Settings row asks for it, and
          so does the invitation when the browser has no install route to
          offer. Neither of them is on screen at the same time as the other. */}
      <InstallGuide />
      <AddBookSheet
        open={adding}
        seed={seed}
        firstKeep={firstKeep}
        onClose={() => {
          setAdding(false);
          setSeed("");
          // Cleared on the way out, whether the book was added or the sheet
          // was abandoned — the next book somebody shelves must not silently
          // inherit a line they wrote weeks ago. Nothing is lost by backing
          // out: the first-run card is still behind the sheet with the words
          // still in its box, so pressing Keep again sends them down here
          // again.
          setFirstKeep("");
        }}
      />

      <Dock />
    </BrowserRouter>
  );
}

export default App;
