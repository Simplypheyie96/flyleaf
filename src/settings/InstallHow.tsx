import { useEffect, useState, useSyncExternalStore } from 'react'
import Fold from './Fold'
import { canInstall, install, watchInstallable } from './installable'
import { DEVICES, GUIDES, detect, installed } from './platform'
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

   One row per device, each opening to three lines. Not a picker showing one
   device at a time: a picker only ever answers for the device we guessed, and
   we guess some wrongly. Named rows say plainly that the iPad in the next room
   is covered. The one we think this is says so on its row and opens on
   arrival. */

/** What installing does: the app comes down out of the browser and stays. */
function DownIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3v11" />
      <path d="M8 10.5 12 14.5l4-4" />
      <path d="M4 16v3.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V16" />
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
      {/* The lead row says what installing is for, and when the browser has
          actually offered a one-tap install it is also the button. Nobody taps
          a row of device names until they know what is on the other side. */}
      {lead && (
        <div className={styles.lead}>
          <span className={styles.mark} aria-hidden="true">
            <DownIcon />
          </span>
          <span className={styles.leadBody}>
            <span className={styles.leadTitle}>
              {here ? 'Flyleaf is on this device' : 'Add to your home screen'}
            </span>
            <span className={styles.leadHint}>Its own icon, full screen, offline.</span>
          </span>
          {offered && !here && (
            <button type="button" className={styles.go} onClick={() => void install()}>
              Install
            </button>
          )}
        </div>
      )}

      {DEVICES.map((each) => (
        <Fold
          key={each}
          title={GUIDES[each].label}
          meta={each === mine ? 'this device' : undefined}
          start={each === mine && !here}
        >
          <ol className={styles.steps}>
            {GUIDES[each].steps.map((step, at) => (
              <li key={step} className={styles.step}>
                <span className={styles.count} aria-hidden="true">
                  {at + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </Fold>
      ))}
    </>
  )
}

export default InstallHow
