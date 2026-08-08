import { useEffect, useRef, useState } from 'react'
import Guide from './Guide'
import LeafButton from '../components/LeafButton'
import PaperSurface from '../components/PaperSurface'
import Wordmark from '../brand/Wordmark'
import { FacePicker } from '../components/Face'
import { getFace, getHandle, hasMet, markMet, setFace, setHandle } from '../data/reader'
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
  const [panel, setPanel] = useState<0 | 1 | 2>(0)
  const [name, setName] = useState(getHandle)
  const [face, setPickedFace] = useState(getFace)
  const field = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (panel === 1) field.current?.focus()
  }, [panel])

  if (!open) return null

  /* Begin does not leave any more — it saves the name and face, then walks
     into the tour (see Guide.tsx), so the guide runs BEFORE the reader ever
     sees Home. Skip still leaves directly: someone declining to give a name
     is someone declining the ceremony, and holding them through four more
     cards would be the opposite of a welcome. */
  function begin(withName: string) {
    if (withName.trim()) setHandle(withName)
    setFace(face)
    setPanel(2)
  }

  function finish() {
    markMet()
    setOpen(false)
  }

  function leave(withName: string) {
    if (withName.trim()) setHandle(withName)
    setFace(face)
    markMet()
    setOpen(false)
  }

  return (
    <div className={styles.welcome} role="dialog" aria-modal="true" aria-label="Welcome to Flyleaf">
      <div className={styles.welcomeInner}>
        {/* The mark drawn in tokens, not the install icon: that file is a
            sky-blue tile, and a sky-blue tile on the sky is a square of
            nothing. Here the name is beside it, so this is the one place the
            app writes its own name on a screen. */}
        <Wordmark size={40} className={styles.mark} title="Flyleaf" />

        {panel === 2 ? (
          <Guide onDone={finish} />
        ) : panel === 0 ? (
          <PaperSurface taped rotate={-0.6} className={styles.panel}>
            {/* Plain words, owner's orders. The first cut of this panel opened
                with the history of the word "flyleaf", and her review was
                blunt: who will make sense of that? Say what the app is and
                what it does — the poetry can live inside the app, not on the
                door. */}
            <h1 className={styles.big}>A private journal for the books you read.</h1>
            <p className={styles.lede}>
              Save what each book leaves you with — the lines you loved, your
              notes, voice memos and pictures. Flyleaf keeps them as one
              journey per book, just for you.
            </p>
            <div className={styles.acts}>
              <LeafButton onClick={() => setPanel(1)}>Start my journal</LeafButton>
            </div>
          </PaperSurface>
        ) : (
          <PaperSurface taped rotate={0.4} className={styles.panel}>
            <h1 className={styles.big}>What should we call you?</h1>
            <p className={styles.lede}>
              A name and a face for the top of your own page. Both are optional,
              and both are changeable later in Settings.
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
              onKeyDown={(e) => e.key === 'Enter' && begin(name)}
            />

            {/* Picked here rather than offered later, because a face chosen in
                Settings is a setting and a face chosen while you are writing
                your name is yours. Nothing is preselected: assigning a stranger
                a face and asking them to correct it is worse than asking. */}
            <div className={styles.faces}>
              <FacePicker value={face} onPick={setPickedFace} label="Pick a face" />
            </div>

            <p className={styles.fine}>
              No account, no password, nothing sent anywhere. Your memories stay
              on this device unless you save a copy of them yourself.
            </p>
            <div className={styles.acts}>
              <LeafButton onClick={() => begin(name)}>Begin</LeafButton>
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
