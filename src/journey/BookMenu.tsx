/* Taking the book off the shelf — and nothing else.

   Everything informational about the book lives in the journey's own head
   now: formats, dates, counts. What is left is the one decision with no way
   back, because a book and every keep under it is too much to hold in memory
   for an undo — so it is the one that asks first and says out loud what is
   going. The count in that sentence is not decoration: "and 13 keeps" is the
   whole difference between a reader confirming and a reader guessing. */

import Sheet from '../components/Sheet'
import { CloseIcon } from '../components/TabIcons'
import type { Book, Entry } from '../data/db'
import { removeBook } from './keeps'
import styles from './sheet.module.css'

interface Props {
  open: boolean
  onClose: () => void
  book: Book
  keeps: Entry[]
  /** Where to go once the book no longer exists. */
  onRemoved: () => void
}

function BookMenu({ open, onClose, book, keeps, onRemoved }: Props) {
  return (
    <Sheet open={open} onClose={onClose} label={`Delete ${book.title}`} name="book-menu">
      <header className={styles.head}>
        <h2 className={styles.title}>Delete this book?</h2>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">
          <CloseIcon size={20} />
        </button>
      </header>

      <div className={styles.body}>
        <div className={styles.warn}>
          <p>
            Deleting <strong>{book.title}</strong> takes{' '}
            {keeps.length === 1 ? 'its 1 keep' : `all ${keeps.length} keeps`} with
            it. There is no undo for this one.
          </p>
          <div className={styles.warnRow}>
            <button type="button" className={styles.capture} onClick={onClose}>
              Keep the book
            </button>
            <button
              type="button"
              className={`${styles.capture} ${styles.reallyDelete}`}
              onClick={async () => {
                await removeBook(book.id)
                onRemoved()
              }}
            >
              Delete it all
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}

export default BookMenu
