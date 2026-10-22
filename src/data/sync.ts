/* Sync, in the only shape that keeps every promise this app has made.

   MERGE, NEVER PICK-ONE. The rule the whole file exists to hold: a sync must
   not be able to lose a reader work. So it never asks "which side wins" — it
   pulls what is in the account, merges it into this device, and writes the merged
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
import { drop, fetchMedia, optedIn, peek, pull, push, sendMedia } from './cloud'
import { dropAllJourneys, findJourney, readJourney } from './drive'
import { signIn, signOut as dropDrive, silentToken } from './google'
import { getHandle, setHandle } from './reader'
import { unseed } from './seed'

const SYNCED_AT_KEY = 'flyleaf-synced-at'
/** Set the moment anything is written while this device is NOT signed in, and
    cleared by the first sync that succeeds after it.

    This is the whole trigger for the one question this file asks, and it
    replaces a much larger machine. The old rule was "ask whenever the Drive
    copy was last written by another device" — which sounds cautious and is
    actually the steady state of every working pair of devices: write on the
    phone, open the laptop, and the laptop finds a newer copy written
    elsewhere. So it asked. Every time, forever, and stopped syncing in both
    directions until it was answered.

    The owner's rule is the right one and it is narrower: "the only occasion it
    asks for a sync is when I have made changes when I was not logged into my
    Google account." That is the one case where two journeys genuinely diverged
    without her being able to see it happen. Everything else is a pair of
    devices doing what she signed in for, and it should be silent. */
const OFFLINE_KEY = 'flyleaf-wrote-signed-out'
/** `<rev> <signature>`: the account revision this device last finished on, and
    what the device looked like then, so an unchanged device on an unchanged
    account skips the whole round trip. A new key rather than Drive's old one,
    so every device's first sync to the account sends its whole journey up. */
const MARK_KEY = 'flyleaf-cloud-mark'

/* THERE IS NO LONGER A MODE. There were two: 'merge', the union of both
   sides, and 'keep', which sent this device's journey up without reading the
   other one first. 'keep' was the only operation in Flyleaf that could end a
   sync with less than it started with, it existed to serve one button in
   Settings, and that button is gone. A sync is a merge. That is now a fact
   about this file rather than a default argument, and it cannot be overridden
   by a caller that thinks it knows better. */

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

/** Did anything get written on this device while it was not signed in? */
export function wroteWhileSignedOut(): boolean {
  return read(OFFLINE_KEY) !== ''
}

/** Called by the write hooks when a change lands with no account attached. */
function markWroteSignedOut() {
  write(OFFLINE_KEY, '1')
}

/** Is this device carrying work the account has never been shown?

    Two ways that happens. She wrote something while signed out — the flag
    above. Or this device has simply never completed a sync, which is the same
    situation seen from a device that predates the flag existing, and is the
    honest fallback for every reader already carrying a journey when this
    shipped. Either way there is a local journey the account has not seen, and
    that is the one thing worth stopping to ask about. */
export async function hasUnsharedWork(): Promise<boolean> {
  if (!(await hasLocalJourney())) return false
  return wroteWhileSignedOut() || lastSync() === null
}

/** "Bring them together." The union, in both directions — which is simply what
    every sync in this file does, so answering yes is answering "carry on". */
export async function bringArrivalIn(): Promise<SyncResult> {
  write(OFFLINE_KEY, '')
  resumeAutoSync()
  return syncNow()
}

/** One full sync: pull, merge, push. Throws with a sentence fit to show a
    reader, or with SIGNED_OUT when the account itself has gone. */
async function run(): Promise<SyncResult> {
  /* First, before anything is measured or sent: a preview build's demo shelf
     is not the reader's journey and must not travel. The sweep itself ships in
     every build — a device seeded on a preview must still be able to take the
     props off — so this costs a query even where there was never a shelf. */
  await unseed()

  /* THE OTHER DEVICE MOVED, AND NOTHING STOPS TO SAY SO. A merge cannot lose
     anything, so the only question this file asks lives at the one moment it
     is about: signing in on a device carrying work the account has never
     seen. See hasUnsharedWork above. */

  const [seenRev, seenSig = ''] = read(MARK_KEY).split(' ')
  /* Has this device written anything since it last finished a sync? Measured
     BEFORE the pull, because what the pull brings in changes the signature
     too, and that is the other device's news, not this one's. */
  const mine = (await signature()) !== seenSig
  let remote = await pull(Number(seenRev) || 0)
  let gained = 0

  for (let tries = 0; tries < 3; tries++) {
    if (remote?.text !== undefined) {
      /* Through the same door a hand-carried file uses. One reader of the
         format means a journey that restores from a USB stick and a journey
         that arrives from another device cannot drift apart. Recordings come
         by reference, and only the ones this device does not hold yet. */
      const back = await importJourney(
        new File([remote.text], 'journey.json', { type: 'application/json' }),
        { media: fetchMedia },
      )
      gained += back.keeps
      if (back.handle && !getHandle()) setHandle(back.handle)

      /* AND AGAIN, on the way up. The sweep above the pull cleans this device;
         this one cleans what the pull just brought in, so an old copy's demo
         props cannot land on the shelf and be exported straight back. */
      await unseed()
    }

    /* Nothing new here, so the account already holds everything this device
       has: every newer revision was written on top of the one it last saw, and
       a merge only adds. Writing back would only bounce the other device's
       work to it again, and the two would trade the same file forever. */
    if (remote && !mine) return settle(remote.rev, gained, remote.text === undefined)
    if (!remote && !(await hasLocalJourney())) return settle(0, gained, true)

    /* Exported AFTER the merge, so what goes up is the union rather than this
       device's side of it. Recordings travel once each, by their hash, ahead
       of the journey that points at them. */
    const { blob, media } = await exportJourney(getHandle(), { refs: true })
    await sendMedia(media)
    const rev = await push(blob, remote?.rev ?? 0, deviceName())
    if (rev !== null) return settle(rev, gained, false)

    /* Another device wrote in between. Take its whole revision, merge it, and
       try again on top of it: nothing is overwritten, ever. */
    remote = await pull(0)
  }
  throw new Error('Another device kept writing at the same moment. Flyleaf will try again by itself.')
}

