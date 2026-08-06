import { useId, useState, type ReactNode } from 'react'
import PaperSurface from '../components/PaperSurface'
import styles from './fold.module.css'

/* One settings row that opens.

   Settings was six cards standing fully open at once, which is a document
   rather than a control panel: the reader had to scroll past the whole of the
   backup explanation to reach the tip jar, and every section shouted at the
   same volume as the one they came for. Folded, the page is six lines — the
   shape of a settings screen on any phone the reader already owns — and the
   plus tells them there is more without spending a word on saying so.

   The row still answers its own question closed. `meta` is the section's state
   printed on the line — the name, the current theme, how many books — so the
   common case is reading, not opening. A fold that has to be opened to learn
   what it is set to has moved the information rather than tidied it.

   Everything is one <button>: heading, state and the plus are one target, the
   full width of the card and never shorter than a thumb. */

interface FoldProps {
  title: string
  /** What this section is currently set to, read without opening it. */
  meta?: ReactNode
  /** Open on first paint. For the section a reader arrived to use. */
  start?: boolean
  children: ReactNode
}

function Fold({ title, meta, start = false, children }: FoldProps) {
  const [open, setOpen] = useState(start)
  const id = useId()

  return (
    <PaperSurface className={styles.fold}>
      {/* A heading whose whole text is the button, so the section is still a
          landmark in the outline and the button is still named by it. */}
      <h2 className={styles.heading}>
        <button
          type="button"
          className={styles.trigger}
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((was) => !was)}
        >
          <span className={styles.name}>{title}</span>
          {meta ? <span className={styles.meta}>{meta}</span> : null}
          <span className={styles.pm} aria-hidden="true" />
        </button>
      </h2>

      {/* Kept in the tree and collapsed to nothing rather than unmounted: a
          grid row can be animated from 0fr and `hidden` cannot, and a section
          that rebuilt itself on every open would lose whatever the reader had
          half-typed into it. `inert` is what keeps a collapsed section out of
          the tab order and off the screen reader while it is still there. */}
      <div id={id} className={styles.wrap} data-open={open ? '' : undefined} inert={!open}>
        <div className={styles.body}>
          <div className={styles.panel}>{children}</div>
        </div>
      </div>
    </PaperSurface>
  )
}

export default Fold
