import { useEffect, useState } from 'react'
import { Row } from './Group'
import GoogleButton from '../components/GoogleButton'
import { SYNC_AVAILABLE, account, optedIn, signOut } from '../data/cloud'
import { optedIn as usedDrive, warmUp } from '../data/google'
import {
  autoSyncPaused,
  bringArrivalIn,
  forgetAccount,
  forgetCopy,
  forgetDrive,
  fromDrive,
  hasUnsharedWork,
  lastSync,
  otherJourney,
  pauseAutoSync,
  resumeAutoSync,
  syncNow,
} from '../data/sync'
import { native } from '../native/platform'
import styles from './settings.module.css'

/* Sync, offered — never imposed.

   This row is the permanent home of the sign-in story, and where it sits is
   the design. It is IN Settings, nothing is gated behind it, no screen
   interrupts to demand it, and a reader can use Flyleaf for years and never
   touch it. components/SyncNudge.tsx offers it once, after a dozen memories,
   and never again after three refusals; that is the only place it is
   mentioned unasked.

   SIGN IN ONCE, AND THAT IS ALL. The owner's words: "i don't need to sync once
   i login, and i am never logged out". So there is no "Sync now" and no
   "Reconnect": the session is Flyleaf's own and lasts as long as the device is
   used (data/cloud.ts), and syncing runs by itself (data/sync.ts). What is left
   in the tray is who it is signed in as, and the two ways out.

   What it says, it says plainly: the journey is kept on Flyleaf's servers,
   private to the account, and can be removed from here in two presses.

   THE OLD DRIVE COPY. A device that synced through Google Drive before this
   still has a journey sitting there, in a hidden folder with no row in
   Drive's own list. It gets two buttons, shown only on such a device: bring
   it in, and remove it. */

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

function came(gained: number) {
  return `${gained} ${gained === 1 ? 'memory' : 'memories'}`
}

