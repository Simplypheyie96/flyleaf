import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Row } from './Group'
import {
  CODE_MAX,
  CODE_MIN,
  canRecover,
  clearLock,
  getHint,
  isLockSet,
  setCode as saveCode,
  shut,
  verify,
} from '../data/lock'
import styles from './settings.module.css'

/* Turning the lock on, changing it, and taking it off.

   It lives in "Your journey" beside the rows about where that journey is kept,
   because that is the subject: this one says who may read it. Not in "You" —
   the name and the face are how the app addresses the reader, which is a
   different question from who is allowed through the door.

   THE FOLD DOES THE SAFETY WORK, the same way it does on Erase. A code is set
   by opening a row on purpose and typing the same thing twice, so it cannot be
   set by a mis-tap, and it cannot be set to something the reader typed once and
   misread. Taking it off asks for the current code first, because a lock a
   passer-by can remove from the settings page of an unlocked app is not a lock.

   THE HINT IS OPTIONAL AND ITS WARNING IS NOT DECORATION. It appears on the
   lock screen after two wrong tries, which means it appears to whoever is
   holding the phone. "It's 1994" is not a hint, it is the code.

   THE ROW ONCE CARRIED A SENTENCE SAYING THIS IS NOT ENCRYPTION and it has
   been deleted (owner's call). It was true and it was useless: a reader
   deciding whether to keep their sister out of their reading journal cannot do
   anything with a threat model, and being handed one in a settings row reads
   as the app apologising for itself. The honest version of that sentence is
   the promise this row already makes — it stops someone picking up your phone
   — and that promise is kept. Do not put it back. */

function Key() {
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
      <circle cx="8" cy="14" r="4" />
      <path d="M11 11.5 19 4" />
      <path d="M16.5 6.5 18.5 8.5" />
    </svg>
  )
}

type Note = { tone: 'good' | 'bad'; text: string } | null

function LockCard() {
  const [on, setOn] = useState(isLockSet)
  const [open, setOpen] = useState(false)
  const [old, setOld] = useState('')
  const [code, setCode] = useState('')
  const [again, setAgain] = useState('')
  const [hint, setHint] = useState(getHint)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<Note>(null)

  /* Open on arrival when the lock notice sent the reader here. Somebody who
     tapped "Set a code" has already agreed to the thing; making them hunt for
     the row and unfold it is the app asking twice.

     Watched through the router's own search params rather than read once from
     window.location: the notice appears ON Settings as often as anywhere else,
     so the address changes underneath a card that is already mounted and never
     re-runs its initial state. The first version read the URL in a useState
     initialiser and did nothing at all in exactly the common case. */
  const [params] = useSearchParams()
  useEffect(() => {
    if (params.get('open') === 'lock') setOpen(true)
  }, [params])

  useEffect(() => {
    const refresh = () => {
      setOn(isLockSet())
      setHint(getHint())
    }
    window.addEventListener('flyleaf-lock', refresh)
    return () => window.removeEventListener('flyleaf-lock', refresh)
  }, [])

  function fold() {
    const next = !open
    setOpen(next)
    /* Never leave a half-typed code sitting in a shut row. */
    if (!next) {
      setOld('')
      setCode('')
      setAgain('')
      setNote(null)
    }
  }

  const digits = code.trim()
  const long = digits.length >= CODE_MIN && digits.length <= CODE_MAX
  const matches = digits.length > 0 && digits === again.trim()
  const armed = long && matches && !busy && (!on || old.trim().length > 0)

  async function save() {
    setBusy(true)
    setNote(null)
    try {
      if (on && !(await verify(old.trim()))) {
        setNote({ tone: 'bad', text: 'That is not your current code.' })
        return
      }
      await saveCode(digits, hint)
      setOld('')
      setCode('')
      setAgain('')
      setOpen(false)
      setNote({ tone: 'good', text: on ? 'Your code has changed.' : 'Your journal is locked.' })
    } catch {
      setNote({ tone: 'bad', text: 'That did not save. Nothing has changed.' })
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setNote(null)
    try {
      if (!(await verify(old.trim()))) {
        setNote({ tone: 'bad', text: 'That is not your current code.' })
        return
      }
      clearLock()
      setOld('')
      setOpen(false)
      setNote({ tone: 'good', text: 'The lock is off. Everything you wrote is still here.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Row title={on ? 'Change your code' : 'Lock this journal'} open={open} onFold={fold}>
        <div className={styles.eraseBox}>
          {on ? (
            <p className={styles.note}>
              Flyleaf asks for this code when it opens, and again after it has
              been put away for a couple of minutes.
            </p>
          ) : (
            <p className={styles.note}>
              A code, asked for when Flyleaf opens. It stops someone picking up
              your phone and reading your journal.
            </p>
          )}

          <p className={styles.fine}>
            {canRecover()
              ? 'Forget it and you can sign in with Google to take it off at once, with everything still in it.'
              : 'Forget it and Flyleaf will open the journal for you after a day, with everything still in it. Turn on syncing above and it comes off straight away instead.'}
          </p>

          {on && (
            <>
              <label className={styles.eraseAsk} htmlFor="lock-old">
                Your current code
              </label>
              <input
                id="lock-old"
                type="password"
                className={styles.field}
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                value={old}
                disabled={busy}
                onChange={(e) => setOld(e.target.value)}
              />
            </>
          )}

          <label className={styles.eraseAsk} htmlFor="lock-new">
            {on ? 'A new code' : 'A code'} — at least {CODE_MIN} digits
          </label>
          <input
            id="lock-new"
            type="password"
            className={styles.field}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            maxLength={CODE_MAX}
            value={code}
            disabled={busy}
            onChange={(e) => setCode(e.target.value)}
          />

          <label className={styles.eraseAsk} htmlFor="lock-again">
            Type it once more
          </label>
          <input
            id="lock-again"
            type="password"
            className={styles.field}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            maxLength={CODE_MAX}
            value={again}
            disabled={busy}
            onChange={(e) => setAgain(e.target.value)}
          />

          {/* Said only once the second field has something in it, so a reader
              is not told they got it wrong before they have finished. */}
          {again.trim().length > 0 && !matches && (
            <p className={styles.note} data-tone="bad" role="status">
              Those two do not match.
            </p>
          )}

          <label className={styles.eraseAsk} htmlFor="lock-hint">
            A hint, if you want one
          </label>
          <input
            id="lock-hint"
            type="text"
            className={styles.field}
            autoComplete="off"
            maxLength={60}
            placeholder="Shown after two wrong tries"
            value={hint}
            disabled={busy}
            onChange={(e) => setHint(e.target.value)}
          />
          <p className={styles.fine}>
            Whoever is holding your phone will read this hint, so make it mean
            something to you and nothing to them.
          </p>

          <button type="button" className={styles.action} disabled={!armed} onClick={save}>
            {busy ? 'Saving…' : on ? 'Change my code' : 'Lock my journal'}
            <span className={styles.mark}>
              <Key />
            </span>
          </button>

          {on && (
            <button
              type="button"
              className={`${styles.action} ${styles.danger}`}
              disabled={busy || old.trim().length === 0}
              onClick={remove}
            >
              Take the lock off
            </button>
          )}
        </div>
      </Row>

      {/* Only once there is a lock to use. Its own row rather than something
          inside the fold: locking up is a thing a reader does in a hurry,
          often because somebody just walked in, and it should be one tap from
          the top of the card rather than three inside an open tray. */}
      {on && (
        <button type="button" className={styles.action} onClick={shut}>
          Lock it now
          <span className={styles.mark}>
            <Key />
          </span>
        </button>
      )}

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

export default LockCard
