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
}

function Longhand({ open, onClose, kind, label, placeholder, value, onChange }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const area = useRef<HTMLTextAreaElement>(null)

  /* A second native dialog, opened over the sheet's own. The top layer stacks,
     so this sits above it with the focus trap and Escape moving up here and
     the sheet left intact underneath — still mounted, still holding the
     draft. */
  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
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