function SyncCard() {
  const [on, setOn] = useState(optedIn)
  const [at, setAt] = useState(lastSync)
  const [busy, setBusy] = useState<'in' | 'out' | 'drop' | 'account' | 'drive' | null>(null)
  /* Which irreversible button has been pressed once. Two presses rather than a
     dialog, and the second is where the sentence explaining it lands. */
  const [sure, setSure] = useState<'copy' | 'account' | 'drive' | null>(null)
  const [note, setNote] = useState<Note>(null)
  const [open, setOpen] = useState(false)
  const [who, setWho] = useState(account)
  const [drive, setDrive] = useState(usedDrive)
  /* Set when this device and the account both already hold a journey and the
     reader has not yet said what to do about it, with WHERE and WHEN the other
     one was last written, because that is the fact the question turns on. */
  const [ask, setAsk] = useState<{ device: string; at: number } | null>(null)

  /* Opened with the question already outstanding — the nudge signed in, found
     another device's journey, paused and pointed here. */
  useEffect(() => {
    if (!autoSyncPaused()) return
    setOpen(true)
    void otherJourney().then((other) => other && setAsk(other))
  }, [])

  /* A sync that ran by itself updates the date under the reader's eyes. */
  useEffect(() => {
    const refresh = () => {
      setOn(optedIn())
      setAt(lastSync())
      setWho(account())
      setDrive(usedDrive())
    }
    window.addEventListener('flyleaf-sync', refresh)
    return () => window.removeEventListener('flyleaf-sync', refresh)
  }, [])

  /* Google's script, fetched now rather than during the press: Safari opens a
     popup only from inside the gesture that asked for it. */
  useEffect(warmUp, [])

  if (!SYNC_AVAILABLE) return null

  function fail(error: unknown, fallback: string) {
    setNote({ tone: 'bad', text: error instanceof Error ? error.message : fallback })
  }

  /* Google's button has signed the reader in by the time this runs.

     THE ONE QUESTION, AND THE ONLY ONE: this device is carrying work the
     account has never seen, and the account already holds a journey from
     somewhere else. That is what "my two devices have drifted apart" actually
     looks like. The pause is held until she answers, or the write hooks would
     merge it underneath the question. */
  async function connected() {
    setOn(true)
    setBusy('in')
    setNote(null)
    try {
      pauseAutoSync()
      const other = await otherJourney()
      if (other && (await hasUnsharedWork())) {
        setAsk(other)
        return
      }
      resumeAutoSync()
      const { gained } = await syncNow()
      setAt(lastSync())
      setNote({
        tone: 'good',
        text: gained ? `Signed in. ${came(gained)} came back from your other device.` : 'Signed in. Your journey now syncs by itself.',
      })
    } catch (error) {
      resumeAutoSync()
      setOn(optedIn())
      fail(error, 'That did not connect.')
    } finally {
      setBusy(null)
    }
  }

  /* Yes. There is no version of this that loses anything: what goes up is the
     union of both sides, and both devices end up holding it. */
  async function bringTogether() {
    setBusy('in')
    setAsk(null)
    try {
      const { gained } = await bringArrivalIn()
      setAt(lastSync())
      setNote({
        tone: 'good',
        text: gained ? `Brought together. ${came(gained)} came over from your other device.` : 'Brought together.',
      })
    } catch (error) {
      fail(error, 'That did not sync.')
    } finally {
      setBusy(null)
    }
  }

  /* No. Signing back out is the honest undo: signed in but never syncing would
     be a switch that says On and does nothing. */
  async function leaveThemApart() {
    setAsk(null)
    setBusy('out')
    await signOut()
    resumeAutoSync()
    setNote({ tone: 'good', text: 'Left as they are. This device is not syncing, and the journey in your account is untouched.' })
    setBusy(null)
  }

  async function leave() {
    setBusy('out')
    setNote(null)
    await signOut()
    setNote({ tone: 'good', text: 'Signed out of this device. Your journey stays here and in your account.' })
    setBusy(null)
  }

  /* Signed out as part of the same press: still signed in, this device would
     write the journey straight back up within seconds. */
  async function dropCopy() {
    setBusy('drop')
    setNote(null)
    try {
      await forgetCopy()
      await signOut()
      setAt(null)
      setSure(null)
      setNote({ tone: 'good', text: 'Removed from Flyleaf. This device is signed out, and everything written on it remains here.' })
    } catch (error) {
      fail(error, 'That could not be removed.')
    } finally {
      setBusy(null)
    }
  }

  async function dropAccount() {
    setBusy('account')
    setNote(null)
    try {
      await forgetAccount()
      setAt(null)
      setSure(null)
      setNote({ tone: 'good', text: 'Your Flyleaf account is deleted. This device is signed out, and everything written on it remains here.' })
    } catch (error) {
      fail(error, 'That could not be deleted.')
    } finally {
      setBusy(null)
    }
  }

  async function bringDrive() {
    setBusy('drive')
    setNote(null)
    try {
      const gained = await fromDrive()
      setNote(
        gained === null
          ? { tone: 'good', text: 'That Google Drive holds no Flyleaf journey.' }
          : { tone: 'good', text: gained ? `${came(gained)} came in from Google Drive.` : 'Brought in. Nothing there was new to this device.' },
      )
    } catch (error) {
      fail(error, 'That did not connect.')
    } finally {
      setBusy(null)
    }
  }

  async function dropDrive() {
    setBusy('drive')
    setNote(null)
    try {
      const count = await forgetDrive()
      setSure(null)
      setNote({
        tone: 'good',
        text: count > 0 ? 'Removed the old copy from Google Drive.' : 'Google Drive held no Flyleaf journey.',
      })
    } catch (error) {
      fail(error, 'That could not be removed.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <Row
        title="Sync across devices"
        control={<span className={styles.value}>{!on ? 'Off' : at ? when(at) : 'Not yet'}</span>}
        open={open}
        onFold={() => {
          setOpen(!open)
          // A half-armed irreversible button must not still be armed next time.
          setSure(null)
        }}
      >
        <div className={styles.eraseBox}>
          {ask ? (
            <>
              <p className={styles.note}>
                This account already holds a journey, last changed{' '}
                {ask.device ? <>on your <strong>{ask.device}</strong>, </> : null}
                {ask.at ? when(ask.at).toLowerCase() : 'on another device'}.
              </p>
              <p className={styles.note}>
                Bringing them together adds anything that is only there to this
                device, and anything that is only here to that one. Nothing is
                replaced and nothing is removed.
              </p>
              <button type="button" className={styles.action} disabled={busy !== null} onClick={bringTogether}>
                {busy === 'in' ? 'Bringing them together…' : 'Bring them together'}
                <span className={styles.mark}>
                  <Cloud />
                </span>
              </button>
              <button type="button" className={styles.action} disabled={busy !== null} onClick={leaveThemApart}>
                {busy === 'out' ? 'Signing out…' : 'Keep them apart and sign out'}
              </button>
            </>
          ) : on ? (
            <>
              <p className={styles.note}>
                Signed in as <strong>{who}</strong>. This device syncs on its own
                and stays signed in. There is nothing to press.
              </p>
              <button type="button" className={styles.action} disabled={busy !== null} onClick={leave}>
                {busy === 'out' ? 'Signing out…' : 'Sign out of this device'}
              </button>
              {sure === 'copy' && (
                <p className={styles.note} data-tone="bad">
                  This deletes your journey and recordings from Flyleaf and signs
                  this device out. Everything stays on this device, but your other
                  devices will have nothing to sync with.
                </p>
              )}
              <button
                type="button"
                className={styles.action}
                disabled={busy !== null}
                onClick={() => (sure === 'copy' ? void dropCopy() : setSure('copy'))}
              >
                {busy === 'drop' ? 'Removing…' : sure === 'copy' ? 'Yes, remove it' : 'Remove my journey from Flyleaf'}
              </button>
              {/* The store apps must let a reader close the account they made there. */}
              {native && sure === 'account' && (
                <p className={styles.note} data-tone="bad">
                  This deletes your Flyleaf account and everything it holds for
                  Journal, Press and eReader, and signs this device out. Everything
                  stays on this device. A purchase comes back with Restore.
                </p>
              )}
              {native && (
                <button
                  type="button"
                  className={styles.action}
                  disabled={busy !== null}
                  onClick={() => (sure === 'account' ? void dropAccount() : setSure('account'))}
                >
                  {busy === 'account' ? 'Deleting…' : sure === 'account' ? 'Yes, delete my account' : 'Delete my Flyleaf account'}
                </button>
              )}
            </>
          ) : (
            <>
              <p className={styles.note}>
                Sign in once and this journal appears on your other devices and
                keeps up with them by itself. It is kept on Flyleaf&rsquo;s
                servers, private to your account, and you can remove it from
                here at any time.
              </p>
              {busy === 'in' ? (
                <p className={styles.note} role="status">Signing in…</p>
              ) : (
                <GoogleButton onDone={() => void connected()} onError={(text) => setNote({ tone: 'bad', text })} />
              )}
            </>
          )}

          {drive && !ask && (
            <>
              <p className={styles.note}>
                An older Flyleaf kept a copy of this journal in your Google Drive.
              </p>
              <button type="button" className={styles.action} disabled={busy !== null} onClick={bringDrive}>
                {busy === 'drive' && sure !== 'drive' ? 'Bringing it in…' : 'Bring in my Google Drive copy'}
              </button>
              {sure === 'drive' && (
                <p className={styles.note} data-tone="bad">
                  This opens Google to confirm the account, then deletes the old
                  copy in your Google Drive. Nothing here or in your Flyleaf
                  account is touched.
                </p>
              )}
              <button
                type="button"
                className={styles.action}
                disabled={busy !== null}
                onClick={() => (sure === 'drive' ? void dropDrive() : setSure('drive'))}
              >
                {busy === 'drive' && sure === 'drive' ? 'Removing…' : sure === 'drive' ? 'Yes, remove it from Drive' : 'Remove the Google Drive copy'}
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
