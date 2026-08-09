import { useEffect, useState } from 'react'
import GlassSurface from './GlassSurface'
import LeafButton from './LeafButton'
import { type Arrival, bringArrivalIn, leaveArrival, pendingArrival } from '../data/sync'
import styles from './Toast.module.css'

/* "The last device i was on made changes. Do i want to sync to match that
   device, or leave as it is?"

   THIS IS NOT A NUDGE and does not answer to data/nudges. A nudge is an offer
   the reader may never see again; this is a question the app cannot proceed
   past. While it is on screen nothing syncs in either direction — not down,
   because she has not said she wants the other device's afternoon, and not up
   either, because pushing would write that afternoon out of Drive before she
   ever saw it. See the arrival check in data/sync.

   It names the device and the hour rather than "Drive", because a reader can
   answer "your iPhone, three hours ago" from memory and cannot answer anything
   at all about a hidden file in an app folder. */

function when(at: number) {
  const mins = Math.max(0, Math.round((Date.now() - at) / 60_000))
  if (mins < 2) return 'a moment ago'
  if (mins < 60) return `${mins} minutes ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hours ago`
  const days = Math.round(hours / 24)
  return days < 2 ? 'yesterday' : `${days} days ago`
}

function SyncArrival() {
  const [ask, setAsk] = useState<Arrival | null>(pendingArrival)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const listen = () => setAsk(pendingArrival())
    window.addEventListener('flyleaf-sync-ask', listen)
    return () => window.removeEventListener('flyleaf-sync-ask', listen)
  }, [])

  if (!ask) return null

  const where = ask.device || 'your other device'

  async function bring() {
    setBusy(true)
    setFailed(false)
    try {
      await bringArrivalIn()
    } catch {
      /* The answer stands even when the round trip fails — she said yes, and
         the automatic triggers will carry it out as soon as there is signal.
         Saying so is better than leaving the question up as though she had
         never answered it. */
      setFailed(true)
    } finally {
      setBusy(false)
      setAsk(pendingArrival())
    }
  }

  function leave() {
    leaveArrival()
    setAsk(null)
  }

  return (
    <div className={styles.toast} role="status">
      <GlassSurface>
        <div className={styles.body}>
          <p className={styles.message}>
            {failed
              ? 'Saved as your answer. Flyleaf will bring them together as soon as it can reach Drive.'
              : `You wrote something on ${where} ${when(ask.at)}. Bring it in, or leave this device as it is?`}
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.quiet} onClick={leave}>
              {failed ? 'Close' : 'Leave this device'}
            </button>
            {!failed && (
              <LeafButton
                className={styles.compact}
                disabled={busy}
                onClick={() => void bring()}
              >
                {busy ? 'Bringing in…' : 'Bring it in'}
              </LeafButton>
            )}
          </div>
        </div>
      </GlassSurface>
    </div>
  )
}

export default SyncArrival
