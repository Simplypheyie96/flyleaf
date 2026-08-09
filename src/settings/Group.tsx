import type { ReactNode } from 'react'
import PaperSurface from '../components/PaperSurface'
import styles from './group.module.css'

/* A titled group of settings rows, on one sheet of paper.

   Six separate cards down a page is six separate documents. So related rows
   share a card and are parted by a hairline, and the group is named above it
   in a quiet caption rather than inside it as a heading.

   THERE IS NO FOOTNOTE, and there used to be one under every card. The owner's
   verdict on them was that they were "really too much and not really needed…
   it will overwhelm users when the texts are too much", which is right: six
   captions is six paragraphs standing between seven groups of switches, so a
   page of controls read as a page of reading.

   A row is a label and a control on one line. Anything that genuinely needs
   saying is said INSIDE the row it belongs to, in that row's fold, where only
   a reader who opened it will meet it — the sync fold explains Drive, the lock
   fold explains the code, the erase fold carries its own warning. If something
   seems to need a caption over the whole card, it belongs in one of the rows
   under that card, and the caption is the wrong place for it.

   The card carries no padding of its own. Every row brings its own, so a row
   that opens can run its contents to the card's edges. */

interface GroupProps {
  label: string
  children: ReactNode
}

function Group({ label, children }: GroupProps) {
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
