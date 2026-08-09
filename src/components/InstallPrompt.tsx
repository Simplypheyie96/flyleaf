import { useEffect, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { lastExport } from '../data/backup'
import { hasMet } from '../data/reader'
import { claim, markDismissed, markDone } from '../data/nudges'
import styles from './Toast.module.css'

const DISMISS_KEY = 'flyleaf-install-dismissed'
const EARLY_KEY = 'flyleaf-install-asked-early'
const CARRY_KEY = 'flyleaf-install-carry-warned'

/* A dismissible invitation to keep Flyleaf on the home screen — and, on Apple
   devices, the warning that has to come with it.

   THE APPLE PROBLEM. On iPhone and iPad, Safari and the home-screen app get
   separate storage. Nothing written in the Safari tab is visible to the
   installed app: it opens on an empty journal and asks the reader to start
   again. There is no API to merge the two, so the only bridge is the export
   file in Settings — which means the app's whole job here is timing.

   So this notice has two shapes on Apple:

   EARLY — before the first book. Asking someone to install a thing they have
   not used is normally a nag, and everywhere else it still is. Here it is the
   one moment the split costs nothing, so it is the moment to ask.

   CARRY — once there are books and no export has ever been made. If they said
   no early, or arrived with a shelf already full, they must not tap Add to
   Home Screen without being told what it does. This one is a data warning
   rather than an invitation, so it does not go through the nudge scheduler's
   five-day quiet — it would arrive days after the install it was meant to
   precede. It is shown once, ever, and never after an export exists.

   Everywhere else the old behaviour stands: wait for a book, then offer. */
type Stage = 'early' | 'carry' | 'plain'

function InstallPrompt() {
  const navigate = useNavigate()
  const [gone, setGone] = useState(installed)
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
  const said = localStorage.getItem(DISMISS_KEY) !== null

  let stage: Stage | null = null
  if (!gone) {
    if (manual && shelved > 0) {
      if (localStorage.getItem(CARRY_KEY) === null && lastExport() === null) stage = 'carry'
      else if (!said) stage = 'plain'
    } else if (manual && hasMet() && localStorage.getItem(EARLY_KEY) === null) stage = 'early'
    else if (!manual && shelved > 0 && offered && !said) stage = 'plain'
  }

  /* Only the ordinary invitation answers to the nudge scheduler — it is an
     offer, and offers can wait five days or be given up on. The two Apple
     notices are neither: one is the only moment the storage split is free to
     avoid, the other is a warning about losing work. Both would have been
     silenced on any device that had already met the old invitation, which is
     every device that has been using Flyleaf. So they keep their own one-time
     keys and speak once regardless. */
  useEffect(() => {
    if (!stage) setLive(false)
    else if (stage === 'plain') setLive(claim('install', true))
    else setLive(true)
  }, [stage])

  if (!stage || !live) return null

  /** Whichever notice this was, it has now been answered and does not come
      back — a no is a no, and a yes has nowhere left to go. */
  function settle() {
    if (stage === 'carry') localStorage.setItem(CARRY_KEY, '1')
    else if (stage === 'early') localStorage.setItem(EARLY_KEY, '1')
    else localStorage.setItem(DISMISS_KEY, '1')
    setGone(true)
  }

  function dismiss() {
    if (stage === 'plain') markDismissed('install')
    settle()
  }

  async function act() {
    if (stage === 'carry') {
      settle()
      navigate('/settings')
      return
    }
    if (offered) {
      if (await install()) {
        markDone('install')
        settle()
      }
      return
    }
    openInstallGuide()
    markDone('install')
    settle()
  }

  const message =
    stage === 'carry'
      ? 'Adding Flyleaf to your home screen starts a separate, empty journal. Save a copy of this one first, then bring it over.'
      : stage === 'early'
        ? 'Add Flyleaf to your home screen first. The home-screen app keeps its own journal, so anything you write in Safari now stays in Safari.'
        : 'Keep Flyleaf close — add it to your home screen?'

  const go = stage === 'carry' ? 'Save a copy' : offered ? 'Install' : 'Show me how'

  return (
    <div className={styles.toast} role="status">
      <GlassSurface>
        <div className={styles.body}>
          <p className={styles.message}>{message}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.quiet} onClick={dismiss}>
              Not now
            </button>
            <LeafButton className={styles.compact} onClick={() => void act()}>
              {go}
            </LeafButton>
          </div>
        </div>
      </GlassSurface>
    </div>
  )
}

export default InstallPrompt
