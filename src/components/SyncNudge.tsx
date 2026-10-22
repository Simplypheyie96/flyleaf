import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import GlassSurface from './GlassSurface'
import GoogleButton from './GoogleButton'
import db from '../data/db'
import { SYNC_AVAILABLE, optedIn } from '../data/cloud'
import { hasUnsharedWork, otherJourney, pauseAutoSync, syncNow } from '../data/sync'
import { claim, markDismissed, markDone } from '../data/nudges'
import styles from './Toast.module.css'

/* The one time Flyleaf mentions signing in without being asked.

   SIGNING IN IS NOT HOW THE APP WORKS, it is a thing the app can do. A reader
   can shelve books, write in them for years and never see this — and if they
   dismiss it three times they never see it again. Nothing behind it is gated:
   the same offer sits permanently in Settings, which is why this can afford to
   be so easily got rid of.

   TWELVE MEMORIES IS THE TRIGGER, and the number is the argument. Before a
   reader has written anything, sync is a login wall dressed up as a feature —
   it protects nothing and costs them their name and an account. After a
   dozen entries there is something on this device that a dropped phone would
   actually take away, and the offer is finally about their words rather than
   about us. The scheduler in data/nudges then decides whether TODAY is a
   reasonable day to say so.

   It signs in from here rather than sending the reader to Settings, because
   the whole point of a one-line offer is that it is one tap. If Google refuses
   or the reader closes the sheet, the notice says so and points at Settings —
   it does not silently vanish having done nothing. */

const ENOUGH = 12

function SyncNudge() {
  const [live, setLive] = useState(false)
  const [gone, setGone] = useState(false)
  const [failed, setFailed] = useState(false)
  /* Signed in, and a journey from another device was found waiting. Nothing has
     been merged; Settings holds the question. */
  const [meeting, setMeeting] = useState('')
  const memories = useLiveQuery(() => db.entries.count(), [], 0)

  /* Already syncing means the question is answered, however it was answered —
     including from Settings, without this ever having appeared. */
  useEffect(() => {
    if (optedIn()) markDone('sync')
  }, [])

  const earned = SYNC_AVAILABLE && !optedIn() && memories >= ENOUGH

  /* Asking for the floor happens here rather than during render, so the three
     notices ask in mount order instead of all three deciding at once. */
  useEffect(() => {
    if (earned && !gone) setLive(claim('sync', true))
  }, [earned, gone])

  if (gone || !live) return null

  function dismiss() {
    markDismissed('sync')
    setGone(true)
  }

  /* Google's button has already signed the reader in by the time this runs. */
  async function connected() {
    setFailed(false)
    try {
      /* Two conditions, and the second one is the whole point: the account
         already holds a journey from another device AND this device is carrying
         work the account has never been shown. Only then did two journeys genuinely
         diverge, and only then is there anything to ask about. If the account has
         a copy and this device has nothing unshared, merging IS the answer and
         the reader should never see the question — see the note on
         OFFLINE_KEY in data/sync.ts. The question does not fit in a toast, so
         when it is warranted the toast hands over to settings/Sync.tsx. */
      const other = await otherJourney()
      if (other && (await hasUnsharedWork())) {
        pauseAutoSync()
        setMeeting(other.device || 'another device')
        return
      }
      await syncNow()
      markDone('sync')
      setGone(true)
    } catch {
      setFailed(true)
    }
  }

  return (
    <div className={styles.toast} role="status">
      <GlassSurface>
        <div className={styles.body}>
          <p className={styles.message}>
            {meeting
              ? `Signed in. Your account already holds a journey, last changed on your ${meeting}. Nothing has been merged yet; Settings will ask you first.`
              : failed
                ? 'That did not connect. You can try again from Settings whenever you like.'
                : 'Your journal lives on this phone only. Sign in once and it waits for you on your other devices too, kept up to date by itself.'}
          </p>
          {!failed && !meeting && (
            <GoogleButton onDone={() => void connected()} onError={() => setFailed(true)} />
          )}
          <div className={styles.actions}>
            <button type="button" className={styles.quiet} onClick={dismiss}>
              {failed || meeting ? 'Close' : 'Not now'}
            </button>
          </div>
        </div>
      </GlassSurface>
    </div>
  )
}

export default SyncNudge
