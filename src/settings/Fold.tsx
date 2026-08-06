import { useId, useState, type ReactNode } from 'react'
import styles from './fold.module.css'

/* A row inside a group that opens.

   Only for rows whose contents are an explanation. A control a reader came to
   change — the theme, their name, the backup buttons — stays on the page where
   they can see it; folding it away only means a tap between them and the thing
   they opened Settings to do. What folds is prose: seven sets of install steps
   of which six are for devices this reader does not own.

   Everything is one <button>: the name, the state and the plus are a single
   target the full width of the card and never shorter than a thumb. */

interface FoldProps {
  title: string
  /** What this row is currently set to, or what it is about, read without
      opening it. */
  meta?: ReactNode
  /** Open on first paint. For the one row a reader most likely arrived for. */
  start?: boolean
  children: ReactNode
}

function Fold({ title, meta, start = false, children }: FoldProps) {
  const [open, setOpen] = useState(start)
  const id = useId()

  return (
    <div className={styles.fold}>
      <h3 className={styles.heading}>
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
      </h3>

      <div id={id} className={styles.wrap} data-open={open ? '' : undefined} inert={!open}>
        <div className={styles.body}>
          <div className={styles.panel}>{children}</div>
        </div>
      </div>
    </div>
  )
}

export default Fold
