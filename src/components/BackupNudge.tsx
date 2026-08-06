import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GlassSurface from './GlassSurface'
import LeafButton from './LeafButton'
import db from '../data/db'
import { lastExport } from '../data/backup'
import styles from './Toast.module.css'

const DISMISS_KEY = 'flyleaf-backup-nudged'

/* The one time the app mentions that local-first has a cost.

   09 asks for a gentle, dismissible prompt once the reader has invested a
   little — not on first paint, when there is nothing to lose and the warning
   is just noise. Six keeps is the threshold: enough that losing them would
   sting, early enough to still be a small file.

   It never comes back. Dismissal is remembered, and a reader who exports
   never sees it at all, because `lastExport` is the same fact the settings
   card reads. Nagging is what the brief rules out, and a prompt that returns
   is a nag whatever its wording. */
const ENOUGH = 6

function BackupNudge() {
  const [show, setShow] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let live = true
    // A count, not a read: this runs on every cold boot and must not touch
    // the recordings.
    void (async () => {
      if (localStorage.getItem(DISMISS_KEY) || lastExport()) return
      const kept = await db.entries.count()
      if (live && kept >= ENOUGH) setShow(true)
    })()
    return () => {
      live = false
    }
  }, [])

  if (!show) return null

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* Then it may return once. Better than failing to render. */
    }
    setShow(false)
  }

  return (
    <div className={styles.toast} role="status">
      <GlassSurface>
        <div className={styles.body}>
          <p className={styles.message}>
            Your memories live on this device. Save a copy so they survive it.
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.quiet} onClick={dismiss}>
              Not now
            </button>
            <LeafButton
              className={styles.compact}
              onClick={() => {
                dismiss()
                navigate('/settings')
              }}
            >
              Save a copy
            </LeafButton>
          </div>
        </div>
      </GlassSurface>
    </div>
  )
}

export default BackupNudge
