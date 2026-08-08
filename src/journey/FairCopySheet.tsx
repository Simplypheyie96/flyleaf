/* The fair copy — a drafted review, written out of what you already kept.

   Every sentence of substance in the box below is this reader's own, verbatim.
   What Flyleaf writes is the prose around them: how long the reading took, how
   often they stopped for it, which kind of thing they kept most of, and what
   their own words sound like read back. All of that is arithmetic over dates,
   counts and types — no model runs, nothing leaves the device, and the draft
   is identical on a plane and on a train. It costs nothing to produce and
   there is no key behind it, which is the only version of this feature worth
   shipping in an app that promises to stay free and private.

   It opens editable on purpose. A gathered draft is a starting point, and a
   reader who cannot change a word of it before posting it somewhere is being
   handed a review with their name on it that isn't theirs. */

import { useEffect, useState } from 'react'
import Sheet from '../components/Sheet'
import LeafButton from '../components/LeafButton'
import { CheckIcon, CloseIcon, ShareIcon } from '../components/TabIcons'
import { IMPRINT } from '../brand/imprint'
import type { Book, Entry } from '../data/db'
import { countWords, fairCopy } from './lexicon'
import styles from './sheet.module.css'

interface Props {
  open: boolean
  onClose: () => void
  book: Book
  keeps: Entry[]
}

function FairCopySheet({ open, onClose, book, keeps }: Props) {
  const [draft, setDraft] = useState('')
  const [omitted, setOmitted] = useState(0)
  const [copied, setCopied] = useState(false)

  /* Regathered every time it opens, never held between openings. A stale
     draft that silently ignores the six things kept since last week is worse
     than no draft at all. */
  /* The imprint is part of the draft rather than something appended on the way
     out, and that is the honest arrangement: what the reader reads in the box
     is exactly what leaves. Appending it silently at the share would put a
     line into somebody's review that they never saw and cannot take out; here
     it is one line at the end of an editable field, and a reader who does not
     want it deletes it like any other sentence.

     Only onto a draft that exists. Bolted onto an empty one it would fill the
     field with the app's own name and make the sheet believe there was
     something to send — see the `draft.trim()` branch below, which is the
     empty state's only test. */
  useEffect(() => {
    if (!open) return
    const made = fairCopy(book, keeps)
    setDraft(made.text.trim() ? `${made.text}\n\n${IMPRINT}` : made.text)
    setOmitted(made.omitted)
    setCopied(false)
  }, [open, book, keeps])

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft)
      setCopied(true)
    } catch {
      /* Clipboard refused — an insecure origin or a browser that wants a
         closer gesture. The text is on screen and selectable either way. */
    }
  }

  async function share() {
    try {
      if (navigator.share) await navigator.share({ text: draft, title: book.title })
      else await copy()
    } catch {
      /* Cancelled. */
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label="Draft my review"
      name="fair-copy"
      fill={!!draft.trim()}
    >
      <header className={styles.head}>
        <h2 className={styles.title}>Draft my review</h2>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">
          <CloseIcon size={20} />
        </button>
      </header>

      {/* The draft is the sheet. It used to be one item in a stack — a
          paragraph of explanation, a field label, an "optional" tag — inside a
          scroller, with the box itself measured by a script and grown to fit
          its own text. That measurement ran before the serif had loaded, so it
          was taken from a fallback face, and a long review came out with its
          last lines cut off. A box that is simply the size of the sheet has
          nothing to measure and nothing to get wrong. */}
      {draft.trim() ? (
        <div className={styles.compose}>
          <div className={styles.stage}>
            <textarea
              className={`${styles.area} ${styles.write}`}
              aria-label="The draft, yours to edit"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                setCopied(false)
              }}
            />
          </div>

          <p className={styles.caption}>
            Drafted from what you kept, in your own words — and yours to rewrite.
          </p>

          <p className={styles.tally}>
            <span>{countWords(draft)} words</span>
            {omitted > 0 && (
              <em>
                {omitted === 1
                  ? 'One recording or picture couldn’t be written out.'
                  : `${omitted} recordings and pictures couldn’t be written out.`}
              </em>
            )}
          </p>
        </div>
      ) : (
        /* Nothing to show and nothing to size the sheet against: the empty
           state uses the ordinary body so the panel stays as short as the one
           sentence in it, rather than opening a full-height stage around a
           paragraph that says there is nothing there. */
        <div className={styles.body}>
          <p className={styles.quiet}>
            {omitted > 0
              ? /* Not "nothing yet" — they kept things, and being told
                   otherwise reads as the app losing them. What it cannot do is
                   read a recording back or describe a picture, so it says
                   which of the two is true. */
                'Everything kept here so far is a recording or a picture, and neither can be written out. Add a note or a line from the book and this fills itself in.'
              : 'There is nothing written down to gather yet. Keep a note or a line from the book and this fills itself in.'}
          </p>
        </div>
      )}

      {/* Two ways out, the same size. Sending was a full-width slab and copying
          was a small pill beneath it, which said one of them was the answer —
          and on a laptop, where there is no system share sheet, the small one
          is the only thing that works. Peers on one row, and the reader
          chooses. */}
      <footer className={styles.footRow}>
        <LeafButton onClick={share} disabled={!draft.trim()}>
          <ShareIcon size={18} />
          Send it somewhere
        </LeafButton>
        <button
          type="button"
          className={styles.capture}
          onClick={copy}
          disabled={!draft.trim()}
        >
          {copied ? <CheckIcon size={18} /> : null}
          {copied ? 'Copied' : 'Copy the text'}
        </button>
      </footer>
    </Sheet>
  )
}

export default FairCopySheet
