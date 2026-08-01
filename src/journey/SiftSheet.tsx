/* Reading the journey another way.

   Order and filter in one sheet, because they are one question — "show me this
   part of it, like this" — and splitting them across two controls in the header
   would mean two things to find and two things to remember are on.

   The kinds are a multi-select, not a radio group. A reader comparing what a
   book's people say to where it happens wants both on screen at once, and
   making them pick one is making them do the work by hand. Every chip carries
   its count, so a kind the book has none of is visibly empty rather than
   missing — and choosing it is how a reader finds out the idea exists.

   The order list carries its own hints. "Book order" means nothing to a reader
   who has not yet noticed that keeps carry pages, and a one-line explanation
   under each is cheaper than the reader trying all four to find out. */

import Sheet from '../components/Sheet'
import { CheckIcon, CloseIcon } from '../components/TabIcons'
import type { Entry } from '../data/db'
import { KIND, KINDS } from './kinds'
import { ALL, ORDERS, motifsIn, sifting, tally, toggleType, type Sift } from './order'
import styles from './sheet.module.css'

interface Props {
  open: boolean
  onClose: () => void
  sift: Sift
  onChange: (next: Sift) => void
  keeps: Entry[]
  /** How many rows the current sift leaves. Shown live at the foot, so the
      reader can see a filter empty the page before they close the sheet on
      it and wonder where their journey went. */
  showing: number
}

function SiftSheet({ open, onClose, sift, onChange, keeps, showing }: Props) {
  const motifs = motifsIn(keeps)
  const counts = tally(keeps)

  return (
    <Sheet open={open} onClose={onClose} label="How to read this journey" name="sift-sheet">
      <header className={styles.head}>
        <h2 className={styles.title}>Read this journey by…</h2>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">
          <CloseIcon size={20} />
        </button>
      </header>

      <div className={styles.body}>
        <div className={styles.rows} role="radiogroup" aria-label="Order">
          {ORDERS.map(({ value, label, hint }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={sift.order === value}
              className={styles.row}
              onClick={() => onChange({ ...sift, order: value })}
            >
              <span className={styles.rowText}>
                {label}
                <span className={styles.rowHint}>{hint}</span>
              </span>
              {sift.order === value && <CheckIcon size={18} />}
            </button>
          ))}
        </div>

        <fieldset className={styles.group}>
          <legend className={styles.label}>
            <span className={styles.labelLine}>
              Show only <span className={styles.optional}>choose as many as you like</span>
            </span>
          </legend>
          <div className={styles.chipRow}>
            {/* No "everything" chip: that is the absence of a filter, not an
                eighth kind, and the way back is the one button at the foot —
                which appears only when there is something to clear. */}
            {KINDS.map((t) => {
              const { Icon, many } = KIND[t]
              const n = counts.get(t) ?? 0
              return (
                <button
                  key={t}
                  type="button"
                  role="checkbox"
                  aria-checked={sift.types.includes(t)}
                  data-kind=""
                  className={styles.chip}
                  style={{ '--kind': `var(${KIND[t].hue})` } as React.CSSProperties}
                  onClick={() => onChange(toggleType(sift, t))}
                >
                  <Icon size={17} />
                  {many}
                  <span className={styles.rowValue}>{n}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        {motifs.length > 0 && (
          <fieldset className={styles.group}>
            <legend className={styles.label}>About</legend>
            <div className={styles.chipRow} role="radiogroup" aria-label="Motif">
              <button
                type="button"
                role="radio"
                aria-checked={sift.motif === null}
                className={styles.chip}
                onClick={() => onChange({ ...sift, motif: null })}
              >
                Anything
              </button>
              {motifs.map(([word, n]) => (
                <button
                  key={word}
                  type="button"
                  role="radio"
                  aria-checked={sift.motif === word}
                  className={styles.chip}
                  onClick={() => onChange({ ...sift, motif: sift.motif === word ? null : word })}
                >
                  {word}
                  <span className={styles.rowValue}>{n}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      <footer className={styles.foot}>
        <p className={styles.tally}>
          <em>
            {showing === 1 ? '1 keep' : `${showing} keeps`} on the page
            {showing === 0 ? ' — nothing matches that' : ''}
          </em>
        </p>
        {sifting(sift) && (
          <button
            type="button"
            className={styles.capture}
            onClick={() => onChange({ ...ALL, order: sift.order })}
          >
            Show all kinds again
          </button>
        )}
      </footer>
    </Sheet>
  )
}

export default SiftSheet
