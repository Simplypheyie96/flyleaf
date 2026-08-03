/* A date, and the way to change it.

   Closed it is the answer already written out; open it is the stitched
   calendar the app uses everywhere else. It folds down inside the sheet rather
   than floating over it, because the sheet can already be dragged away and a
   second dismissable layer on top of a dismissable layer is one gesture too
   many to keep straight. */

import { useId, useState } from 'react'
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
        <div className={styles.datePicker}>
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
