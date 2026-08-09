import { useEffect, useState } from 'react'
import { Row } from './Group'
import { SYNC_AVAILABLE, account, needsSignIn, optedIn, signIn, signOut, tokenHeld, warmUp } from '../data/google'
import {
  autoSyncPaused,
  hasLocalJourney,
  lastSync,
  otherJourney,
  pauseAutoSync,
  resumeAutoSync,
  syncNow,
} from '../data/sync'
import styles from './settings.module.css'

/* Sync, offered — never imposed.

   This row is the permanent home of the sign-in story, and where it sits is
   the design. It is IN Settings, under a label that says "optional" before it
   says anything else. Nothing is gated behind it, no screen interrupts to
   demand it, and a reader can use Flyleaf for years and never touch it — an
   app that asks who you are before it will hold your reading has already
   broken the promise this one is built on.

   THERE IS NOW EXACTLY ONE PLACE THAT MENTIONS IT UNASKED, and this comment
   used to say there were none. components/SyncNudge.tsx offers it once, after
   a dozen memories are on the device, and never again after three refusals —
   because a reader who has written a dozen entries has something a dropped
   phone would really take away, and never being told is its own kind of
   failure. That is the whole of the change: it is still not first run, still
   not a wall, still nothing you must answer. See data/nudges.ts for the rules
   that keep it to once.

   What it says, it says plainly. Not "back up to the cloud", which sounds like
   our cloud: the journey goes into the reader's OWN Google Drive, into a hidden
   folder no other app can open, and we never hold a copy. That sentence used to
   live in a footnote under the card; footnotes are gone (see Group.tsx), so it
   is now inside this row's fold, where the reader who pressed to find out how
   syncing works is the one who meets it. The row's own line stays one line.

   Signing out leaves the Drive copy alone, deliberately. Ending sync on one
   device must not reach across and delete the reader's journey from their own
   Drive; that is theirs to remove, in Drive, whenever they like. */

function Cloud() {
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
      <path d="M7 18a4 4 0 0 1-.3-8A5.5 5.5 0 0 1 17.4 11 3.5 3.5 0 0 1 17 18Z" />
    </svg>
  )
}

