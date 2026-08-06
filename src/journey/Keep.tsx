/* One keep — the drawing, and the three verbs that ride it.

   The drawings themselves live in `cards/`, three complete sets of seven, and
   `cardFor` decides which set a given type is drawn from. This file is
   deliberately thin: it knows nothing about what a quote looks like, which is
   why swapping a whole direction is one word in `cards/index.ts` rather than a
   rewrite here.

   The three verbs — share, edit, delete — are round buttons riding the card's
   own bottom corner, half off the paper. No menu anywhere. */

import { useSearchParams } from 'react-router-dom'
import type { Entry } from '../data/db'
import { EditIcon, ShareIcon, TrashIcon } from '../components/TabIcons'
import { KIND } from './kinds'
import { shareable } from './share'
import { cardFor } from './cards'
import styles from './Keep.module.css'

interface KeepProps {
  keep: Entry
  onEdit: (keep: Entry) => void
  /** Share opens the plate sheet on the screen rather than handing the system
      a paragraph from here. The row used to need the book for that; it does
      not need to know the book to draw a keep. */
  onShare: (keep: Entry) => void
  onDelete: (keep: Entry) => void
}

function Keep({ keep, onEdit, onShare, onDelete }: KeepProps) {
  // `?dir=` redraws the whole thread from one set; `?th=` swaps in a candidate
  // for the one type still being decided. Absent — which is always, in the
  // app — every keep gets its real drawing.
  const [params] = useSearchParams()
  const Card = cardFor(keep.type, params)
  const one = KIND[keep.type].one
  return (
    <>
      <Card keep={keep} />
      {/* Delete wears the danger colour; there is an undo waiting behind it.

          `data-acts` is how the floating action finds these: it rides the same
          corner of the screen and has to know when it is standing on a row of
          them. A data attribute rather than a class, because the class is
          hashed by CSS Modules and the action is in another file. */}
      <span className={styles.acts} data-acts>
        {shareable(keep) && (
          <button
            type="button"
            className={styles.act}
            onClick={() => onShare(keep)}
            aria-label={`Share this ${one}`}
          >
            <ShareIcon size={16} />
          </button>
        )}
        <button
          type="button"
          className={styles.act}
          onClick={() => onEdit(keep)}
          aria-label={`Change this ${one}`}
        >
          <EditIcon size={16} />
        </button>
        <button
          type="button"
          className={`${styles.act} ${styles.actDanger}`}
          onClick={() => onDelete(keep)}
          aria-label={`Delete this ${one} — you can undo straight afterwards`}
        >
          <TrashIcon size={16} />
        </button>
      </span>
    </>
  )
}

export default Keep
