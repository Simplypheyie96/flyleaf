import { useEffect, useRef, useState } from 'react'
import LeafButton from '../components/LeafButton'
import PaperSurface from '../components/PaperSurface'
import { getHandle, hasMet, markMet, setHandle } from '../data/reader'
import styles from './onboarding.module.css'

/* The first thirty seconds.

   Two panels and a way out of both. 09 asks that a reader claim a handle
   before entering, and that login never be forced; 07 asks that the welcome
   be warm and skippable rather than instructional. So: one panel that says
   what this is, one that asks what to call you, and Skip on the second. No
   account, no email, no password, nothing sent anywhere.

   Google sign-in is where 09 puts it — right here, optional — but it is not
   offered yet, because offering a button that cannot sign anyone in is worse
   than not offering it. The sentence under the field is the honest version of
   the same promise: nothing leaves the device, and Settings is where a copy
   gets made.

   IT SHOWS ONCE. `hasMet` is written on the way out whichever door is used,
   so a reader who skips is not asked again on the next launch. */

function Welcome() {
  const [open, setOpen] = useState(() => !hasMet())
  const [panel, setPanel] = useState<0 | 1>(0)
  const [name, setName] = useState(getHandle)
  const field = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (panel === 1) field.current?.focus()
  }, [panel])

  if (!open) return null

  function leave(withName: string) {
    if (withName.trim()) setHandle(withName)
    markMet()
    setOpen(false)
  }

  return (
    <div className={styles.welcome} role="dialog" aria-modal="true" aria-label="Welcome to Flyleaf">
      <div className={styles.welcomeInner}>
        <img className={styles.mark} src="/leaf-icon.svg" alt="" />

        {panel === 0 ? (
          <PaperSurface taped rotate={-0.6} className={styles.panel}>
            <h1 className={styles.big}>A flyleaf is the blank page at the front of a book.</h1>
            <p className={styles.lede}>
              People used to write their name there, and the date, and what they
              thought of it. This is that page — for every book you read, and
              everything you want to keep from it.
            </p>
            <div className={styles.acts}>
              <LeafButton onClick={() => setPanel(1)}>Start my page</LeafButton>
            </div>
          </PaperSurface>
        ) : (
          <PaperSurface taped rotate={0.4} className={styles.panel}>
            <h1 className={styles.big}>What should we call you?</h1>
            <p className={styles.lede}>
              Only so the app can greet you by name, and so an exported journey
              knows whose it is.
            </p>
            <input
              ref={field}
              type="text"
              className={styles.field}
              value={name}
              placeholder="Your name"
              aria-label="What should we call you"
              maxLength={32}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && leave(name)}
            />
            <p className={styles.fine}>
              No account, no password, nothing sent anywhere. Your memories stay
              on this device unless you save a copy of them yourself.
            </p>
            <div className={styles.acts}>
              <LeafButton onClick={() => leave(name)}>Begin</LeafButton>
              <button type="button" className={styles.skip} onClick={() => leave('')}>
                Skip
              </button>
            </div>
          </PaperSurface>
        )}
      </div>
    </div>
  )
}

export default Welcome
