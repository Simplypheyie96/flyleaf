import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import LeafButton from './LeafButton'
import PaperSurface from './PaperSurface'
import Wordmark from '../brand/Wordmark'
import {
  askReset,
  cancelReset,
  clearLock,
  getHint,
  isLockSet,
  isOpen,
  markOpen,
  resetAt,
  resetReady,
  verify,
  waitingFor,
  wrongTries,
} from '../data/lock'
import { optedIn, signIn } from '../data/google'
import styles from './LockScreen.module.css'

/* The door, and it is the app's own sky rather than a scrim.

   Same treatment as the welcome, for the same reason: there is nothing behind
   this worth showing through, and a dimmed shelf would imply there is — the
   whole point is that the journal is not on screen. A reader who locked their
   diary should not be able to read the first line of it through a blur.

   The lock screen carries the reset request rather than hiding it in Settings,
   and that placement is the security. A day-long wait only protects anybody if
   the owner cannot help seeing that a wait has begun; here it is the first
   thing on the screen, above the field, with Cancel beside it. Somebody who
   borrowed the phone and asked for a reset has left a note saying so.

   No keypad drawn in HTML. `inputMode="numeric"` brings the phone's own number
   pad up against a field the reader already knows how to use, at the size their
   own operating system chose, with their own haptics — a hand-drawn grid of
   twelve buttons would be a worse copy of that, and would strand every desktop
   reader, who simply types. */

function minutes(ms: number) {
  const secs = Math.ceil(ms / 1000)
  if (secs < 60) return `${secs} seconds`
  const mins = Math.ceil(secs / 60)
  return `${mins} ${mins === 1 ? 'minute' : 'minutes'}`
}

function hours(at: number) {
  const left = at - Date.now()
  if (left <= 0) return 'now'
  const hrs = Math.ceil(left / 3_600_000)
  if (hrs <= 1) return 'within the hour'
  return `in about ${hrs} hours`
}

