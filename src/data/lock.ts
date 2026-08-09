/* A lock on the journal, and an honest account of what it is.

   WHAT IT DOES. Flyleaf is a diary. Before this, anybody holding an unlocked
   phone could open it and read every line the owner had ever written, and there
   was nothing anywhere in the app to stop them. This is the thing that stops
   them: a code, asked for when the app opens, and again when it has been put
   away for a few minutes.

   WHAT IT DOES NOT DO, SAID PLAINLY SO THE COPY CAN SAY IT TOO. The journal is
   not encrypted. It sits in the browser's own database, and somebody who knows
   how to open developer tools on an unlocked device can still read it without
   ever meeting this screen. That is not laziness, it is a choice made with the
   owner: encrypting it properly means the code becomes the only key, and a
   forgotten code would then destroy years of reading with no way back — no
   reset, no recovery email, because Flyleaf has no server and holds nothing.
   For a reading journal that trade is the wrong way round. So this lock is
   built to stop a person, not a laboratory, and the app never claims otherwise.

   WHY THE CODE IS STILL HASHED. It buys one real thing even so: the code itself
   never sits in storage in a form that can be read back. People reuse codes —
   the four digits guarding this journal are quite possibly the four digits
   guarding the phone — and leaking THAT would be a harm well beyond anything in
   the journal. PBKDF2 with a per-device salt, so what is stored is useless
   somewhere else.

   THE WAY BACK IN, WHICH IS THE WHOLE DESIGN. A "forgot my code" button that
   simply opens the app is not a lock at all; the person snooping presses it
   too. But the alternative — no way back — loses the journal. So the reset
   keeps everything and costs a DAY. Ask for it, and the lock opens twenty-four
   hours later; until it does, Flyleaf shows the request on the lock screen
   where the owner cannot miss it, and one press cancels it. Somebody snooping
   will not sit on a phone for a day with the owner able to see the request and
   cancel it. The owner will wait a day.

   And a reader who has turned on sync skips the wait: their Google account is
   real proof of who they are, so signing in clears the lock at once. That is
   why turning the lock on asks for a way back first — see canRecover(). */

import { optedIn } from './google'

const CODE_KEY = 'flyleaf-lock'
const RESET_KEY = 'flyleaf-lock-reset'
const TRIES_KEY = 'flyleaf-lock-tries'

/** Minimum digits. Four is the phone-lock convention and the most anybody will
    actually keep; the field allows more for those who want more. */
export const CODE_MIN = 4
export const CODE_MAX = 12

/** How long a reset takes. A day is long enough that nobody borrows the phone
    for it, and short enough that the owner is not locked out of their own
    reading for a week. */
export const RESET_WAIT = 86_400_000

/* Failed tries are slowed rather than capped. A cap means a snoop can lock the
   owner out of their own journal for good by guessing wrong on purpose, which
   turns a security feature into a way to vandalise somebody's diary. Growing
   delays cost a guesser everything and cost the owner, who gets it right on the
   second go, essentially nothing. */
const FREE_TRIES = 4
const STEP = 15_000
const MAX_WAIT = 600_000

interface Stored {
  salt: string
  hash: string
  /** The reader's own words, shown after a few wrong tries. Optional, and never
      the code itself — the field warns about that. */
  hint?: string
}

interface Tries {
  count: number
  /** When the next attempt is allowed. */
  until: number
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* Private mode. The lock cannot be remembered, which means it cannot be
       set — isLocked() reads the same empty storage and reports no lock, so the
       app stays usable rather than becoming a door with no key. */
  }
  window.dispatchEvent(new Event('flyleaf-lock'))
}

const bytes = (n: number) => crypto.getRandomValues(new Uint8Array(n))
const toBase64 = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b)))

/* PBKDF2-SHA256. The iteration count is chosen against a phone rather than a
   laptop: high enough to make guessing a four-digit code tedious, low enough
   that unlocking does not feel like waiting. */
async function derive(code: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(code),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: Uint8Array.from(atob(salt), (c) => c.charCodeAt(0)),
      iterations: 210_000,
      hash: 'SHA-256',
    },
    key,
    256,
  )
  return toBase64(bits)
}

/** True when this device has a code on it. */
export function isLockSet(): boolean {
  return read<Stored>(CODE_KEY) !== null
}

/* ── Carrying the lock between a reader's own devices ───────────────────────

   THE CODE ITSELF NEVER TRAVELS, and cannot: what is stored is a salt and a
   PBKDF2 hash, and a hash is not reversible into four digits. So a journey
   file — and therefore a sync — carries the door, never the key.

   It carries at all because the owner found the hole by using it: she put a
   code on her journal, opened the same journal on a laptop, and it let her
   straight in. A lock that guards one device and not the copy of the same
   reading on the next one is a lock in name only.

   ARRIVING IS ONE-WAY, and this is the line that keeps it safe. A lock coming
   down from Drive is only ever taken by a device that has no lock of its own.
   It cannot replace a code already set here, because that would let an old
   file — or a device the reader had already changed the code on — quietly
   restore a code they had moved on from and lock them out of their own
   journal. Taking a lock OFF is likewise a local act: it is done on a device,
   and the next sync does not push the removal, so the other devices keep
   asking until they are told to stop in the same deliberate way. */

