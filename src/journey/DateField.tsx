/* A date, and the way to change it.

   Closed it is the answer already written out; open it is the stitched
   calendar the app uses everywhere else. It folds down inside the sheet rather
   than floating over it, because the sheet can already be dragged away and a
   second dismissable layer on top of a dismissable layer is one gesture too
   many to keep straight. */

import { useId, useRef, useState } from 'react'
import CalendarPicker from '../components/date/CalendarPicker'
import { longDate, todayISO } from '../components/date/dates'
import { CaretIcon } from '../components/TabIcons'
import styles from './sheet.module.css'

interface Props {
  label: string
  value: string
  onChange: (iso: string) => void
  /** Latest day that can be chosen. Defaults to today: a keep cannot be made
      in the future, and a book cannot be finished in one either. */
  max?: string
  /** Draws the calendar's stitching. The book's id, so one book's calendar is
      the same calendar every time it is opened. */
  seed: number
}

function DateField({ label, value, onChange, max, seed }: Props) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const picker = useRef<HTMLDivElement>(null)

  /* THE CALENDAR HAS TO BE LOOKED AT.

     "Kept on" is the last field on the sheet, so a calendar unfolding under it
     opens almost entirely below the fold — measured at 375px, 30 of its 388
     pixels were on screen and the rest was somewhere past the bottom of the
     scroller. A control that appears where you cannot see it has not appeared.

     So the sheet is brought to it. Deliberately after the unfold has finished
     rather than on the click: scrolling to a box that is still growing scrolls
     to the height it had halfway through, and lands short. `onAnimationEnd`
     is the only moment the real height is known. `nearest` rather than
     `center`: it scrolls the least distance that gets the calendar wholly on
     screen, so on a tall viewport the pressed field stays in sight above it.
     On a short one it does not — a 388px calendar cannot share a 400px
     scroller with its trigger — and the calendar is the right thing to keep. */
  const reveal = () => {
    picker.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  return (
    <div>
      <p className={styles.label} id={id}>
        {label}
      </p>
      <button
        type="button"
        className={styles.dateBox}
        aria-expanded={open}
        aria-describedby={id}
        onClick={() => setOpen((was) => !was)}
      >
        <span className={styles.dateValue}>{longDate(value)}</span>
        <CaretIcon size={16} />
      </button>
      {open && (
        <div className={styles.datePicker} ref={picker} onAnimationEnd={reveal}>
          <CalendarPicker
            value={value}
            max={max ?? todayISO()}
            seed={seed}
            onChange={(iso) => {
              onChange(iso)
              setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}

export default DateField
