import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import GlassSurface from './GlassSurface'
import LeafButton from './LeafButton'
import db from '../data/db'
import { isLockSet } from '../data/lock'
import { claim, markDismissed, markDone } from '../data/nudges'
import styles from './Toast.module.css'

/* How a reader finds out there is a lock at all.

   A lock nobody knows about protects nobody, and Settings is where features go
   to be missed. This is the one mention — after which it is Settings' job
   forever, and after three refusals it is Settings' job whether the reader has
   found it or not.

   LAST IN THE LADDER, AND BY SOME DISTANCE. Thirty entries, and only once the
   sign-in question has been settled one way or the other. A code is the only
   one of the three offers that makes the app slightly harder to open, so it is
   the one that has to be most clearly worth it — and it is worth it exactly
   when there is enough in the journal that a reader would mind somebody else
   scrolling through it. Asking on day two, of a journal with four lines in it,
   would just look like an app that thinks it is more important than it is.

   The button opens Settings with the lock row already unfolded rather than
   setting a code from a toast. Choosing a code is a two-field, type-it-twice
   decision; a floating panel is the wrong place to make it, and the row that
   explains what a forgotten code costs is right there. */

const ENOUGH = 30

function LockNudge() {
  const [live, setLive] = useState(false)
  const [gone, setGone] = useState(false)
  const memories = useLiveQuery(() => db.entries.count(), [], 0)
  const go = useNavigate()

  /* A reader who found the lock on their own has answered the question. */
  useEffect(() => {
    if (isLockSet()) markDone('lock')
    const seen = () => {
      if (isLockSet()) markDone('lock')
    }
    window.addEventListener('flyleaf-lock', seen)
    return () => window.removeEventListener('flyleaf-lock', seen)
  }, [])

  const earned = !isLockSet() && memories >= ENOUGH

  useEffect(() => {
    if (earned && !gone) setLive(claim('lock', true))
  }, [earned, gone])

  if (gone || !live) return null

  return (
    <div className={styles.toast} role="status">
      <GlassSurface>
        <div className={styles.body}>
          <p className={styles.message}>
            You can put a code on this journal, so it opens for you and nobody
            else who picks up your phone.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.quiet}
              onClick={() => {
                markDismissed('lock')
                setGone(true)
              }}
            >
              Not now
            </button>
            <LeafButton
              className={styles.compact}
              onClick={() => {
                markDone('lock')
                setGone(true)
                go('/settings?open=lock')
              }}
            >
              Set a code
            </LeafButton>
          </div>
        </div>
      </GlassSurface>
    </div>
  )
}

export default LockNudge
