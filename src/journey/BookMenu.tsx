/* The book itself.

   How it is being read, when it was opened and closed, and — at the bottom,
   set apart — taking it off the shelf. This is the one delete in the app with
   no way back, because a book and every keep under it is too much to hold in
   memory for an undo, so it is the one that asks first and says out loud what
   is going. The count in that sentence is not decoration: "and 23 keeps" is
   the whole difference between a reader confirming and a reader guessing. */

import { useState } from 'react'
import Sheet from '../components/Sheet'
import FormatRow from '../components/FormatRow'
import DateField from './DateField'
import { CheckIcon, CloseIcon, TrashIcon } from '../components/TabIcons'
import { todayISO } from '../components/date/dates'
import { formatsOf, type Book, type Entry } from '../data/db'
import { count } from './lexicon'
import { finish, removeBook, setDates, setFormats, setProgress } from './keeps'
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
  const [sure, setSure] = useState(false)
  const [at, setAt] = useState(String(book.pagesRead ?? ''))
  const done = Boolean(book.finishedOn)

  /* Held as a string while it is being typed. A number bound straight to the
     store turns an empty field into 0 the moment the reader clears it to type
     a bigger number, and the bookmark jumps back to the front cover under
     their thumb. It is written on blur, once. */
  function saveProgress() {
    const n = Number(at)
    if (!Number.isFinite(n)) return
    void setProgress(book.id, n, book.pages)
  }

  return (
    <Sheet open={open} onClose={onClose} label={`About ${book.title}`} name="book-menu">
      <header className={styles.head}>
        <h2 className={styles.title}>{book.title}</h2>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">
          <CloseIcon size={20} />
        </button>
      </header>

      <div className={styles.body}>
        <fieldset className={styles.group}>
          <legend className={styles.label}>How you’re reading it</legend>
          <FormatRow
            value={formatsOf(book)}
            onChange={(next) => setFormats(book.id, next)}
          />
        </fieldset>

        {book.pages !== undefined && (
          <label className={styles.label}>
            <span className={styles.labelLine}>
              Where the bookmark is
              <span className={styles.optional}>of {book.pages} pages</span>
            </span>
            <input
              className={styles.input}
              type="number"
              inputMode="numeric"
              min={0}
              max={book.pages}
              placeholder="0"
              value={at}
              onChange={(e) => setAt(e.target.value)}
              onBlur={saveProgress}
            />
          </label>
        )}

        <DateField
          label="Opened"
          value={book.startedOn ?? todayISO()}
          onChange={(iso) => setDates(book.id, { startedOn: iso })}
          seed={book.id}
        />

        {done && book.finishedOn && (
          <DateField
            label="Closed"
            value={book.finishedOn}
            onChange={(iso) => setDates(book.id, { finishedOn: iso })}
            seed={book.id}
          />
        )}

        <div className={styles.rows}>
          <button
            type="button"
            className={styles.row}
            onClick={() => finish(book.id, done ? null : todayISO())}
          >
            <CheckIcon size={20} />
            <span className={styles.rowText}>
              {done ? 'Still reading it, actually' : 'Finished it'}
              <span className={styles.rowHint}>
                {done
                  ? 'Clears the closing date and puts it back among the live ones'
                  : 'Closes it today. The journey stays exactly as it is.'}
              </span>
            </span>
          </button>
        </div>

        <div className={styles.rows}>
          {sure ? (
            <div className={styles.warn}>
              <p>
                Deleting <strong>{book.title}</strong> takes{' '}
                {count(keeps.length, { one: 'keep', many: 'keeps' })} with it. There is
                no undo for this one.
              </p>
              <div className={styles.warnRow}>
                <button type="button" className={styles.capture} onClick={() => setSure(false)}>
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
          ) : (
            <button
              type="button"
              className={`${styles.row} ${styles.destructive}`}
              onClick={() => setSure(true)}
            >
              <TrashIcon size={20} />
              <span className={styles.rowText}>
                Delete this book
                <span className={styles.rowHint}>
                  {keeps.length
                    ? `Along with ${count(keeps.length, { one: 'keep', many: 'keeps' })}`
                    : 'Nothing has been kept from it yet'}
                </span>
              </span>
            </button>
          )}
        </div>
      </div>
    </Sheet>
  )
}

export default BookMenu
