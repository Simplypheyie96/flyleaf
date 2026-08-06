import type { ReactNode } from 'react'
import PaperSurface from '../components/PaperSurface'
import styles from './group.module.css'

/* A titled group of settings rows, on one sheet of paper.

   Six separate cards down a page is six separate documents. So related rows
   share a card and are parted by a hairline, and the group is named above it
   in a quiet caption rather than inside it as a heading.

   The explaining goes UNDER the card, not in the rows. A row is a label and a
   control on one line; the moment a sentence of prose is allowed inside one,
   every row grows to three lines and the page turns into an essay with
   switches in it. Anything that genuinely needs saying is said once, in the
   footnote, in a line or two.

   The card carries no padding of its own. Every row brings its own, so a row
   that opens can run its contents to the card's edges. */

interface GroupProps {
  label: string
  /** The footnote under the card. One or two short lines, never a paragraph. */
  note?: ReactNode
  children: ReactNode
}

function Group({ label, note, children }: GroupProps) {
  return (
    <section className={styles.group}>
      <h2 className={styles.label}>{label}</h2>
      <PaperSurface className={styles.card}>{children}</PaperSurface>
      {note && <p className={styles.note}>{note}</p>}
    </section>
  )
}

interface RowProps {
  /** The setting's name. Sans and mid-weight — this is a list item, not a
      chapter heading; the serif belongs to the page title alone. */
  title?: string
  /** The control that answers the title, parked on the same line: a segmented
      switch, a field, a value, a chevron. */
  control?: ReactNode
  /** Anything that cannot sit on the title's line — an open fold's contents, a
      status line after an action. Not a description of the setting. */
  children?: ReactNode
}

function Row({ title, control, children }: RowProps) {
  return (
    <div className={styles.row}>
      {(title || control) && (
        <div className={styles.head}>
          {title && <span className={styles.title}>{title}</span>}
          {control && <div className={styles.control}>{control}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

export default Group
export { Row }
export { styles as groupStyles }
