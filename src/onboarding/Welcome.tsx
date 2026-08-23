import { useEffect, useRef, useState } from 'react'
import Guide from './Guide'
import LeafButton from '../components/LeafButton'
import PaperSurface from '../components/PaperSurface'
import Wordmark from '../brand/Wordmark'
import { FacePicker } from '../components/Face'
import { getFace, getHandle, hasMet, markMet, setFace, setHandle } from '../data/reader'
import { SYNC_AVAILABLE, signIn } from '../data/google'
import { syncNow } from '../data/sync'
import { markDone } from '../data/nudges'
import styles from './onboarding.module.css'

/* The first thirty seconds.

   Two panels and a way out of both. 09 asks that a reader claim a handle
   before entering, and that login never be forced; 07 asks that the welcome
   be warm and skippable rather than instructional. So: one panel that says
   what this is, one that asks what to call you, and Skip on the second. No
   account, no email, no password, nothing sent anywhere.

   THE DRIVE DOOR IS ON BOTH PANELS, AND ONLY FOR PEOPLE COMING BACK. It is
   not a second way to start — it is the way a reader who already keeps a
   journal on their phone opens it on a laptop. Without it, that reader has to
   invent a name they already have, pick a face they already picked, sit
   through a tour of an app they use daily, and only then find sync in
   Settings — where the name arriving from Drive overwrites the one they just
   typed. The whole ceremony was for a stranger who was not there.

   NOTHING HERE SAYS "SIGN IN". There is no Flyleaf account to sign into —
   the legal page says so in as many words — and a button that implies one
   asks the reader to hand over something they never had. What actually
   happens is that their own Google Drive is connected and the journey in it
   comes down. So the door says that: bring it back.

   It is worded for the returning reader, ranked below Begin, and hidden
   entirely when no client ID was built in. A new reader reads past it. Nobody
   is stopped by it: the panel behind it still starts a journal with no account
   of any kind, which is the promise the fine print on the next panel makes.

   IT SHOWS ONCE. `hasMet` is written on the way out whichever door is used,
   so a reader who skips is not asked again on the next launch. */

function Welcome() {
  const [open, setOpen] = useState(() => !hasMet())
  const [panel, setPanel] = useState<0 | 1 | 2>(0)
  const [name, setName] = useState(getHandle)
  const [face, setPickedFace] = useState(getFace)
  const [busy, setBusy] = useState(false)
  const [trouble, setTrouble] = useState('')
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

  /* The returning reader's door. Everything the other two doors ask for is
     skipped, because the answers are already in Drive: the name rides down
     with the journey (sync sets it when this device has none), and the tour
     is for somebody who has not seen the app.

     It leaves only after the first sync has finished rather than dropping
     them on Home to watch books appear — arriving at an empty shelf is the
     one thing this door exists to prevent. A failure keeps the panel up and
     says so, so nobody is silently turned into a new reader with a blank
     journal. */
  async function comeBack() {
    setBusy(true)
    setTrouble('')
    try {
      await signIn()
      await syncNow()
      markDone('sync')
      markMet()
      setOpen(false)
    } catch {
      setTrouble('That did not connect. You can start here and bring it back from Settings.')
    } finally {
      setBusy(false)
    }
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
              <LeafButton disabled={busy} onClick={() => setPanel(1)}>
                Start my journal
              </LeafButton>
              {SYNC_AVAILABLE && (
                <button
                  type="button"
                  className={`${styles.skip} ${styles.door}`}
                  disabled={busy}
                  onClick={() => void comeBack()}
                >
                  {busy ? 'Finding your journal…' : 'Already have one? Bring it back'}
                </button>
              )}
            </div>
            {trouble && (
              <p className={styles.fine} data-tone="bad" role="status">
                {trouble}
              </p>
            )}
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
              <LeafButton disabled={busy} onClick={() => begin(name)}>
                Begin
              </LeafButton>
              <button
                type="button"
                className={styles.skip}
                disabled={busy}
                onClick={() => leave('')}
              >
                Skip
              </button>
            </div>

            {/* THE SAME DOOR, ON THE PANEL WHERE IT IS ACTUALLY NEEDED. It is
                on the first panel too, but there it sits beside a much louder
                Begin, and a reader who already keeps this journal walks
                straight past it — and is then asked to invent a name and pick
                a face that are already sitting in their Drive. Nobody should
                have to answer a question the answer to which is being synced
                down. Under a rule, so it reads as the other way in rather than
                a third thing to do here. */}
            {SYNC_AVAILABLE && (
              <div className={styles.alt}>
                <p className={styles.fine}>
                  Already keep this journal? Bring it down from your Google
                  Drive — your name and face come with it.
                </p>
                <button
                  type="button"
                  className={`${styles.skip} ${styles.door}`}
                  disabled={busy}
                  onClick={() => void comeBack()}
                >
                  {busy ? 'Finding your journal…' : 'Bring my journal back'}
                </button>
                {trouble && (
                  <p className={styles.fine} data-tone="bad" role="status">
                    {trouble}
                  </p>
                )}
              </div>
            )}
          </PaperSurface>
        )}
      </div>
    </div>
  )
}

export default Welcome
