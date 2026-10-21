/* ADD A BOOK. Search, then the book form — one sheet, one height, from the
   keep lab (2026-10-18).

   Search is where nearly everyone starts and ends; typing it in is the floor
   beneath it, so that no book — out of print, self-published, in a language
   the catalogues index badly — can be refused by this app. It is offered
   always, not only after a miss.

   Results stay up while the next search runs, dimmed, so the list never
   blinks empty under the reader's thumb. A book already on the shelf says so
   and opens instead of being written over: same id, fresh addedAt, formats
   and started day reset would be a loss nobody asked for. Back keeps
   everything: the picked result and the typed-in book are two drafts, and
   going between them never throws either away. */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import BookCover from './BookCover'
import BookForm, { blankBook, bookGap, type BookDraft } from './BookForm'
import Sheet from './Sheet'
import { BackIcon, CloseIcon, SearchIcon } from './TabIcons'
import { todayISO } from './date/dates'
import { useBookSearch } from '../books/useBookSearch'
import type { BookResult } from '../books/sources'
import { seedFrom } from '../books/seed'
import db from '../data/db'
import { bookGrave, unbury } from '../data/graves'
import { addKeep } from '../journey/keeps'
import { landOnShelf } from '../motion/shelfLanding'
import s from './BookSheet.module.css'

interface AddBookSheetProps {
  open: boolean
  onClose: () => void
  /** Words to open with, when the reader came from the Library's search
      already knowing what they were looking for. */
  seed?: string
  /** A line written on the first run, before there was a book to hang it on.
      Whatever book comes out of this sheet, this becomes its first keep and
      the reader is taken to it. Empty on every other route into the sheet. */
  firstKeep?: string
}

function fromResult(r: BookResult): BookDraft {
  return {
    ...blankBook(),
    title: r.title,
    author: r.author,
    pages: r.pages ? String(r.pages) : '',
    year: r.year ? String(r.year) : '',
    covers: r.covers,
    coverPick: 0,
  }
}

