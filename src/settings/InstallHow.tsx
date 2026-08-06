import { useEffect, useState, useSyncExternalStore } from 'react'
import LeafButton from '../components/LeafButton'
import Fold from './Fold'
import { canInstall, install, watchInstallable } from './installable'
import { DEVICES, GUIDES, detect, installed } from './platform'
import type { Glyph } from './platform'
import styles from './install.module.css'

/* How to keep Flyleaf on a device — the instructions themselves, with no
   opinion about where they are being read.

   They are read in two places: in Settings, where a reader went looking, and
   in a sheet raised by the invitation that appears once they have a book on
   the shelf. Both want exactly this, so it lives here rather than being typed
   out twice and drifting apart at the first correction.

   The whole reason it exists is the case with no button in it. Android and the
   Chromium desktops can install in a tap; iPhone and iPad cannot be offered
   anything at all by a web page, and a reader who is never told about Share →
   Add to Home Screen simply never installs.

   One row per device, each opening to its own steps. Not a picker showing one
   device at a time: a picker only ever answers for the device we guessed, and
   we guess some wrongly. Named rows say plainly that the iPad in the next room
   is covered, and a phone handed across a room finds its own line. The one we
   think this is says so on its row and opens on arrival. */

export function Glyphs({ name }: { name: Glyph | 'down' }) {
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

  if (name === 'down') {
    // What installing does: the app comes down out of the browser and stays.
    return (
      <svg {...common}>
        <path d="M12 3v11" />
        <path d="M8 10.5 12 14.5l4-4" />
        <path d="M4 16v3.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V16" />
      </svg>
    )
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

/** Whether Flyleaf is already on this device, kept current rather than read
    once — a reader can install while these instructions are on screen, and on
    Android the browser's own dialog appears right on top of them. */
export function useInstalled() {
  const [here, setHere] = useState(installed)

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

  return here
}

/** `lead` off for the sheet, which says the same thing in its own title and
    would otherwise say it twice, two lines apart. */
function InstallHow({ lead = true }: { lead?: boolean }) {
  const offered = useSyncExternalStore(watchInstallable, canInstall, () => false)
  const here = useInstalled()
  // The guess, made once rather than on every render.
  const [mine] = useState(detect)

  return (
    <>
      {/* The lead row says what installing is for. Nobody taps a row of device
          names until they know what is on the other side of it. */}
      {lead && (
      <div className={styles.lead}>
        <span className={styles.mark} aria-hidden="true">
          <Glyphs name="down" />
        </span>
        <span className={styles.leadBody}>
          <span className={styles.leadTitle}>
            {here ? 'Flyleaf is on this device' : 'Add to your home screen'}
          </span>
          <span className={styles.leadHint}>
            {here
              ? 'Here is how to do it on your other devices.'
              : 'Its own icon, full screen, works offline.'}
          </span>
        </span>
      </div>
      )}

      {/* The one-tap route, when the browser has actually offered one. Its own
          row above the device list, because on Android and the Chromium
          desktops it makes every row below it unnecessary. */}
      {offered && !here && (
        <div className={styles.actRow}>
          <LeafButton onClick={() => void install()}>Install Flyleaf</LeafButton>
        </div>
      )}

      {DEVICES.map((each) => {
        const guide = GUIDES[each]
        return (
          <Fold
            key={each}
            title={guide.label}
            meta={each === mine ? 'this device' : undefined}
            start={each === mine && !here}
          >
            <p className={styles.lede}>{guide.lede}</p>
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
          </Fold>
        )
      })}

      {/* The thing a reader is actually worried about before they commit an app
          to their home screen. */}
      <p className={styles.fine}>
        Everything stays on this device either way — installing only takes the
        browser away from around it. An installed Flyleaf still updates itself,
        and nothing you have written is ever cleared by an update.
      </p>
    </>
  )
}

export default InstallHow
