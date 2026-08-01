/* Reading the journey another way.

   Order and filter in one sheet, because they are one question — "show me
   this part of it, like this" — and splitting them across two controls in the
   header would mean two things to find and two things to remember are on.

   The order list carries its own hints. "Book order" means nothing to a reader
   who has not yet noticed that keeps carry pages, and a one-line explanation
   under each is cheaper than the reader trying all five to find out. */

import Sheet from '../components/Sheet'
import { CheckIcon, CloseIcon } from '../components/TabIcons'
import type { Entry, EntryType, Strand } from '../data/db'
import { KEEP } from './lexicon'
import { ALL, ORDERS, motifsIn, sifting, strandColor, type Sift } from './order'
import { KIND } from './Keep'
import styles from './sheet.module.css'

interface Props {
  open: boolean
  onClose: () => void
  sift: Sift
  onChange: (next: Sift) => void
  keeps: Entry[]
  strands: Strand[]
  /** How many rows the current sift leaves. Shown live at the foot, so the
      reader can see a filter empty the page before they close the sheet on
      it and wonder where their journey went. */
  showing: number
}

function SiftSheet({ open, onClose, sift, onChange, keeps, strands, showing }: Props) {
  const motifs = motifsIn(keeps)
  const types = [...new Set(keeps.map((e) => e.type))] as EntryType[]

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

        {types.length > 1 && (
          <fieldset className={styles.group}>
            <legend className={styles.label}>Only</legend>
            <div className={styles.chipRow} role="radiogroup" aria-label="Kind of keep">
              <button
                type="button"
                role="radio"
                aria-checked={sift.type === null}
                className={styles.chip}
                onClick={() => onChange({ ...sift, type: null })}
              >
                Everything
              </button>
              {types.map((t) => {
                const { Icon } = KIND[t]
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={sift.type === t}
                    className={styles.chip}
                    onClick={() => onChange({ ...sift, type: sift.type === t ? null : t })}
                  >
                    <Icon size={17} />
                    {KEEP[t].many}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        {strands.length > 0 && (
          <fieldset className={styles.group}>
            <legend className={styles.label}>Following</legend>
            <div className={styles.chipRow} role="radiogroup" aria-label="Strand">
              <button
                type="button"
                role="radio"
                aria-checked={sift.strandId === null}
                className={styles.chip}
                onClick={() => onChange({ ...sift, strandId: null })}
              >
                Any
              </button>
              {strands.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={sift.strandId === s.id}
                  data-strand=""
                  className={styles.chip}
                  style={{ '--strand': strandColor(s.hue) } as React.CSSProperties}
                  onClick={() =>
                    onChange({ ...sift, strandId: sift.strandId === s.id ? null : s.id })
                  }
                >
                  <span className={styles.swatch} aria-hidden="true" />
                  {s.name}
                </button>
              ))}
            </div>
          </fieldset>
        )}

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
                  onClick={() =>
                    onChange({ ...sift, motif: sift.motif === word ? null : word })
                  }
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
            Show everything again
          </button>
        )}
      </footer>
    </Sheet>
  )
}

export default SiftSheet
