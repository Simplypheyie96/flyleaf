/* Sync, in the only shape that keeps every promise this app has made.

   MERGE, NEVER PICK-ONE. The rule the whole file exists to hold: a sync must
   not be able to lose a reader work. So it never asks "which side wins" — it
   pulls what is in Drive, merges it into this device, and writes the merged
   whole back up. Both sides end up holding the union. A quote written on a
   phone with no signal and a note written on a laptop the same afternoon both
   survive, in either order, however long the gap.

   That works because `backup.ts` already solved identity: a keep is recognised
   by its CONTENT — book, kind, day, moment, words — not by a row id. Two
   devices writing the same keep produce the same fingerprint, so merging is
   idempotent and syncing twice adds nothing the second time. Books key on
   their cover seed, sittings on the millisecond they began. This file adds a
   transport; it deliberately adds no new rules about what is the same thing.

   QUIET BY DEFAULT, NEVER A GATE. Nothing here runs for a reader who has not
   asked for it. There is no sign-in wall at first run, no nag, and a reader who
   never signs in is not merely unsynced — they are unknown to us, with nothing
   of theirs anywhere but their own device. Signing in later changes where their
   journey is COPIED to, and does not change that. */

import { exportJourney, importJourney } from './backup'
import db from './db'
import { findJourney, readJourney, writeJourney } from './drive'
import { optedIn, silentToken } from './google'
import { getHandle, setHandle } from './reader'

const SYNCED_AT_KEY = 'flyleaf-synced-at'
/** What this device looked like the last time a sync finished, so an unchanged
    device on an unchanged Drive can skip the whole round trip. */
const MARK_KEY = 'flyleaf-sync-mark'

export interface SyncResult {
  /** Keeps that came down from another device. */
  gained: number
  /** True when nothing had changed on either side and no bytes moved. */
  unchanged: boolean
}

function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* Private mode. Sync still ran; it just cannot remember that it did, so
       the next one does the full round trip instead of skipping it. */
  }
}

export function lastSync(): number | null {
  const at = Number(read(SYNCED_AT_KEY))
  return at > 0 ? at : null
}

/** A cheap stand-in for "has anything changed here". Counts plus the newest
    moment: writing a keep moves one of them, and editing one moves none — which
    is why the mark is only ever used to skip work, never to decide a merge. */
async function signature(): Promise<string> {
  const [books, keeps, sittings, newest] = await Promise.all([
    db.books.count(),
    db.entries.count(),
    db.sittings.count(),
    db.entries.orderBy('id').last(),
  ])
  return `${books}.${keeps}.${sittings}.${newest?.createdAt ?? 0}`
}

/** One full sync: pull, merge, push. Throws with a sentence fit to show a
    reader. The caller supplies the token so an expired one can be renewed and
    the whole thing retried without this function knowing about auth at all. */
async function run(token: string): Promise<SyncResult> {
  const remote = await findJourney(token)
  const here = await signature()
  const mark = `${remote?.modifiedTime ?? ''} ${here}`

  if (remote && read(MARK_KEY) === mark) {
    write(SYNCED_AT_KEY, String(Date.now()))
    return { gained: 0, unchanged: true }
  }

  let gained = 0
  if (remote) {
    const text = await readJourney(token, remote.id)
    /* Through the same door a hand-carried file uses. One reader of the format
       means a journey that restores from a USB stick and a journey that
       arrives from Drive cannot drift apart. */
    const back = await importJourney(
      new File([text], 'journey.json', { type: 'application/json' }),
    )
    gained = back.keeps
    if (back.handle && !getHandle()) setHandle(back.handle)
  }

  /* Exported AFTER the merge, so what goes up is the union rather than this
     device's side of it. This is the line that makes overwriting the Drive
     copy safe. */
  const { blob } = await exportJourney(getHandle())
  const saved = await writeJourney(token, blob, remote?.id)

  write(SYNCED_AT_KEY, String(Date.now()))
  write(MARK_KEY, `${saved.modifiedTime} ${await signature()}`)
  window.dispatchEvent(new Event('flyleaf-sync'))
  return { gained, unchanged: false }
}

let running: Promise<SyncResult> | null = null

/** Sync now. Safe to call from anywhere — overlapping calls share one run,
    because two syncs at once would each merge the other's half-written state. */
export function syncNow(): Promise<SyncResult> {
  if (running) return running

  running = (async () => {
    let token = await silentToken()
    try {
      return await run(token)
    } catch (error) {
      /* One retry, and only for the hour being up. Everything else is a real
         failure and says so. */
      if (!(error instanceof Error) || error.message !== 'expired') throw error
      token = await silentToken()
      return run(token)
    }
  })().finally(() => {
    running = null
  })

  return running
}

/* ── Keeping up, without being asked twice ──────────────────────────────────

   A reader who has turned sync on should not have to remember to press
   anything. But a sync on every keystroke would upload a whole journey a dozen
   times an afternoon, so this runs at the two moments that actually matter:
   when the app opens, and when it comes back to the front after being away —
   which is precisely when the other device may have written something. Never
   more than once a minute, and never for anyone who has not opted in. */

const QUIET = 60_000
let lastRun = 0

function attempt() {
  if (!optedIn() || Date.now() - lastRun < QUIET) return
  lastRun = Date.now()
  void syncNow().catch(() => {
    /* Silence is right here. This one was not asked for: a reader on a train
       with no signal must not be handed an error about it. The Settings row
       still shows how old the last real sync is, which is the honest version
       of the same fact. */
  })
}

export function startAutoSync() {
  /* The listener goes on unconditionally, and `attempt` is the thing that
     checks. A reader who turns sync on halfway through a session would
     otherwise get no automatic sync until they next reloaded the app. */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') attempt()
  })
  attempt()
}
