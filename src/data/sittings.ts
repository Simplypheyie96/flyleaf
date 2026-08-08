/* THE CLOCK.

   A reader lights the lamp, puts the rain on, starts the clock, and reads.
   That last part is the difficulty: for the next forty minutes this app is not
   on screen, and quite possibly the phone is not on. Every design decision in
   this file follows from that one fact.

   TIME IS READ OFF THE WALL CLOCK, NEVER COUNTED. The obvious implementation
   is a `setInterval` that adds a second to a number every second. It is wrong
   on a phone: a backgrounded tab has its timers throttled to once a minute and
   a locked screen may stop them entirely, so counting ticks under-reports a
   real reading session by most of its length. What is stored while the clock
   runs is the MOMENT IT STARTED, and elapsed time is always `now - started`.
   The interval exists only to make the digits on screen change; if it fires
   twice in an hour the total is still right.

   AND IT IS STORED OUTSIDE REACT. A running clock in component state dies on
   a refresh, on a route change that unmounts Home, and on the tab eviction iOS
   performs on any backgrounded page it feels like. localStorage survives all
   three, so a reader who starts the clock, reads for an hour with the phone in
   their pocket, and comes back to a cold-started app finds it still running
   with the right number on it.

   ONE CLOCK AT A TIME. Not one per book — a person reads one book at a time,
   and a UI in which two timers can run at once is a UI in which one of them is
   forgotten and records a nine-hour sitting overnight. Starting a second book
   stops the first and keeps it.

   NOTHING UNDER A MINUTE IS WRITTEN. A clock started and stopped by accident
   is not a reading session, and a book page listing "0m, 0m, 3m, 0m" makes the
   real sittings harder to see rather than the record more complete. */

import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import db, { type Sitting } from './db'

const RUNNING_KEY = 'flyleaf-sitting'

/** Below this, a sitting is a mis-tap and is thrown away rather than written. */
export const SHORTEST = 60

/** The clock that is running right now, if one is. */
export interface Running {
  bookId: number
  /** Epoch ms. Everything on screen is derived from this and `Date.now()`. */
  startedAt: number
}

/* Same-tab listeners. `storage` only fires in OTHER tabs, so a component in
   this one would never hear its own write — the timer would start and the
   button would not change. */
const CHANGED = 'flyleaf-sitting-changed'

function announce() {
  window.dispatchEvent(new Event(CHANGED))
}

