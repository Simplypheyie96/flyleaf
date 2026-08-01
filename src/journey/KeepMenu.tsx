/* What to do with one keep.

   Four things, and one of them is inline. Tying a keep to a strand is a single
   decision with a visible answer, so it happens here rather than sending the
   reader into the composer to change one chip and come back. Editing, sharing
   and deleting all leave this sheet, so they stay rows.

   Delete has no dialog. It calls back to the journey, which removes the keep
   and puts an undo in the reader's hand — see `removeKeep`. */

import Sheet from '../components/Sheet'
import {
  CloseIcon,
  EditIcon,
  ShareIcon,
  StrandIcon,
  TrashIcon,
} from '../components/TabIcons'
import type { Book, Entry, Strand } from '../data/db'
import { KEEP, fullDate } from './lexicon'
import { strandColor } from './order'
import { editKeep } from './keeps'
import styles from './sheet.module.css'

interface Props {
  open: boolean
  onClose: () => void
  keep: Entry | null
  book: Book
  strands: Strand[]
  onEdit: () => void
  onDelete: () => void
}

/** What leaves the app when a reader shares a keep: their own words, the book
    they came from, and nothing else. No link, no app name trailing it, no
    invitation for whoever receives it to install anything. */
function shareText(keep: Entry, book: Book) {
  const where = [keep.chapter, keep.page !== undefined ? `p. ${keep.page}` : null]
    .filter(Boolean)
    .join(', ')
  const body =
    keep.type === 'quote' || keep.type === 'highlight'
      ? `“${keep.text ?? ''}”`
      : (keep.text ?? '')
  const from = `— ${book.title}, ${book.author}${where ? ` (${where})` : ''}`
  return `${body}\n${from}`
}

function KeepMenu({ open, onClose, keep, book, strands, onEdit, onDelete }: Props) {
  if (!keep) return null

  /* A `const` the closures below can be sure of. The narrowing above holds
     for the render body but not for every callback TypeScript hands out. */
  const row: Entry = keep

  const running = strands.filter((s) => !s.closedAt || s.id === keep.strandId)
  const shareable = Boolean(keep.text?.trim())

  async function share() {
    const text = shareText(row, book)
    try {
      if (navigator.share) await navigator.share({ text })
      else await navigator.clipboard.writeText(text)
    } catch {
      /* Cancelled, or a browser that offers neither. Nothing to report: the
         reader either changed their mind or is looking at the text already. */
    }
    onClose()
  }

  async function tie(id: number | undefined) {
    await editKeep(row.id, { strandId: id })
  }

  return (
    <Sheet open={open} onClose={onClose} label="What to do with this keep" name="keep-menu">
      <header className={styles.head}>
        <h2 className={styles.title}>This {KEEP[keep.type].one}</h2>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">
          <CloseIcon size={20} />
        </button>
      </header>

      <div className={styles.body}>
        <p className={styles.blurb}>Kept on {fullDate(keep.keptOn)}.</p>

        <div className={styles.rows}>
          <button type="button" className={styles.row} onClick={onEdit}>
            <EditIcon size={20} />
            <span className={styles.rowText}>
              Change it
              <span className={styles.rowHint}>The words, the page, the date, the motifs</span>
            </span>
          </button>

          <button
            type="button"
            className={styles.row}
            onClick={share}
            disabled={!shareable}
          >
            <ShareIcon size={20} />
            <span className={styles.rowText}>
              Share
              <span className={styles.rowHint}>
                {shareable
                  ? 'Your words and the book they came from — nothing else'
                  : 'There are no words on this one to send'}
              </span>
            </span>
          </button>
        </div>

        {running.length > 0 && keep.strandMark === undefined && (
          <fieldset className={styles.group}>
            <legend className={styles.label}>
              <span className={styles.labelLine}>
                <StrandIcon size={14} />
                Tie it to a strand
              </span>
            </legend>
            <div className={styles.chipRow} role="radiogroup" aria-label="Tie to a strand">
              <button
                type="button"
                role="radio"
                aria-checked={keep.strandId === undefined}
                className={styles.chip}
                onClick={() => tie(undefined)}
              >
                Loose
              </button>
              {running.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={keep.strandId === s.id}
                  data-strand=""
                  className={styles.chip}
                  style={{ '--strand': strandColor(s.hue) } as React.CSSProperties}
                  onClick={() => tie(s.id)}
                >
                  <span className={styles.swatch} aria-hidden="true" />
                  {s.name}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div className={styles.rows}>
          <button
            type="button"
            className={`${styles.row} ${styles.destructive}`}
            onClick={onDelete}
          >
            <TrashIcon size={20} />
            <span className={styles.rowText}>
              Delete
              <span className={styles.rowHint}>
                {keep.strandMark === 'open'
                  ? 'This opened a strand, so the strand goes with it. You can undo.'
                  : 'You can undo this straight afterwards'}
              </span>
            </span>
          </button>
        </div>
      </div>
    </Sheet>
  )
}

export default KeepMenu
