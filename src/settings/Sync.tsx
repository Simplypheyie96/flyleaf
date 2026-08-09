import { useEffect, useState } from 'react'
import { Row } from './Group'
import { SYNC_AVAILABLE, optedIn, signIn, signOut } from '../data/google'
import { lastSync, syncNow } from '../data/sync'
import styles from './settings.module.css'

/* Sync, offered — never imposed.

   This row is the whole of the sign-in story, and where it sits is the design.
   It is IN Settings, under the rows about where the journey lives, and it is
   nowhere else: not at first run, not behind a modal on the second visit, not
   as a banner over the shelf. A reader can use Flyleaf for years and never meet
   it. That is not an oversight — an app that asks who you are before it will
   hold your reading has already broken the promise this one is built on.

   What it says, it says plainly. Not "back up to the cloud", which sounds like
   our cloud: the journey goes into the reader's OWN Google Drive, into a hidden
   folder no other app can open, and we never hold a copy. The footnote under
   the card carries that sentence rather than this row, because a row is one
   line — the same rule every other row on this page follows.

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

  /* Both `google.ts` and `sync.ts` fire this, so a sync that ran by itself in
     the background updates the date under the reader's eyes rather than
     leaving a stale one until the next reload. */
  useEffect(() => {
    const refresh = () => {
      setOn(optedIn())
      setAt(lastSync())
    }
    window.addEventListener('flyleaf-sync', refresh)
    return () => window.removeEventListener('flyleaf-sync', refresh)
  }, [])

  /* No client ID built in means no working sign-in, so the row does not exist.
     Same rule as the tip jar: never offer a button that opens onto an error. */
  if (!SYNC_AVAILABLE) return null

  async function connect() {
    setBusy('in')
    setNote(null)
    try {
      await signIn()
      setOn(true)
      const { gained } = await syncNow()
      setAt(lastSync())
      setNote({
        tone: 'good',
        text: gained
          ? `Synced. ${gained} ${gained === 1 ? 'memory' : 'memories'} came back from your other device.`
          : 'Synced. Your journey is now in your own Google Drive.',
      })
    } catch (error) {
      setOn(optedIn())
      setNote({ tone: 'bad', text: error instanceof Error ? error.message : 'That did not connect.' })
    } finally {
      setBusy(null)
    }
  }

  async function now() {
    setBusy('now')
    setNote(null)
    try {
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

  if (!on)
    return (
      <>
        <button type="button" className={styles.action} disabled={busy !== null} onClick={connect}>
          {busy === 'in' ? 'Connecting…' : 'Sync across devices'}
          <span className={styles.mark}>
            <Cloud />
          </span>
        </button>
        {note && (
          <Row>
            <p className={styles.note} data-tone={note.tone} role="status">
              {note.text}
            </p>
          </Row>
        )}
      </>
    )

  return (
    <>
      <Row
        title="Last synced"
        control={<span className={styles.value}>{at ? when(at) : 'Not yet'}</span>}
      />

      <button type="button" className={styles.action} disabled={busy !== null} onClick={now}>
        {busy === 'now' ? 'Syncing…' : 'Sync now'}
        <span className={styles.mark}>
          <Cloud />
        </span>
      </button>

      <button type="button" className={styles.action} disabled={busy !== null} onClick={disconnect}>
        {busy === 'out' ? 'Stopping…' : 'Stop syncing this device'}
      </button>

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
