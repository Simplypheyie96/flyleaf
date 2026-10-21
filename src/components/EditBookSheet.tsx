/* FIXING A BOOK THAT IS ALREADY ON THE SHELF.

   A book carried over from another app can land with no author, no year, no
   page count and no jacket, and this is where that gets said. The same form
   as Add (BookForm), plus the finished day, from the keep lab (2026-10-18):
   Edit used to have no format and no started day, which made the two forms
   drift. Change cover is always offered, and its search runs only when the
   reader opens it — a sheet that changed a book's cover for it on open would
   be a sheet nobody could trust to open.

   The hard part is not here. Correcting an author changes `seedFrom(title,
   author)`, which is the book's primary key — so saving is `reshelve`, which
   moves the keeps and the sittings and buries the old name. This file only
   asks the questions. */

import { useEffect, useState } from 'react'
import BookForm, { type BookDraft } from './BookForm'
import Sheet from './Sheet'
import { CloseIcon } from './TabIcons'
import { DRAWN } from '../books/covers'
import { AlreadyShelved, reshelve } from '../data/reshelve'
import { formatsOf, type Book } from '../data/db'
import s from './BookSheet.module.css'

interface EditBookSheetProps {
  book: Book
  open: boolean
  onClose: () => void
  /** The book's id afterwards. Different from the one that went in whenever
      the title or author changed, so the caller can move the reader to the
      address the book now lives at. */
  onSaved: (id: number) => void
}

const draftOf = (book: Book): BookDraft => ({
  title: book.title,
  author: book.author,
  pages: book.pages ? String(book.pages) : '',
  year: book.year ? String(book.year) : '',
  covers: book.covers,
  coverPick: book.coverPick ?? (book.covers.length ? 0 : DRAWN),
  formats: formatsOf(book),
  startedOn: book.startedOn ?? '',
  finishedOn: book.finishedOn ?? '',
})

function EditBookSheet({ book, open, onClose, onSaved }: EditBookSheetProps) {
  const [draft, setDraft] = useState(() => draftOf(book))
  const [nudge, setNudge] = useState(false)
  const [saving, setSaving] = useState(false)
  const [snag, setSnag] = useState('')
  /* Only the title is asked for: an imported book with no author must still
     be able to take a cover or a page count without inventing a name. */
  const gap = draft.title.trim() ? undefined : 'Add the title'

  // Every opening starts from what is actually stored. A half-typed correction
  // left behind by a sheet the reader closed is not a draft.
  useEffect(() => {
    if (!open) return
    setDraft(draftOf(book))
    setNudge(false)
    setSnag('')
  }, [open, book])

  async function save() {
    if (saving) return
    if (gap) return setNudge(true)
    setSaving(true)
    setSnag('')
    try {
      const id = await reshelve(book, {
        title: draft.title,
        author: draft.author,
        year: Number(draft.year) || undefined,
        pages: Number(draft.pages) || undefined,
        covers: draft.covers,
        coverPick: draft.coverPick,
        formats: draft.formats,
        startedOn: draft.startedOn,
        finishedOn: draft.finishedOn,
      })
      onSaved(id)
    } catch (error) {
      setSnag(
        error instanceof AlreadyShelved || error instanceof Error
          ? error.message
          : 'That did not save. Try again in a moment.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} label="Edit this book" name="edit-sheet" fill>
      <form
        className={s.stage}
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <header className={s.head}>
          <h2 className={s.title}>Edit this book</h2>
          <button type="button" className={s.iconBtn} aria-label="Close" onClick={onClose}>
            <CloseIcon size={22} />
          </button>
        </header>
        <div className={s.body} data-scroller>
          <BookForm value={draft} onChange={setDraft} finished />
        </div>
        {snag ? (
          <p className={s.snag} role="alert">
            {snag}
          </p>
        ) : (
          gap &&
          nudge && (
            <p className={s.hint} role="status">
              {gap}
            </p>
          )
        )}
        <footer className={s.foot}>
          <button type="button" className={s.ghost} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={s.keep} aria-disabled={Boolean(gap) || saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </form>
    </Sheet>
  )
}

export default EditBookSheet
