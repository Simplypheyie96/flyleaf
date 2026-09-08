/* The whole screen, for one paragraph.

   A keep sheet is a form, and a form's text box is 7.5rem tall because it is
   one row among eight. That is the right size for a page number and the wrong
   size for a quote: with a keyboard up on a phone the box is four visible
   lines in a strip an inch and a half deep, and copying out a long sentence —
   or going back three lines to fix a word — means scrolling a box inside a
   sheet inside a viewport that is itself scrolled. The owner's words: "it's
   difficult to write and edit when the view port is tiny."

   So the box can ask for the screen. This is that screen.

   THREE THINGS IT DELIBERATELY IS NOT.

   Not a route. Pushing a URL would unmount the sheet, and the sheet is holding
   a half-filled draft — a picture already attached, a pin already dropped, a
   name already typed. A reader who taps "More room" has not left the keep they
   were making, so nothing about the keep may be torn down and rebuilt.

   Not a second draft. There is no copy of the text here and nothing to
   reconcile on the way back: this edits the sheet's own `text` state through
   the callback it was handed, so Done and Escape are the same act — stop
   showing the big version — and neither can lose a word.

   Not a new set of typography. The face, the hung quotation mark and the
   measured gutters are the field's, imported from sheet.module.css rather than
   rewritten here, so a quote is still in the book's serif and a note is still
   in the reader's hand. What you write is what the card will look like, at
   both sizes. */

import { useEffect, useRef } from 'react'
import { CheckIcon } from '../components/TabIcons'
import { useKeyboardFit } from '../components/Sheet'
import type { EntryType } from '../data/db'
import field from './sheet.module.css'
import styles from './Longhand.module.css'

interface Props {
  open: boolean
  /** Done, Escape, and the backdrop all arrive here. There is nothing to save
      on the way out — the text was never anywhere else. */
  onClose: () => void
  /** Which keep this is, so the page is set in the face the card will use. */
  kind: EntryType
  /** The field's own label — what is being written, not what kind of keep it
      belongs to. "The line" tells a reader more here than "A quote" does. */
  label: string
  placeholder?: string
  value: string
  onChange: (next: string) => void
  /** Where the caret goes on the way out — the field this page was opened
      from. Called the instant the dialog closes and not a frame later; see the
      effect below. */
  back?: () => void
}

function Longhand({ open, onClose, kind, label, placeholder, value, onChange, back }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const area = useRef<HTMLTextAreaElement>(null)

  /* A second native dialog, opened over the sheet's own. The top layer stacks,
     so this sits above it with the focus trap and Escape moving up here and
     the sheet left intact underneath — still mounted, still holding the
     draft. */
  /* Whether this page has ever been up. Without it the first run of the effect
     below — every mount, `open` still false — would count as a close and put
     the caret in a field nobody has asked to leave. */
  const wasOpen = useRef(false)

  useEffect(() => {
    const el = dialog.current
    if (!el) return

    if (open) {
      wasOpen.current = true
      if (!el.open) el.showModal()
      return
    }

    if (!wasOpen.current) return
    wasOpen.current = false

    /* Escape and the native close event get here with the dialog ALREADY
       closed, Done and the backdrop with it still open, so the close is
       conditional and the restore is not. Getting that the wrong way round is
       how the keyboard route quietly kept the old behaviour while the tap
       route got the fix. */
    if (el.open) el.close()

    /* And the caret goes straight back into the field this came out of.
       HERE, and not in the handler that asked for the close: while this dialog
       is open the rest of the document is inert and the field cannot take
       focus, so the restore has to happen after the close — and this is the
       only place guaranteed to be after it without waiting on a frame or a
       timer, both of which stall in a backgrounded tab and neither of which
       React orders for us.

       Why it matters beyond politeness: leaving focus on the More room button
       drops the keyboard, and the sheet underneath then re-fits itself in the
       same handful of frames it is being uncovered in. Keeping the keyboard up
       hands the sheet back at exactly the height it was already fitted to, and
       nothing moves. */
    back?.()
    /* `back` is a fresh closure every render and must not re-run this. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useKeyboardFit(dialog, open)

  /* The caret lands where the writing stopped, not at the top of it. A reader
     asks for room in the middle of a sentence; arriving with the cursor before
     the first word means every one of them presses ⌘↓ or taps the end of the
     text before they can carry on. */
  useEffect(() => {
    if (!open) return
    const el = area.current
    if (!el) return
    el.focus()
    const end = el.value.length
    el.setSelectionRange(end, end)
    /* Once, on opening. Keyed on the text as well and it would drag the caret
       to the end after every keystroke. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <dialog
      ref={dialog}
      className={styles.page}
      aria-label={label}
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && onClose()}
    >
      <header className={styles.bar}>
        <span className={styles.what}>{label}</span>
        {/* One way out, said plainly. Nothing is being committed — the keep is
            still unsaved on the sheet behind this — so the word is Done and
            not Save, which would promise a thing this screen cannot do. */}
        <button type="button" className={styles.done} onClick={onClose}>
          <CheckIcon size={15} />
          Done
        </button>
      </header>

      {/* The gutters live out here rather than on the box, because the hung
          quotation mark is positioned against `.penned` to a measurement taken
          in the small field. Padding the wrapper moves the mark and the first
          line together and keeps that measurement true at any size. */}
      <div className={styles.leaf}>
        <span className={`${field.penned} ${styles.held}`} data-kind={kind}>
          <textarea
            ref={area}
            className={`${field.area} ${field.write} ${styles.stage}`}
            data-kind={kind}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
          />
        </span>
      </div>
    </dialog>
  )
}

export default Longhand
