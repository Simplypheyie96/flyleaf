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

  useEffect(() => {
    const hide = () => setGone(true)
    window.addEventListener('appinstalled', hide)
    return () => window.removeEventListener('appinstalled', hide)
  }, [])

  if (gone || !shelved) return null

  // Safari of any kind will never fire the install event; everywhere else, no
  // event means the browser has not decided yet — and inviting a reader to
  // install with nothing behind the button is a dead end.
  const manual = ['iphone', 'ipad', 'safari-mac'].includes(detect())
  if (!offered && !manual) return null

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setGone(true)
  }

  async function act() {
    if (offered) {
      if (await install()) setGone(true)
      return
    }
    openInstallGuide()
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
