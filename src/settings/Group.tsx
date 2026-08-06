import type { ReactNode } from 'react'
import PaperSurface from '../components/PaperSurface'
import styles from './group.module.css'

/* A titled group of settings rows, on one sheet of paper.

   Six separate cards down a page is six separate documents — nothing tells a
   reader that the theme and the type size are the same subject, or where one
   subject ends and the next begins. So related rows share a card and are
   parted by a hairline, and the group is named above it in a quiet caption
   rather than inside it as a heading. The eye reads the caption, skips to the
   group it wants, and never has to read the ones it does not.

   The card carries no padding of its own. Every row brings its own, so a row
   that opens can run its contents to the card's edges, and a hover fill
   reaches the edge the way a settings row should instead of floating as a
   pill in the middle of a box. */

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className={styles.group}>
      <h2 className={styles.label}>{label}</h2>
      <PaperSurface className={styles.card}>{children}</PaperSurface>
    </section>
  )
}

interface RowProps {
  /** The setting's name. Sans and mid-weight — this is a list item, not a
      chapter heading; the serif belongs to the page title alone. */
  title?: string
  /** The control that answers the title, parked on the same line when it is
      small enough to sit there — a segmented switch, a value, a chevron. */
  control?: ReactNode
  /** One or two lines under the title saying what the setting does. */
  hint?: ReactNode
  children?: ReactNode
}

function Row({ title, control, hint, children }: RowProps) {
  return (
    <div className={styles.row}>
      {(title || control) && (
        <div className={styles.head}>
          {title && <span className={styles.title}>{title}</span>}
          {control && <div className={styles.control}>{control}</div>}
        </div>
      )}
      {hint && <span className={styles.hint}>{hint}</span>}
      {children}
    </div>
  )
}

export default Group
export { Row }
export { styles as groupStyles }
