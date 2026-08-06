import { useEffect, useState, useSyncExternalStore } from 'react'
import Sheet from '../components/Sheet'
import LeafButton from '../components/LeafButton'
import { CloseIcon } from '../components/TabIcons'
import { canInstall, install, onInstallGuide, watchInstallable } from './installable'
import { DEVICES, GUIDES, detect, installed } from './platform'
import type { Device, Glyph } from './platform'
import styles from './install.module.css'

/* How to keep Flyleaf on this device — and, if the reader asks, on any other.

   The whole reason this exists is that the most important case is the one
   with no button in it. Android and the Chromium desktops can install in a
   tap; iPhone and iPad cannot be offered anything at all by a web page, and a
   reader who is never told about Share → Add to Home Screen simply never
   installs. So the guessed device leads, its steps are already open, and the
   other devices are one tap away rather than a wall of six columns.

   The guess is never trusted further than it deserves: every device is a chip
   at the top, so a reader on a browser we read wrongly is one tap from the
   right instructions instead of stuck with the wrong ones. */

function Glyphs({ name }: { name: Glyph }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: 'false' as const,
  }

  if (name === 'share') {
    // iOS share: a box with something leaving the top of it.
    return (
      <svg {...common}>
        <path d="M12 15V3" />
        <path d="M8.5 6.5 12 3l3.5 3.5" />
        <path d="M7 10H5.5A1.5 1.5 0 0 0 4 11.5v8A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 18.5 10H17" />
      </svg>
    )
  }
  if (name === 'add') {
    return (
      <svg {...common}>
        <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    )
  }
  if (name === 'menu') {
    return (
      <svg {...common}>
        <circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  // A window of its own — what installing actually gets you.
  return (
    <svg {...common}>
      <rect x="3" y="4.5" width="18" height="15" rx="3" />
      <path d="M3 9h18" />
      <path d="M7 6.75h.01M9.5 6.75h.01" />
    </svg>
  )
}

function InstallGuide() {
  const [open, setOpen] = useState(false)
  // The guess, made once per opening rather than once per render.
  const [device, setDevice] = useState<Device>(detect)
  const offered = useSyncExternalStore(watchInstallable, canInstall, () => false)
  const [here, setHere] = useState(installed)

  useEffect(() => onInstallGuide(() => setOpen(true)), [])

  /* A reader can install while the sheet is open — on Android the browser's
     own dialog appears over it — so the "already installed" line has to be
     able to arrive rather than only being read at mount. */
  useEffect(() => {
    const check = () => setHere(installed())
    const media = window.matchMedia('(display-mode: standalone)')
    media.addEventListener('change', check)
    window.addEventListener('appinstalled', check)
    return () => {
      media.removeEventListener('change', check)
      window.removeEventListener('appinstalled', check)
    }
  }, [])

  const guide = GUIDES[device]
  const mine = device === detect()

  return (
    <Sheet
      open={open}
      onClose={() => setOpen(false)}
      label="How to install Flyleaf"
      name="install-guide"
    >
      <div className={styles.guide}>
        <header className={styles.head}>
          <div className={styles.headLine}>
            <h2 className={styles.title}>Keep Flyleaf on your device</h2>
            {/* The same disc every other sheet closes with. Dragging the sheet
                away is a thumb's route out, not a keyboard's. */}
            <button
              type="button"
              className={styles.close}
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <CloseIcon size={20} />
            </button>
          </div>
          <p className={styles.lede}>
            {here && mine
              ? 'Flyleaf is already installed here — this is how it is done on your other devices.'
              : guide.lede}
          </p>
        </header>

        {/* The one-tap route, when the browser has actually offered one. It
            sits above the steps rather than inside them: on Android and the
            Chromium desktops it makes the three steps below unnecessary, and
            burying it as step one would hide that. */}
        {offered && mine && !here && (
          <LeafButton className={styles.act} onClick={() => void install()}>
            Install Flyleaf
          </LeafButton>
        )}

        <div
          className={styles.devices}
          role="group"
          aria-label="Choose a device"
        >
          {DEVICES.map((each) => (
            <button
              key={each}
              type="button"
              className={styles.device}
              aria-pressed={each === device}
              onClick={() => setDevice(each)}
            >
              {GUIDES[each].label}
            </button>
          ))}
        </div>

        <ol className={styles.steps}>
          {guide.steps.map((step, at) => (
            <li key={step.text} className={styles.step}>
              <span className={styles.stepMark} aria-hidden="true">
                <Glyphs name={step.glyph} />
              </span>
              <span className={styles.stepBody}>
                <span className={styles.stepCount}>Step {at + 1}</span>
                <span className={styles.stepText}>{step.text}</span>
              </span>
            </li>
          ))}
        </ol>

        {/* The two things a reader is actually worried about before they
            commit an app to their home screen. */}
        <p className={styles.fine}>
          An installed Flyleaf keeps updating itself — when a new version lands
          you get the same gentle “tap to refresh”, and nothing you have written
          is ever cleared by an update. Everything stays on this device either
          way; installing only takes the browser away from around it.
        </p>
      </div>
    </Sheet>
  )
}

export default InstallGuide