/** The lock as it travels: exactly what is stored, or nothing when there is
    no lock to carry. */
export function packLock(): Stored | undefined {
  return read<Stored>(CODE_KEY) ?? undefined
}

/** Take a lock arriving from another device, and only when this one is open. */
export function unpackLock(lock: Stored | undefined) {
  if (!lock?.salt || !lock.hash || isLockSet()) return
  write(CODE_KEY, lock)
}

export function getHint(): string {
  return read<Stored>(CODE_KEY)?.hint ?? ''
}

/** Set or replace the code. The caller has already checked the old one, or
    there was none to check. */
export async function setCode(code: string, hint?: string) {
  const salt = toBase64(bytes(16))
  const hash = await derive(code, salt)
  const trimmed = hint?.trim().slice(0, 60)
  write(CODE_KEY, { salt, hash, ...(trimmed ? { hint: trimmed } : {}) } satisfies Stored)
  write(TRIES_KEY, null)
  write(RESET_KEY, null)
}

/** Take the lock off. Everything the reader has written stays exactly where it
    is — this removes a door, not a room. */
export function clearLock() {
  write(CODE_KEY, null)
  write(TRIES_KEY, null)
  write(RESET_KEY, null)
}

/** Milliseconds until another try is allowed; 0 when one is allowed now. */
export function waitingFor(): number {
  const tries = read<Tries>(TRIES_KEY)
  if (!tries) return 0
  return Math.max(0, tries.until - Date.now())
}

/** How many wrong answers this device has seen in a row. Drives whether the
    hint is offered yet. */
export function wrongTries(): number {
  return read<Tries>(TRIES_KEY)?.count ?? 0
}

/** Check a code. Records the failure and its penalty when it is wrong, and
    forgets the whole history when it is right. */
export async function verify(code: string): Promise<boolean> {
  const stored = read<Stored>(CODE_KEY)
  if (!stored) return true
  if (waitingFor() > 0) return false

  const ok = (await derive(code, stored.salt)) === stored.hash

  if (ok) {
    write(TRIES_KEY, null)
    return true
  }

  const count = wrongTries() + 1
  const penalty = count <= FREE_TRIES ? 0 : Math.min(MAX_WAIT, (count - FREE_TRIES) * STEP)
  write(TRIES_KEY, { count, until: Date.now() + penalty } satisfies Tries)
  return false
}

/* ── The way back in ────────────────────────────────────────────────────── */

/** When a pending reset will open the lock, or 0 when none was asked for. */
export function resetAt(): number {
  return read<{ at: number }>(RESET_KEY)?.at ?? 0
}

/** True once the day has passed and the lock will open without the code. */
export function resetReady(): boolean {
  const at = resetAt()
  return at > 0 && Date.now() >= at
}

export function askReset() {
  write(RESET_KEY, { at: Date.now() + RESET_WAIT })
}

/** Called by the owner from the lock screen when they see a request they did
    not make — the thing that makes the wait worth anything. */
export function cancelReset() {
  write(RESET_KEY, null)
}

/** Whether the reader has a route back that does not depend on remembering the
    code. Sync is one: their Google account proves who they are, so signing in
    clears the lock at once rather than after a day. Turning the lock on does
    not REQUIRE this — the day-long reset is a route back on its own — but the
    setup copy says which of the two they are relying on. */
export function canRecover(): boolean {
  return optedIn()
}

/* ── Whether the app is open right now ──────────────────────────────────── */

/* Deliberately in memory and nowhere else. A flag in storage saying "already
   unlocked" is a flag somebody can set; a reload always asks again, which is
   also what anyone expects of a lock. */
let open = false

/** True when the reader may see their journal: either there is no lock, or
    they have already answered it in this session. */
export function isOpen(): boolean {
  return !isLockSet() || open
}

export function markOpen() {
  open = true
  window.dispatchEvent(new Event('flyleaf-lock'))
}

/** Shut it again — on purpose from Settings, or by the idle rule below. */
export function shut() {
  open = false
  window.dispatchEvent(new Event('flyleaf-lock'))
}

/* How long the app may sit hidden before it asks again. Short enough that a
   phone put down on a table is protected, long enough that switching to the
   browser to look up a book title and coming straight back does not demand the
   code. */
const IDLE = 120_000

/** Re-lock after the app has been away a while. Started once, from main. */
export function watchIdle() {
  let left = 0
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      left = Date.now()
      return
    }
    if (left && Date.now() - left > IDLE) shut()
    left = 0
  })
}