export function readRunning(): Running | null {
  try {
    const raw = localStorage.getItem(RUNNING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Running>
    if (typeof parsed?.bookId !== 'number' || typeof parsed?.startedAt !== 'number') return null
    /* A start time in the future means the device clock moved backwards
       between starting and now — a timezone change, a manual correction, an
       NTP sync. Elapsed would come out negative and the digits would count
       up from minus something. There is no honest number to show, so the
       clock is dropped rather than shown lying. */
    if (parsed.startedAt > Date.now()) return null
    return { bookId: parsed.bookId, startedAt: parsed.startedAt }
  } catch {
    return null
  }
}

function writeRunning(running: Running | null) {
  try {
    if (running) localStorage.setItem(RUNNING_KEY, JSON.stringify(running))
    else localStorage.removeItem(RUNNING_KEY)
  } catch {
    /* Private mode with no storage. The clock still runs for as long as the
       page lives; it just will not survive a refresh. Better than refusing
       to start. */
  }
  announce()
}

/** Whole seconds elapsed, from the wall clock. */
export function elapsed(running: Running, now = Date.now()): number {
  return Math.max(0, Math.floor((now - running.startedAt) / 1000))
}

/** Start the clock on a book, keeping whatever was already running. */
export async function startSitting(bookId: number) {
  const already = readRunning()
  if (already) {
    if (already.bookId === bookId) return
    await stopSitting()
  }
  writeRunning({ bookId, startedAt: Date.now() })
}

/** Stop the clock and keep the sitting. Returns the seconds kept, or 0 if it
    was too short to be worth a row. */
export async function stopSitting(): Promise<number> {
  const running = readRunning()
  if (!running) return 0
  const seconds = elapsed(running)
  writeRunning(null)
  if (seconds < SHORTEST) return 0
  await db.sittings.add({
    bookId: running.bookId,
    startedAt: running.startedAt,
    seconds,
    // The day it STARTED — see the note on `Sitting.keptOn`.
    keptOn: dayOf(running.startedAt),
  } as Sitting)
  return seconds
}

/** Throw the running clock away without keeping anything. */
export function discardSitting() {
  writeRunning(null)
}

/** Delete a sitting, and hand back the way to put it there again.

    Same shape as `removeKeep`: a clock left running overnight writes a nine-
    hour lie into the record, and there has to be a way to take it out — but
    the reader should be able to look at what happened before deciding it was a
    mistake, which is an undo rather than a confirmation dialog. */
export async function removeSitting(sitting: Sitting) {
  await db.sittings.delete(sitting.id)
  return async function restore() {
    await db.sittings.put(sitting)
  }
}

/** Local yyyy-mm-dd. Not `toISOString().slice(0, 10)`, which is UTC and puts
    a nine-in-the-evening sitting west of Greenwich on tomorrow's date. */
function dayOf(at: number): string {
  const date = new Date(at)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** The running clock, and the seconds on it, ticking once a second.

    The tick is only for the digits. See the note at the top: the number itself
    is recomputed from `startedAt` every time, so a throttled or suspended
    interval costs accuracy on screen for a moment and costs the record
    nothing. */
export function useRunning(): { running: Running | null; seconds: number } {
  const [running, setRunning] = useState<Running | null>(readRunning)
  const [seconds, setSeconds] = useState(() => {
    const now = readRunning()
    return now ? elapsed(now) : 0
  })

  useEffect(() => {
    const sync = () => {
      const next = readRunning()
      setRunning(next)
      setSeconds(next ? elapsed(next) : 0)
    }
    window.addEventListener(CHANGED, sync)
    // Another tab of the same app. Rare, but a reader with the book page open
    // on a laptop and Home open on a phone is exactly our reader.
    window.addEventListener('storage', sync)
    // Coming back from a locked screen or another app, where the interval has
    // been throttled to nothing. This is what makes the digits right again the
    // instant the reader looks at them.
    document.addEventListener('visibilitychange', sync)
    return () => {
      window.removeEventListener(CHANGED, sync)
      window.removeEventListener('storage', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setSeconds(elapsed(running)), 1000)
    return () => window.clearInterval(id)
  }, [running])

  return { running, seconds }
}

/** Every sitting on one book, newest first. */
export function useSittings(bookId: number | undefined): Sitting[] | undefined {
  return useLiveQuery(
    () =>
      bookId === undefined
        ? Promise.resolve<Sitting[]>([])
        : db.sittings.where('[bookId+startedAt]').between([bookId, 0], [bookId, Infinity]).reverse().toArray(),
    [bookId],
  )
}

/** Total seconds on the clock for one book. `undefined` while it loads, so a
    caller can tell "nothing yet" from "not yet known" and avoid printing a
    zero that is about to become four hours. */
export function useReadingTime(bookId: number | undefined): number | undefined {
  const sittings = useSittings(bookId)
  if (!sittings) return undefined
  return sittings.reduce((total, sit) => total + sit.seconds, 0)
}

/* ── saying it in words ───────────────────────────────────────────────────
   Two formatters, because a running clock and a finished total are read
   differently. The clock is watched, so it wants fixed-width digits that do
   not change shape as they climb. A total is read once in a sentence, so it
   wants "3h 40m" — nobody wants to be told they have read a book for
   "03:40:12". */

/** A running clock: m:ss under an hour, h:mm:ss over it. */
export function onTheClock(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`
}

/** A finished stretch, in words: "48m", "1h 05m", "12h". */
export function inWords(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  // 59m 45s rounds to 60 minutes, and "1h 60m" is not a thing anyone writes.
  if (minutes === 60) return `${hours + 1}h`
  if (hours === 0) return `${Math.max(1, minutes)}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

/** The hour a sitting began — "9:40 pm", in whatever the device calls that.
    Deliberately not hard-formatted: a reader on a 24-hour clock should be told
    "21:40", and the browser already knows which of the two they use. */
export function atClock(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** "6 sittings" / "one sitting". Its own function because it is said in three
    places and getting the singular wrong in one of them is the kind of thing
    that makes an app feel machine-written. */
export function countedSittings(n: number): string {
  return n === 1 ? 'one sitting' : `${n} sittings`
}

/** Every sitting on every book, newest first — the whole log.

    The rows are five small fields each; a year of daily reading is a few
    hundred of them, so a full read-and-sort is cheaper than maintaining a
    second index for it. */
export function useAllSittings(): Sitting[] | undefined {
  return useLiveQuery(
    () => db.sittings.toArray().then((rows) => rows.sort((a, b) => b.startedAt - a.startedAt)),
    [],
  )
}