function AddBookSheet({ open, onClose, seed = '', firstKeep = '' }: AddBookSheetProps) {
  const field = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const [stage, setStage] = useState<'search' | 'form'>('search')
  const [query, setQuery] = useState('')
  /* Flipped to ask the same words again: the search keys on the string, and
     asking twice is what a reader does when the catalogues did not answer. */
  const [again, setAgain] = useState(false)
  const search = useBookSearch(again ? `${query} ` : query)
  const [picked, setPicked] = useState<{ id: number; draft: BookDraft } | null>(null)
  const [manual, setManual] = useState<BookDraft>(blankBook)
  const [byHand, setByHand] = useState(false)
  const [askedOwned, setAskedOwned] = useState<number | null>(null)
  const [nudge, setNudge] = useState(false)
  const [saving, setSaving] = useState(false)
  const [snag, setSnag] = useState('')
  /* Every id on the shelf, so a result the reader already owns says so.
     Walked through the addedAt index (every book has one): Dexie's live query
     never re-fires for a bare `toCollection().primaryKeys()`, so a book
     shelved a moment ago went unflagged until a reload (2026-10-18). */
  const owned = useLiveQuery(
    async () => new Set(await db.books.orderBy('addedAt').primaryKeys()),
    [],
    new Set<number>(),
  )

  const draft = byHand || !picked ? manual : picked.draft
  const setDraft = (next: BookDraft) =>
    byHand || !picked ? setManual(next) : setPicked({ ...picked, draft: next })
  const gap = bookGap(draft)
  const draftId = gap ? null : seedFrom(draft.title.trim(), draft.author.trim())
  const draftOwned = draftId !== null && owned.has(draftId)

  async function openOwned(id: number) {
    if (firstKeep) await addKeep({ bookId: id, type: 'note', text: firstKeep, keptOn: todayISO() })
    onClose()
    navigate(`/book/${id}`)
  }

  // Every visit starts at the beginning: an add flow left half-finished is
  // not a draft, and reopening to someone else's half-typed search is a bug.
  useEffect(() => {
    if (!open) return
    setQuery(seed)
    setStage('search')
    setPicked(null)
    setManual(blankBook())
    setByHand(false)
    setAskedOwned(null)
    setNudge(false)
    setSnag('')
    setSaving(false)
    // `seed` is what the sheet opened with; a reader editing the query
    // afterwards must not have it typed back over them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  /* The field is the sheet's whole purpose, so the caret goes there — and on a
     phone that raises the keyboard. Not `autoFocus`: React applies it while
     the dialog is still closed, and showModal() then hands focus to Close. */
  useEffect(() => {
    if (open && stage === 'search') field.current?.focus()
  }, [open, stage])

  function choose(r: BookResult) {
    if (owned.has(r.id)) return setAskedOwned((at) => (at === r.id ? null : r.id))
    if (picked?.id !== r.id) setPicked({ id: r.id, draft: fromResult(r) })
    setByHand(false)
    setNudge(false)
    setStage('form')
  }

  function typeIn() {
    if (!manual.title && query.trim()) setManual({ ...manual, title: query.trim() })
    setByHand(true)
    setNudge(false)
    setStage('form')
  }

  async function shelve() {
    if (saving) return
    if (gap || draftId === null) return setNudge(true)
    // Typed in by hand and it turns out to be a book they have: open it,
    // never write over it.
    if (draftOwned) return openOwned(draftId)
    const id = draftId
    setSnag('')
    setSaving(true)
    try {
      await landOnShelf(
        id,
        async () => {
          // put, not add: the id is the book's identity.
          await db.books.put({
            id,
            title: draft.title.trim(),
            author: draft.author.trim(),
            pages: Number(draft.pages) || undefined,
            year: Number(draft.year) || undefined,
            covers: draft.covers,
            coverPick: draft.coverPick,
            formats: draft.formats,
            startedOn: draft.startedOn || undefined,
            addedAt: Date.now(),
          })
          /* And the headstone comes down: shelving a book is the reader
             saying they want it, and that outranks every record of the time
             they didn't. Without this the next sync takes it back off. */
          await unbury([bookGrave(id)])
          /* And the line they wrote first, in the same write, so the journey
             never renders an empty spine and then pops a keep onto it.
             `keptOn` is today: the day the line was written down. */
          if (firstKeep) await addKeep({ bookId: id, type: 'note', text: firstKeep, keptOn: todayISO() })
        },
        onClose,
      )
      if (firstKeep) navigate(`/book/${id}`)
    } catch {
      /* The shelf is on the device, so this is a device saying no. Everything
         typed is still true, so the form stays and the button is live again. */
      setSnag('That would not save to your shelf. Your device may be out of room — try again.')
      setSaving(false)
    }
  }

  const term = query.trim()
  const results = search.status === 'done' || search.status === 'searching' ? (search.results ?? []) : []

  return (
    <Sheet open={open} onClose={onClose} label="Add a book" name="add-sheet" fill>
      {stage === 'search' ? (
        <div className={s.stage}>
          <header className={s.head}>
            <h2 className={s.title}>Add a book</h2>
            <button type="button" className={s.iconBtn} aria-label="Close" onClick={onClose}>
              <CloseIcon size={22} />
            </button>
          </header>
          <form
            className={s.searchBar}
            role="search"
            onSubmit={(event) => {
              event.preventDefault()
              if (term.length >= 2) setAgain((on) => !on)
              field.current?.blur()
            }}
          >
            <SearchIcon size={20} />
            <input
              ref={field}
              type="search"
              aria-label="Title, author or ISBN"
              placeholder="Title, author or ISBN"
              value={query}
              enterKeyHint="search"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
            />
            <span className={s.progress} data-on={search.status === 'searching' || undefined} aria-hidden="true" />
          </form>
          <div className={s.body} data-scroller aria-busy={search.status === 'searching'}>
            {search.status === 'idle' && (
              <p className={s.quiet}>Type a title, an author, or the ISBN on the back. The cover comes with it.</p>
            )}
            {search.status === 'searching' && !search.results && (
              <p className={s.quiet}>Looking through the shelves…</p>
            )}
            {/* Said differently from a miss on purpose: a reader with no
                signal is not looking at a spelling mistake. */}
            {search.status === 'unreachable' && (
              <div className={s.state}>
                <p className={s.quiet}>We couldn’t reach the catalogues. Your connection may be off.</p>
                <button type="button" className={s.chip} onClick={() => setAgain((on) => !on)}>
                  Try again
                </button>
              </div>
            )}
            {search.status === 'done' && results.length === 0 && (
              <p className={s.quiet}>
                Nothing under “{term}”. Try fewer words or the author’s surname, or type it in yourself.
              </p>
            )}
            {results.length > 0 && (
              <ul className={s.results} data-stale={search.status === 'searching' || undefined}>
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={s.result}
                      aria-expanded={owned.has(r.id) ? askedOwned === r.id : undefined}
                      onClick={() => choose(r)}
                    >
                      <BookCover title={r.title} author={r.author} covers={r.covers} width={40} size="thumb" />
                      <span className={s.resultText}>
                        <span className={s.resultTitle}>{r.title}</span>
                        <span className={s.resultMeta}>
                          {[r.author, r.year].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      {owned.has(r.id) && <span className={s.badge}>On your shelf</span>}
                    </button>
                    {askedOwned === r.id && (
                      <p className={s.ownedLine}>
                        Already on your shelf, with everything you’ve kept.{' '}
                        <button type="button" className={s.link} onClick={() => openOwned(r.id)}>
                          Open it
                        </button>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <footer className={s.foot}>
            <button type="button" className={s.ghost} onClick={typeIn}>
              Not here? Type it in
            </button>
          </footer>
        </div>
      ) : (
        <form
          className={s.stage}
          onSubmit={(event) => {
            event.preventDefault()
            void shelve()
          }}
        >
          <header className={s.head}>
            <button type="button" className={s.iconBtn} aria-label="Back to search" onClick={() => setStage('search')}>
              <BackIcon size={22} />
            </button>
            <h2 className={s.title}>{byHand ? 'Type it in' : 'Is this the one?'}</h2>
            <button type="button" className={s.iconBtn} aria-label="Close" onClick={onClose}>
              <CloseIcon size={22} />
            </button>
          </header>
          <div className={s.body} data-scroller>
            <BookForm
              value={draft}
              onChange={setDraft}
              transition={draftId !== null && !draftOwned ? `book-${draftId}` : undefined}
            />
            {draftOwned && (
              <p className={s.ownedLine} role="status">
                This one’s already on your shelf. Opening it keeps everything you’ve kept.
              </p>
            )}
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
            <button type="submit" className={s.keep} aria-disabled={Boolean(gap) || saving}>
              {draftOwned ? 'Open it' : saving ? 'Adding…' : 'Put it on the shelf'}
            </button>
          </footer>
        </form>
      )}
    </Sheet>
  )
}

export default AddBookSheet
