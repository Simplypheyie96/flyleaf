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
  /** Given together, the children fold away and the row's own line becomes the
      thing that opens them. Only for a row whose contents are a tray of
      choices — the setting itself stays on the line, always readable. Leave
      both off and the row is a plain row with its contents always out. */
  open?: boolean
  onFold?: () => void
}

function Row({ title, control, children, open, onFold }: RowProps) {
  const head = (
    <>
      {title && <span className={styles.title}>{title}</span>}
      {control && <div className={styles.control}>{control}</div>}
    </>
  )

  if (!onFold)
    return (
      <div className={styles.row}>
        {(title || control) && <div className={styles.head}>{head}</div>}
        {children}
      </div>
    )

  return (
    <div className={`${styles.row} ${styles.rowFold}`} data-folded={open ? undefined : ''}>
      <button
        type="button"
        className={`${styles.head} ${styles.headFold}`}
        onClick={onFold}
        aria-expanded={open}
      >
        {head}
        <span className={styles.chevron} aria-hidden="true" />
      </button>
      {/* `grid-template-rows: 1fr → 0fr` on the wrapper, not a height: what is
          inside is a wrapping grid of faces, and how many rows it takes depends
          on how wide the phone is.

          `inert` rather than `hidden`, because `hidden` is `display: none` and
          a box that is not displayed cannot animate out of existence — it just
          vanishes. `inert` takes the shut tray out of the tab order and out of
          the accessibility tree while leaving it a size to collapse. */}
      <div className={styles.foldBox} inert={!open}>
        <div className={styles.foldInner}>{children}</div>
      </div>
    </div>
  )
}

export default Group
export { Row }
export { styles as groupStyles }
