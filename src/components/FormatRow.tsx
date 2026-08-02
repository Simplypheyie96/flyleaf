/* How you are reading it — a set, not a choice.

   The same control in the add sheet and in the journey header, because they
   are the same question asked at two moments, and a reader who set it wrong
   on the way in should find the identical row waiting for them on the book's
   own page rather than a differently-shaped one.

   Multi-select is the point. Plenty of people keep the paperback by the bed
   and the audiobook in the car; that is one book and one journey, and a
   control that can only hold one of them makes the reader pick which half of
   their reading to tell us about. */

import { BookIcon, HeadphonesIcon, ScreenIcon } from './TabIcons'
import type { BookFormat } from '../data/db'
import styles from './FormatRow.module.css'

export const FORMATS: { value: BookFormat; label: string; Icon: typeof BookIcon }[] = [
  { value: 'physical', label: 'Physical', Icon: BookIcon },
  { value: 'digital', label: 'Digital', Icon: ScreenIcon },
  { value: 'audio', label: 'Audio', Icon: HeadphonesIcon },
]

interface Props {
  value: BookFormat[]
  onChange: (next: BookFormat[]) => void
  /** Icon-only micro chips, for a header that has to stay small. The add
      sheet keeps the full-size pills, where there is room to name them. */
  small?: boolean
}

function FormatRow({ value, onChange, small = false }: Props) {
  function toggle(format: BookFormat) {
    const on = value.includes(format)
    /* Never down to nothing. A book is being read somehow, and an empty row
       reads as a control that has broken rather than as an answer. */
    if (on && value.length === 1) return
    onChange(
      on
        ? value.filter((f) => f !== format)
        : // Kept in the declared order so "print and audio" never comes out
          // as "audio and print" because of which one was tapped first.
          FORMATS.map((f) => f.value).filter((f) => f === format || value.includes(f)),
    )
  }

  return (
    <div className={styles.row} data-small={small || undefined}>
      {FORMATS.map(({ value: format, label, Icon }) => {
        const on = value.includes(format)
        return (
          <button
            key={format}
            type="button"
            className={styles.chip}
            aria-pressed={on}
            // The label is only painted on the chosen ones, so the rest need
            // their name somewhere a screen reader and a hover can reach.
            aria-label={label}
            title={label}
            onClick={() => toggle(format)}
          >
            {/* The head's chips are the drawing alone. Three words set in mono
                caps cost 217px of a 312px line, which is most of the room the
                book's own name and dates have to share; the same three formats
                as marks cost 142 and say it faster. Nothing is lost by it —
                the name is on the button either way, for a screen reader and
                for a hover, it is simply no longer painted. */}
            <Icon size={small ? 18 : 20} />
            {!small && on && <span>{label}</span>}
          </button>
        )
      })}
    </div>
  )
}

export default FormatRow