async function settle(rev: number, gained: number, unchanged: boolean): Promise<SyncResult> {
  write(MARK_KEY, `${rev} ${await signature()}`)
  write(SYNCED_AT_KEY, String(Date.now()))
  /* Whatever was written while signed out has now been up and merged, so it is
     no longer a reason to stop and ask anybody anything. */
  write(OFFLINE_KEY, '')
  window.dispatchEvent(new Event('flyleaf-sync'))
  return { gained, unchanged }
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

/** Is there already a journey in this account — and if so, when and where
    was it last written?

    The owner's words: it "should remember where the last change was made". A
    question about "your account" is a question about a place the reader has
    never been; a question about "your iPhone, three hours ago" is one they can
    actually answer, because they either remember writing that or they don't. */
export async function otherJourney(): Promise<{ device: string; at: number } | null> {
  const doc = await peek()
  return doc && { device: doc.device, at: doc.at }
}

/** Take the journey and its recordings out of the account, and stop this
    device putting them back. Syncing pauses first and the caller signs out,
    or the next write would recreate it within seconds.

    Nothing on the device is touched. Every book, every keep, every recording
    stays exactly where it is — this removes the copy, not the reading. */
export async function forgetCopy(): Promise<void> {
  pauseAutoSync()
  try {
    await drop()
    write(MARK_KEY, '')
    write(SYNCED_AT_KEY, '')
    /* Everything on this device is now unshared by definition, so signing in
       again is a first meeting and should ask like one. */
    write(OFFLINE_KEY, '1')
  } finally {
    resumeAutoSync()
  }
}

/** Bring in the journey an older Flyleaf kept in the reader's Google Drive.

    Once, by hand, and read-only: Google's window asks for Drive, the file is
    merged in, and the merged whole goes up to the account on the sync that
    follows. The Drive copy itself is left alone; removing it is forgetDrive.
    Returns the keeps it brought, or null when that Drive held no journey. */
export async function fromDrive(): Promise<number | null> {
  await signIn()
  const file = await findJourney(await silentToken())
  if (!file) return null
  const text = await readJourney(await silentToken(), file.id)
  const back = await importJourney(new File([text], 'journey.json', { type: 'application/json' }))
  if (back.handle && !getHandle()) setHandle(back.handle)
  await unseed()
  if (optedIn()) void syncNow().catch(() => {})
  return back.keeps
}

/** Delete the copy an older Flyleaf kept in Google Drive. Its hidden folder has
    no row in Drive's own list, so this button is the only way to remove it.
    Returns how many files went. */
export async function forgetDrive(): Promise<number> {
  await signIn()
  try {
    return await dropAllJourneys(await silentToken())
  } finally {
    await dropDrive()
  }
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
export function syncNow(): Promise<SyncResult> {
  if (running) return running

  running = (async () => {
    return run()
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
   visible — a backgrounded tab costs the reader battery and the server nothing.

   AND ON ARRIVAL: at launch and whenever the app comes back to the front,
   which is the moment the other device is most likely to have moved.

   Each of those is cheap when nothing has changed. `run` sends the revision it
   last finished on, the server answers 204 with no body when that is still the
   newest, and a poll on an idle pair moves a few hundred bytes. */

/** How long a writing hand must be still before its work is sent up. */
const SETTLE = 4_000
/** How often an app in the foreground goes to look for the other device. */
const BEAT = 30_000
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
   sync makes are themselves merges arriving from the account — they would otherwise
   schedule a sync of the thing that was just synced, forever. */
function touched() {
  /* Signed out, so there is nowhere to send this — but it is exactly the work
     that will need reconciling if she signs in later, and remembering that now
     is the only way to know it happened. This is the single input to the one
     question this file asks. */
  if (!optedIn()) {
    markWroteSignedOut()
    return
  }
  if (settling) clearTimeout(settling)
  settling = setTimeout(() => {
    settling = null
    if (!running) attempt()
  }, SETTLE)
}

function flush() {
  if (!settling) return
  clearTimeout(settling)
  settling = null
  if (optedIn() && !paused) void syncNow().catch(() => {})
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
    else flush()
  })
  /* A phone puts the app away without warning. Work still settling goes up
     now, while the page is alive to send it, not four seconds after it isn't. */
  window.addEventListener('pagehide', flush)
  window.addEventListener('focus', attempt)
  window.addEventListener('online', attempt)

  setInterval(() => {
    if (document.visibilityState === 'visible') attempt()
  }, BEAT)

  attempt()
}