function LockScreen() {
  const [shut, setShut] = useState(() => !isOpen())
  const [code, setCode] = useState('')
  const [wrong, setWrong] = useState(false)
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(waitingFor)
  const [asking, setAsking] = useState(false)
  const [pending, setPending] = useState(resetAt)
  const field = useRef<HTMLInputElement>(null)

  /* The lock closes from elsewhere — the idle watcher in data/lock, or the
     "Lock now" row in Settings — so this listens rather than owning the state. */
  useEffect(() => {
    const refresh = () => {
      setShut(!isOpen())
      setPending(resetAt())
    }
    window.addEventListener('flyleaf-lock', refresh)
    return () => window.removeEventListener('flyleaf-lock', refresh)
  }, [])

  /* Ticks only while a penalty is actually running, and stops the moment it
     ends. A once-a-second timer for the whole life of the app, to update a
     number that is almost never on screen, is a waste of a phone's battery. */
  useEffect(() => {
    if (!shut) return
    const id = setInterval(() => {
      setWait(waitingFor())
      if (resetReady()) setPending(resetAt())
    }, 1000)
    return () => clearInterval(id)
  }, [shut])

  useEffect(() => {
    if (shut) field.current?.focus()
  }, [shut])

  /* Painting a panel over the app is not the same as shutting it. Everything
     behind this is still in the document: on a desktop the Tab key walks
     straight past the lock into the shelf, a screen reader reads the book
     titles underneath, and browser find-in-page finds the reader's own notes.
     `inert` on the app root takes the whole thing out of the tab order, out of
     the accessibility tree and out of find-in-page in one attribute, which is
     the only version of this that is actually shut.

     That is also why the door itself is portalled onto <body>: it has to be
     OUTSIDE the thing being made inert, or it would disable itself. */
  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return
    root.inert = shut
    /* The body cannot scroll behind the door either — on a phone the shelf
       still scrolls under an overlay otherwise, and a locked journal that
       moves when you drag it is showing you it is there. */
    const previous = document.body.style.overflow
    document.body.style.overflow = shut ? 'hidden' : previous
    return () => {
      root.inert = false
      document.body.style.overflow = previous
    }
  }, [shut])

  if (!shut) return null

  async function unlock(event: React.FormEvent) {
    event.preventDefault()
    if (busy || wait > 0) return
    setBusy(true)
    /* Trimmed, because a keyboard can hand us a space the reader never meant
       to type — iOS inserts one after an autocorrected word, and a wireless
       keyboard's spacebar is next to nothing at all. A code that is right
       except for an invisible character reads to the reader as a lock that
       refused a code they know is correct. */
    const ok = await verify(code.trim())
    setBusy(false)
    if (ok) {
      setCode('')
      setWrong(false)
      markOpen()
      return
    }
    setWrong(true)
    setWait(waitingFor())
    setCode('')
    field.current?.focus()
  }

  /* The day is up. Everything the reader wrote is still here — the lock comes
     off, the journal does not. */
  function openAnyway() {
    clearLock()
    markOpen()
  }

  /* Sync is on, so the reader has a Google account attached to this journey,
     and Google confirming who they are is proof enough to skip the wait. It has
     to be real: a failed sign-in leaves the lock exactly where it was. */
  async function proveWithGoogle() {
    setBusy(true)
    try {
      await signIn()
      clearLock()
      markOpen()
    } catch {
      setWrong(true)
    } finally {
      setBusy(false)
    }
  }

  const hint = getHint()
  const showHint = hint && wrongTries() >= 2
  const ready = resetReady()

  return createPortal(
    <div className={styles.lock} role="dialog" aria-modal="true" aria-label="Flyleaf is locked">
      <div className={styles.inner}>
        <Wordmark size={36} className={styles.mark} title="Flyleaf" />

        {/* Above everything, because a reset nobody notices protects nobody. */}
        {pending > 0 && !ready && (
          <PaperSurface className={styles.notice}>
            <p className={styles.noticeText}>
              Someone asked to open this journal without the code. It will open{' '}
              {hours(pending)}.
            </p>
            <button
              type="button"
              className={styles.plain}
              onClick={() => {
                cancelReset()
                setPending(0)
              }}
            >
              That wasn’t me — cancel it
            </button>
          </PaperSurface>
        )}

        <PaperSurface className={styles.panel}>
          {ready ? (
            <>
              <h1 className={styles.title}>Your journal is ready to open</h1>
              <p className={styles.body}>
                The day has passed. Opening it takes the lock off and leaves
                everything you have written exactly where it is.
              </p>
              <LeafButton onClick={openAnyway}>Open my journal</LeafButton>
              <button
                type="button"
                className={styles.plain}
                onClick={() => {
                  cancelReset()
                  setPending(0)
                }}
              >
                I remembered it — keep the lock on
              </button>
            </>
          ) : (
            <form className={styles.form} onSubmit={unlock}>
              <h1 className={styles.title}>Your code</h1>

              <label className={styles.away} htmlFor="lock-code">
                Your journal code
              </label>
              {/* NOT `type="password"`, and the dots come from CSS instead.

                  iOS Safari ignores `inputMode` on a password field and brings
                  up the full alphabetic keyboard, so a reader with a four-digit
                  code was typing digits off the tiny top row of a QWERTY
                  keyboard — which is exactly how a code that is known gets
                  entered wrong two or three times before it goes in. As a text
                  field the number pad appears, and `-webkit-text-security`
                  hides the characters just the same.

                  Only disabled while a penalty is actually running. Disabling
                  it for the moment the hash is computed took the keyboard down
                  and the focus with it on every single attempt, so each retry
                  began with a tap to get the field back. */}
              <input
                id="lock-code"
                ref={field}
                type="text"
                className={styles.code}
                inputMode="numeric"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={code}
                readOnly={busy}
                disabled={wait > 0}
                onChange={(e) => {
                  setCode(e.target.value)
                  setWrong(false)
                }}
              />

              {/* One live region for whatever the screen currently has to say,
                  so a screen reader hears the wait, the wrong code or the hint
                  once rather than hearing three regions compete. */}
              <p className={styles.status} data-tone={wrong ? 'bad' : undefined} role="status">
                {wait > 0
                  ? `Too many tries. Try again in ${minutes(wait)}.`
                  : wrong
                    ? 'That is not the code.'
                    : showHint
                      ? `Your hint: ${hint}`
                      : ' '}
              </p>

              <LeafButton type="submit" disabled={busy || wait > 0 || code.length === 0}>
                {busy ? 'Opening…' : 'Open'}
              </LeafButton>

              {optedIn() ? (
                <button
                  type="button"
                  className={styles.plain}
                  disabled={busy}
                  onClick={proveWithGoogle}
                >
                  Forgot it? Sign in with Google
                </button>
              ) : pending > 0 ? null : asking ? (
                <div className={styles.ask}>
                  <p className={styles.body}>
                    Flyleaf will open this journal in a day, with everything
                    still in it. Until then it says so on this screen, so you can
                    stop it if it wasn’t you who asked.
                  </p>
                  <LeafButton
                    onClick={() => {
                      askReset()
                      setPending(resetAt())
                      setAsking(false)
                    }}
                  >
                    Start the day
                  </LeafButton>
                  <button type="button" className={styles.plain} onClick={() => setAsking(false)}>
                    Never mind
                  </button>
                </div>
              ) : (
                <button type="button" className={styles.plain} onClick={() => setAsking(true)}>
                  I’ve forgotten my code
                </button>
              )}
            </form>
          )}
        </PaperSurface>
      </div>
    </div>,
    document.body,
  )
}

/** Rendered by App above everything. Returns nothing at all when this device
    has no lock on it, which is every device by default. */
export default function Lock() {
  const [any, setAny] = useState(isLockSet)
  useEffect(() => {
    const refresh = () => setAny(isLockSet())
    window.addEventListener('flyleaf-lock', refresh)
    return () => window.removeEventListener('flyleaf-lock', refresh)
  }, [])
  if (!any) return null
  return <LockScreen />
}