function when(at: number) {
  const mins = Math.floor((Date.now() - at) / 60_000)
  if (mins < 2) return 'Just now'
  if (mins < 60) return `${mins} minutes ago`
  const days = Math.floor(mins / 1440)
  if (days < 1) return `${Math.floor(mins / 60)} hours ago`
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

type Note = { tone: 'good' | 'bad'; text: string } | null

function SyncCard() {
  const [on, setOn] = useState(optedIn)
  const [at, setAt] = useState(lastSync)
  const [busy, setBusy] = useState<'in' | 'now' | 'out' | null>(null)
  const [note, setNote] = useState<Note>(null)
  const [open, setOpen] = useState(false)
  const [who, setWho] = useState(account)
  const [stale, setStale] = useState(needsSignIn)
  /* Set when this device and the Drive both already hold a journey and the
     reader has not yet said what to do about it — and it holds WHERE and WHEN
     the other one was last written, because that is the fact the question
     turns on. See sync.ts/otherJourney. */
  const [ask, setAsk] = useState<{ device: string; at: number } | null>(null)

  /* Opened with the question already outstanding — the nudge signed in, found
     another device's journey, paused and pointed here. Unfold so it is not
     hidden behind a row nobody knew to press. */
  useEffect(() => {
    if (!autoSyncPaused()) return
    setOpen(true)
    /* The nudge found the other journey and paused; it did not carry the
       details over, so they are read again here. One metadata call. */
    void otherJourney().then((other) => other && setAsk(other))
  }, [])

  /* Both `google.ts` and `sync.ts` fire this, so a sync that ran by itself in
     the background updates the date under the reader's eyes rather than
     leaving a stale one until the next reload. */
  useEffect(() => {
    const refresh = () => {
      setOn(optedIn())
      setAt(lastSync())
      setWho(account())
      setStale(needsSignIn())
    }
    window.addEventListener('flyleaf-sync', refresh)
    return () => window.removeEventListener('flyleaf-sync', refresh)
  }, [])

  /* Google's script, fetched now rather than during the press — see warmUp. */
  useEffect(warmUp, [])

  /* No client ID built in means no working sign-in, so the row does not exist.
     Same rule as the tip jar: never offer a button that opens onto an error. */
  if (!SYNC_AVAILABLE) return null

  async function connect() {
    setBusy('in')
    setNote(null)
    try {
      await signIn()
      setOn(true)

      /* THE ONE QUESTION WORTH ASKING. Two journeys meeting for the first time
         is the only moment where syncing changes what is on this screen without
         the reader having written any of it — so it is the only moment that
         stops and asks. The pause is held until they answer, or the write hooks
         would merge it underneath the question. */
      pauseAutoSync()
      const other = await otherJourney()
      if (other && (await hasLocalJourney())) {
        setAsk(other)
        setBusy(null)
        return
      }
      resumeAutoSync()

      const { gained } = await syncNow()
      setAt(lastSync())
      setNote({
        tone: 'good',
        text: gained
          ? `Synced. ${gained} ${gained === 1 ? 'memory' : 'memories'} came back from your other device.`
          : 'Synced. Your journey is now in your own Google Drive.',
      })
    } catch (error) {
      resumeAutoSync()
      setOn(optedIn())
      setNote({ tone: 'bad', text: error instanceof Error ? error.message : 'That did not connect.' })
    } finally {
      setBusy(null)
    }
  }

  /* Yes. Nothing here is a choice between the two journeys, because there is no
     version of this that loses anything: what goes up is the union of both
     sides, and both devices end up holding it. */
  async function bringTogether() {
    setBusy('in')
    setAsk(null)
    resumeAutoSync()
    try {
      const { gained } = await syncNow()
      setAt(lastSync())
      setNote({
        tone: 'good',
        text: gained
          ? `Brought together. ${gained} ${gained === 1 ? 'memory' : 'memories'} came over from your other device.`
          : 'Brought together. Your journey is now in your own Google Drive.',
      })
    } catch (error) {
      setNote({ tone: 'bad', text: error instanceof Error ? error.message : 'That did not sync.' })
    } finally {
      setBusy(null)
    }
  }

  /* The owner asked for this one by name: "request if it wants to merge or
     keep the current data". What is on this device goes up and takes the other
     copy's place — the one deliberate way to end up with less than you started
     with, so it says so in the button and again in the note underneath.

     It is not a delete of the other device: that phone still has every word it
     had a minute ago. It is this journey becoming the one they all sync to. */
  async function keepThisDevice() {
    setBusy('in')
    setAsk(null)
    resumeAutoSync()
    try {
      await syncNow('keep')
      setAt(lastSync())
      setNote({
        tone: 'good',
        text: 'Kept. Your other devices will match this one the next time they sync.',
      })
    } catch (error) {
      setNote({ tone: 'bad', text: error instanceof Error ? error.message : 'That did not sync.' })
    } finally {
      setBusy(null)
    }
  }

  /* No. Signing back out is the honest undo: leaving this device signed in but
     never syncing would be a switch that says On and does nothing. */
  async function leaveThemApart() {
    setAsk(null)
    setBusy('out')
    await signOut()
    resumeAutoSync()
    setOn(false)
    setNote({
      tone: 'good',
      text: 'Left as they are. This device is not syncing, and the journey in your Drive is untouched.',
    })
    setBusy(null)
  }

  async function now() {
    setBusy('now')
    setNote(null)
    try {
      /* THE SIGN-IN GOES FIRST, INSIDE THE PRESS. This used to sync, catch the
         failure, and only then open Google's window — and by that point the
         press was over. Safari grants a popup to the gesture that asked for
         it and to nothing afterwards, so the recovery attempt was blocked
         before it began and the reader was told "Google could not open its
         sign-in window", which was true and useless.

         So the decision is made here, synchronously, before a single await:
         if this device is not already holding a live token, the one press
         they made becomes the one sign-in they see, and the sync follows it. */
      if (!tokenHeld()) await signIn()
      const { gained, unchanged } = await syncNow()
      setAt(lastSync())
      setNote({
        tone: 'good',
        text: unchanged
          ? 'Already up to date.'
          : gained
            ? `${gained} ${gained === 1 ? 'memory' : 'memories'} came back from your other device.`
            : 'Synced.',
      })
    } catch (error) {
      setNote({ tone: 'bad', text: error instanceof Error ? error.message : 'That did not sync.' })
    } finally {
      setBusy(null)
    }
  }

  async function disconnect() {
    setBusy('out')
    setNote(null)
    await signOut()
    setOn(false)
    setNote({ tone: 'good', text: 'This device has stopped syncing. The copy in your Drive is untouched.' })
    setBusy(null)
  }

  /* One folding row, the shape the lock beneath it already uses — the owner
     asked for the two to match, and they should: they are the same kind of
     thing, a subject with a state on the line and a tray of actions under it.

     WHAT IS ON THE LINE IS THE STATE, NOT AN INSTRUCTION. Shut, the row
     answers the only question a reader opens Settings with — is my reading
     safe, and how lately. "Off", or how long ago the last sync was, which
     since sync now runs by itself is almost always "Just now". The buttons
     inside are the exceptions: joining, leaving, and forcing a sync that has
     already happened. */
  return (
    <>
      <Row
        title="Sync across devices"
        control={
          <span className={styles.value}>
            {!on ? 'Off' : stale ? 'Sign in again' : at ? when(at) : 'Not yet'}
          </span>
        }
        open={open}
        onFold={() => setOpen(!open)}
      >
        <div className={styles.eraseBox}>
          {/* Nothing about how syncing behaves, while the reader is being asked
              whether it should start at all — the question below carries its own
              explanation and is the only thing on this fold that matters. */}
          {ask ? null : on ? (
            <>
              {/* WHO, before anything else. The owner's words were "why is the
                  app not showing account the user is signed into? everything is
                  just so vague" — and she was right: two devices could both say
                  "On" while syncing to two different Drives, and nothing on
                  this page could tell her. */}
              <p className={styles.note}>
                {who ? (
                  <>
                    Signed in as <strong>{who}</strong>.
                  </>
                ) : (
                  'Signed in to Google.'
                )}
              </p>
              <p className={styles.note}>
                {stale
                  ? 'Google has stopped letting this device refresh quietly, so syncing has paused. Sign in again to start it up.'
                  : 'This device syncs on its own — when you write something, when you open Flyleaf, and while it is in front of you. There is nothing to press.'}
              </p>
            </>
          ) : (
            <p className={styles.note}>
              Sign in with Google and this journal appears on your other
              devices, and keeps up with them by itself. The copy goes into
              your own Google Drive, in a hidden folder only Flyleaf can open —
              never onto our servers.
            </p>
          )}

          {ask ? (
            <>
              {/* WHERE, AND WHEN, BEFORE ANY BUTTON. The reason this question
                  was unanswerable is that it used to be about "your Drive" —
                  a place the reader has never been and cannot picture. Named
                  as their own iPhone, and dated, it becomes a question about
                  something they either remember doing or don't. */}
              <p className={styles.note}>
                This Google account already holds a journey, last changed{' '}
                {ask.device ? <>on your <strong>{ask.device}</strong>, </> : null}
                {ask.at ? when(ask.at).toLowerCase() : 'on another device'}.
              </p>
              <p className={styles.note}>
                Bringing them together adds anything that is only there to this
                device, and anything that is only here to that one. Nothing is
                replaced and nothing is removed — it is the only choice here
                that cannot lose a word.
              </p>
              <button
                type="button"
                className={styles.action}
                disabled={busy !== null}
                onClick={bringTogether}
              >
                {busy === 'in' ? 'Bringing them together…' : 'Bring them together'}
                <span className={styles.mark}>
                  <Cloud />
                </span>
              </button>
              <button
                type="button"
                className={styles.action}
                disabled={busy !== null}
                onClick={keepThisDevice}
              >
                Keep only what is on this device
              </button>
              <p className={styles.note}>
                Keeping this one sends it up in place of the other copy. Your{' '}
                {ask.device ? ask.device : 'other device'} keeps everything it
                has until it next syncs, and then matches this one.
              </p>
              <button
                type="button"
                className={styles.action}
                disabled={busy !== null}
                onClick={leaveThemApart}
              >
                {busy === 'out' ? 'Stopping…' : 'Leave them as they are'}
              </button>
            </>
          ) : !on ? (
            <button type="button" className={styles.action} disabled={busy !== null} onClick={connect}>
              {busy === 'in' ? 'Connecting…' : 'Sign in with Google'}
              <span className={styles.mark}>
                <Cloud />
              </span>
            </button>
          ) : (
            <>
              <button type="button" className={styles.action} disabled={busy !== null} onClick={now}>
                {busy === 'now' ? 'Syncing…' : stale ? 'Sign in to Google again' : 'Sync now'}
                <span className={styles.mark}>
                  <Cloud />
                </span>
              </button>

              <button
                type="button"
                className={styles.action}
                disabled={busy !== null}
                onClick={disconnect}
              >
                {busy === 'out' ? 'Stopping…' : 'Stop syncing this device'}
              </button>
            </>
          )}
        </div>
      </Row>

      {note && (
        <Row>
          <p className={styles.note} data-tone={note.tone} role="status">
            {note.text}
          </p>
        </Row>
      )}
    </>
  )
}

export default SyncCard
