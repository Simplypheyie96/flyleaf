import { useEffect, useState, useSyncExternalStore } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import GlassSurface from './GlassSurface'
import LeafButton from './LeafButton'
import db from '../data/db'
import {
  canInstall,
  install,
  openInstallGuide,
  watchInstallable,
} from '../settings/installable'
import { detect, installed } from '../settings/platform'
import { claim, markDismissed, markDone } from '../data/nudges'
import styles from './Toast.module.css'

const DISMISS_KEY = 'flyleaf-install-dismissed'

/* A gentle, dismissible invitation to keep Flyleaf on the home screen.

   Held back until there is a book on the shelf. An install offer on first
   paint asks a reader to commit their home screen to something they have not
   used yet, which is how an invitation becomes a nag; after the first book
   there is something on the other side of the icon.

   Shown on Safari too, where there is no install event to wait for. That is
   the case that matters most — an iPhone gets no prompt from anyone, ever —
   so the button there opens the guide instead of installing, and the copy
   promises help rather than a result. */
function InstallPrompt() {
  const [gone, setGone] = useState(
    () => installed() || localStorage.getItem(DISMISS_KEY) !== null,
  )
  const offered = useSyncExternalStore(watchInstallable, canInstall, () => false)
  const shelved = useLiveQuery(() => db.books.count(), [], 0)

  const [live, setLive] = useState(false)

  useEffect(() => {
    const hide = () => {
      markDone('install')
      setGone(true)
    }
    window.addEventListener('appinstalled', hide)
    return () => window.removeEventListener('appinstalled', hide)
  }, [])

  // Safari of any kind will never fire the install event; everywhere else, no
  // event means the browser has not decided yet — and inviting a reader to
  // install with nothing behind the button is a dead end.
  const manual = ['iphone', 'ipad', 'safari-mac'].includes(detect())
  const earned = !gone && shelved > 0 && (offered || manual)

  /* This invite predates the scheduler and kept its own permanent dismissal
     key — a reader who says no to their home screen once has said no. What it
     gained is the shared floor: it may now be the thing that speaks this
     launch, which is what stops it landing on top of the sync offer. */
  useEffect(() => {
    if (earned) setLive(claim('install', true))
  }, [earned])

  if (gone || !live) return null

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    markDismissed('install')
    setGone(true)
  }

  async function act() {
    if (offered) {
      if (await install()) {
        markDone('install')
        setGone(true)
      }
      return
    }
    openInstallGuide()
    markDone('install')
    setGone(true)
  }

  return (
    <div className={styles.toast} role="status">
      <GlassSurface>
        <div className={styles.body}>
          <p className={styles.message}>
            Keep Flyleaf close — add it to your home screen?
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.quiet} onClick={dismiss}>
              Not now
            </button>
            <LeafButton className={styles.compact} onClick={() => void act()}>
              {offered ? 'Install' : 'Show me how'}
            </LeafButton>
          </div>
        </div>
      </GlassSurface>
    </div>
  )
}

export default InstallPrompt
