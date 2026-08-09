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
import { deviceName } from './device'
import { findJourney, readJourney, writeJourney } from './drive'
import { optedIn, silentToken } from './google'
import { getHandle, setHandle } from './reader'
import { unseed } from './seed'

const SYNCED_AT_KEY = 'flyleaf-synced-at'
/** What this device looked like the last time a sync finished, so an unchanged
    device on an unchanged Drive can skip the whole round trip. */
const MARK_KEY = 'flyleaf-sync-mark'

/** 'merge' takes the union of both sides, which is what every automatic sync
    does and the only thing that cannot lose anything. 'keep' sends this
    device's journey up without reading the other one first — the reader's
    answer to the meeting question, never a default. */
export type Mode = 'merge' | 'keep'

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

/** A cheap stand-in for "has anything changed here", and it has to notice an
    EDIT as well as an addition.

    It used to be counts plus the newest keep, and an edit moves neither: mark a
    book as finished and nothing else, and this device looked identical to the
    one that had just synced, so the round trip was skipped and the other device
    never heard about it. That is the owner's report exactly — books marked read
    on one device still reading on the other.

    So the newest `editedAt` on either table goes in too. Deletions are already
    covered, by the counts and by the headstones they leave. */
async function signature(): Promise<string> {
  const [books, keeps, sittings, graves, newest] = await Promise.all([
    db.books.count(),
    db.entries.count(),
    db.sittings.count(),
    db.graves.count(),
    db.entries.orderBy('id').last(),
  ])
  /* Off the index rather than a scan. Reading every row to find the newest
     stamp would pull every voice memo's blob out of the database once every
     ninety seconds, on a phone, to compute a string. */
  const [bookEdit, keepEdit] = await Promise.all([
    db.books.orderBy('editedAt').last(),
    db.entries.orderBy('editedAt').last(),
  ])
  const edited = Math.max(bookEdit?.editedAt ?? 0, keepEdit?.editedAt ?? 0)
  return `${books}.${keeps}.${sittings}.${graves}.${newest?.createdAt ?? 0}.${edited}`
}

/** One full sync: pull, merge, push. Throws with a sentence fit to show a
    reader. The caller supplies the token so an expired one can be renewed and
    the whole thing retried without this function knowing about auth at all. */
async function run(token: string, mode: Mode = 'merge'): Promise<SyncResult> {
  /* First, before anything is measured or sent: a preview build's demo shelf
     is not the reader's journey and must not travel. The sweep itself ships in
     every build — a device seeded on a preview must still be able to take the
     props off — so this costs a query even where there was never a shelf. */
  await unseed()

  const remote = await findJourney(token)
  const here = await signature()
  const mark = `${remote?.modifiedTime ?? ''} ${here}`

  if (remote && mode === 'merge' && read(MARK_KEY) === mark) {
    write(SYNCED_AT_KEY, String(Date.now()))
    return { gained: 0, unchanged: true }
  }

  let gained = 0
  /* 'keep' skips the pull and nothing else. What is on this device goes up and
     replaces the Drive copy — which is only ever reached from the reader
     answering the meeting question with "keep what is on this device", and is
     the one path in this file that can lose something. It is theirs to choose,
     said in those words, and it is never automatic. */
  if (remote && mode === 'merge') {
    const text = await readJourney(token, remote.id)
    /* Through the same door a hand-carried file uses. One reader of the format
       means a journey that restores from a USB stick and a journey that
       arrives from Drive cannot drift apart. */
    const back = await importJourney(
      new File([text], 'journey.json', { type: 'application/json' }),
    )
    gained = back.keeps
    if (back.handle && !getHandle()) setHandle(back.handle)

    /* AND AGAIN, on the way up. The sweep above the pull cleans this device;
       this one cleans what the pull just brought in. Old Drive copies still
       hold the demo props, and a merge can only add — so without this they
       land on the shelf and are exported straight back, and the sweep chases
       them round in a circle one sync behind.

       This is what replaced the headstones the sweep used to leave. Those
       worked, and they also travelled as "delete book 366657726" to devices
       holding the reader's OWN Salt Path at that id, and deleted it. Sweeping
       twice says nothing about anyone else's rows. See seed.ts. */
    await unseed()
  }

  /* Exported AFTER the merge, so what goes up is the union rather than this
     device's side of it. This is the line that makes overwriting the Drive
     copy safe. */
  const { blob } = await exportJourney(getHandle())
  const saved = await writeJourney(token, blob, deviceName(), remote?.id)

  write(SYNCED_AT_KEY, String(Date.now()))
  write(MARK_KEY, `${saved.modifiedTime} ${await signature()}`)
  window.dispatchEvent(new Event('flyleaf-sync'))
  return { gained, unchanged: false }
}

/* ── Asking first, the one time it matters ──────────────────────────────────

   Signing in used to merge on the spot, and the owner's words were exact: it
   "randomly syncs from another device without asking if you want to merge or
   not". Merging is safe — it is a union, nothing is replaced — but safe is not
   the same as expected, and a shelf that grows by four books a second after a
   sign-in is a thing that happened TO somebody.

   So on the one press where two journeys meet for the first time, Settings
   asks. These two are what it needs to know that they are meeting, and the
   pause is what stops the automatic triggers merging underneath the question. */

/** Has this device got a journey of its own to lose the surprise of? */
export async function hasLocalJourney(): Promise<boolean> {
  const [books, keeps] = await Promise.all([db.books.count(), db.entries.count()])
  return books + keeps > 0
}

