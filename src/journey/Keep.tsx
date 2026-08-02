/* One keep — the drawing, and the three verbs that ride it.

   The drawings themselves live in `cards/`, three complete sets of seven, and
   `cardFor` decides which set a given type is drawn from. This file is
   deliberately thin: it knows nothing about what a quote looks like, which is
   why swapping a whole direction is one word in `cards/index.ts` rather than a
   rewrite here.

   The three verbs — share, edit, delete — are round buttons riding the card's
   own bottom corner, half off the paper. No menu anywhere. */

import { useSearchParams } from 'react-router-dom'
import type { Book, Entry } from '../data/db'
import { EditIcon, ShareIcon, TrashIcon } from '../components/TabIcons'
import { KIND } from './kinds'
import { shareKeep, shareable } from './share'
import { cardFor } from './cards'
import styles from './Keep.module.css'

interface KeepProps {
  keep: Entry
  book: Book
  onMotif: (motif: string) => void
  onEdit: (keep: Entry) => void
  onDelete: (keep: Entry) => void
}

function Keep({ keep, book, onMotif, onEdit, onDelete }: KeepProps) {
  // `?dir=` redraws the whole thread from one set so the three directions can
  // be judged as pages. Absent — which is always, in the app — it is `CHOSEN`.
  const [params] = useSearchParams()
  const Card = cardFor(keep.type, params.get('dir'))
  const one = KIND[keep.type].one
  return (
    <>
      <Card keep={keep} onMotif={onMotif} />
      {/* Delete wears the danger colour; there is an undo waiting behind it. */}
      <span className={styles.acts}>
        {shareable(keep) && (
          <button
            type="button"
            className={styles.act}
            onClick={() => void shareKeep(keep, book)}
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
