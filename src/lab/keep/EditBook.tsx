/* Edit a book: the same form as Add, with the finished day. Loads the first
   book on this device's shelf, or a stand-in when the shelf is empty. Saving
   writes nothing — this is the lab. */

import { useEffect, useRef, useState } from 'react'
import db, { formatsOf } from '../../data/db'
import BookForm, { bookGap, type BookDraft } from './BookForm'
import { CloseIcon, LabSheet } from './parts'
import s from './keep.module.css'

const STAND_IN: BookDraft = {
  title: 'Things Fall Apart',
  author: 'Chinua Achebe',
  pages: '209',
  year: '1958',
  covers: [],
  formats: ['physical'],
  startedOn: '2026-09-28',
  finishedOn: '',
}

export default function EditBook({
  open,
  onClose,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved: (title: string) => void
}) {
  const first = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<BookDraft>(STAND_IN)
  const [nudge, setNudge] = useState(false)
  const gap = bookGap(draft)

  useEffect(() => {
    if (!open) return setNudge(false)
    db.books
      .orderBy('addedAt')
      .first()
      .then((b) => {
        if (!b) return setDraft(STAND_IN)
        setDraft({
          title: b.title,
          author: b.author,
          pages: b.pages ? String(b.pages) : '',
          year: b.year ? String(b.year) : '',
          covers: b.covers,
          coverPick: b.coverPick,
          formats: formatsOf(b).length ? formatsOf(b) : ['physical'],
          startedOn: b.startedOn ?? '',
          finishedOn: b.finishedOn ?? '',
        })
      })
      .catch(() => setDraft(STAND_IN))
  }, [open])

  return (
    <LabSheet open={open} onClose={onClose} label="Edit this book">
      <header className={s.head}>
        <h2 className={s.title}>Edit this book</h2>
        <button type="button" className={s.iconBtn} aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </button>
      </header>
      <div className={s.body}>
        <BookForm value={draft} onChange={setDraft} finished first={first} />
      </div>
      {gap && nudge && (
        <p className={s.hint} role="status">
          {gap}
        </p>
      )}
      <footer className={s.foot}>
        <button type="button" className={s.ghost} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className={s.keep}
          aria-disabled={Boolean(gap)}
          onClick={() => {
            if (gap) return setNudge(true)
            onSaved(draft.title)
          }}
        >
          Save
        </button>
      </footer>
    </LabSheet>
  )
}