/** Is there already a journey in this Google account's Drive — and if so, when
    and where was it last written?

    The owner's words: it "should remember where the last change was made". A
    question about "your Drive" is a question about a place the reader has
    never been; a question about "your iPhone, three hours ago" is one they can
    actually answer, because they either remember writing that or they don't. */
export async function otherJourney(): Promise<{ device: string; at: number } | null> {
  const file = await findJourney(await silentToken())
  if (!file) return null
  return { device: file.device ?? '', at: Date.parse(file.modifiedTime) || 0 }
}

let paused = false

/** Hold every automatic sync — the write hooks, the beat, the return to the
    front — while a question is on screen. Explicit syncs still run: `syncNow`
    is only ever called by something the reader pressed. */
export function pauseAutoSync() {
  paused = true
}

export function resumeAutoSync() {
  paused = false
}

/** Is a question still outstanding? The nudge pauses and hands over to
    Settings, so Settings has to be able to find out that it was handed to. */
export function autoSyncPaused(): boolean {
  return paused
}

let running: Promise<SyncResult> | null = null

/** Sync now. Safe to call from anywhere — overlapping calls share one run,
    because two syncs at once would each merge the other's half-written state. */
export function syncNow(mode: Mode = 'merge'): Promise<SyncResult> {
  if (running) return running

  running = (async () => {
    let token = await silentToken()
    try {
      return await run(token, mode)
    } catch (error) {
      /* One retry, and only for the hour being up. Everything else is a real
         failure and says so. */
      if (!(error instanceof Error) || error.message !== 'expired') throw error
      token = await silentToken()
      return run(token, mode)
    }
  })().finally(() => {
    running = null
  })

  return running
}

/* ── Keeping up, without being asked ────────────────────────────────────────

   NOBODY SHOULD EVER PRESS "SYNC NOW". The owner's test of the first version
   was the whole verdict: it worked, and she had to open Settings on both
   devices to make it work. That is not syncing, it is a manual export with a
   nicer name. Signing in once is the only thing a reader should have to do.

   Three triggers, because two devices staying level needs both halves:

   PUSH, after a write. Every table gets a Dexie hook, so writing a quote,
   editing a book or finishing a sitting schedules a sync — debounced by
   SETTLE, so a reader typing an entry uploads once when they stop rather than
   once per keystroke.

   PULL, on a timer, while the app is in front. This is the half that was
   missing entirely: the other device writing something is not an event this
   device can hear, so it has to go and look. Every BEAT, and only while
   visible — a backgrounded tab costs the reader battery and Drive nothing.

   AND ON ARRIVAL: at launch and whenever the app comes back to the front,
   which is the moment the other device is most likely to have moved.

   Each of those is cheap when nothing has changed. `run` compares the Drive
   copy's modifiedTime against a stored mark and returns without moving bytes,
   so a poll on an idle pair is one metadata call. */

/** How long a writing hand must be still before its work is sent up. */
const SETTLE = 4_000
/** How often an app in the foreground goes to look for the other device. */
const BEAT = 90_000
/** A floor under everything, so no combination of triggers can loop. */
const QUIET = 10_000

let lastRun = 0
let settling: ReturnType<typeof setTimeout> | null = null
let held: ReturnType<typeof setTimeout> | null = null

/* THE FLOOR DELAYS A SYNC; IT MUST NEVER CANCEL ONE, and until now it did.

   `attempt` returned when the last run was under ten seconds old and nothing
   rescheduled it, so a write that landed inside that window was simply dropped
   — the book was on the device, the device believed it had just synced, and
   the only thing that would ever send it was the ninety-second beat, if the
   app was still in front when it came round. The owner's report was exactly
   that shape: a book added shortly after a sync that never reached her phone.

   So a blocked attempt now books itself for the moment the floor lifts. One
   timer, not one per caller: three triggers firing inside the same window
   still produce one sync, which is what the floor was for. */
function attempt() {
  if (!optedIn() || paused) return

  const waited = Date.now() - lastRun
  if (waited < QUIET) {
    if (!held) {
      held = setTimeout(() => {
        held = null
        attempt()
      }, QUIET - waited)
    }
    return
  }

  if (held) {
    clearTimeout(held)
    held = null
  }
  lastRun = Date.now()
  void syncNow().catch(() => {
    /* Silence is right here. This one was not asked for: a reader on a train
       with no signal must not be handed an error about it. The Settings row
       still shows how old the last real sync is, which is the honest version
       of the same fact. */
  })
}

/* A write happened. Wait for the hand to stop, then send.

   `running` is checked at the far end rather than here because the writes a
   sync makes are themselves merges arriving from Drive — they would otherwise
   schedule a sync of the thing that was just synced, forever. */
function touched() {
  if (!optedIn()) return
  if (settling) clearTimeout(settling)
  settling = setTimeout(() => {
    settling = null
    if (!running) attempt()
  }, SETTLE)
}

export function startAutoSync() {
  /* Every listener goes on unconditionally, and `attempt` is the thing that
     checks. A reader who turns sync on halfway through a session would
     otherwise get no automatic sync until they next reloaded the app. */
  for (const table of [db.books, db.entries, db.sittings]) {
    table.hook('creating', touched)
    table.hook('updating', touched)
    table.hook('deleting', touched)
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') attempt()
  })

  setInterval(() => {
    if (document.visibilityState === 'visible') attempt()
  }, BEAT)

  attempt()
}
