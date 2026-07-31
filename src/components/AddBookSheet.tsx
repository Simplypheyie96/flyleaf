import { useEffect, useRef, useState } from 'react'
import BookCover, { hueFor } from './BookCover'
import GlassSurface from './GlassSurface'
import LeafButton from './LeafButton'
import { SearchIcon } from './TabIcons'
import { useBookSearch } from '../books/useBookSearch'
import type { BookResult } from '../books/sources'
import { seedFrom } from '../books/seed'
import db, { type BookFormat } from '../data/db'
import styles from './AddBookSheet.module.css'

interface AddBookSheetProps {
  open: boolean
  onClose: () => void
}

/* Three stages, one sheet. Search is where nearly everyone starts and ends;
   manual entry is the floor beneath it, so that no book — out of print, self
   published, in a language neither catalogue indexes well, or simply not
   there — can be refused by this app. Confirm is where the reader says how
   they are reading it, which is the only thing the catalogues cannot know. */
type Stage =
  | { kind: 'search' }
  | { kind: 'manual' }
  | { kind: 'confirm'; book: BookResult }

const FORMATS: { value: BookFormat; label: string }[] = [
  { value: 'physical', label: 'Physical' },
  { value: 'digital', label: 'Digital' },
  { value: 'audio', label: 'Audio' },
]

function AddBookSheet({ open, onClose }: AddBookSheetProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState<Stage>({ kind: 'search' })
  const search = useBookSearch(stage.kind === 'search' ? query : '')

  /* A native dialog rather than a div with a high z-index: it takes the top
     layer, traps focus, makes the page behind it inert and closes on Escape,
     none of which is worth reimplementing by hand and all of which is worth
     having. */
  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  // Every visit starts at the beginning: an add flow left half-finished is
  // not a draft, and reopening to someone else's half-typed search is a bug.
  useEffect(() => {
    if (open) {
      setQuery('')
      setStage({ kind: 'search' })
    }
  }, [open])

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-label="Add a book"
      onClose={onClose}
      // Clicking the backdrop is a click on the dialog element itself, since
      // the panel inside it is what actually fills the sheet.
      onClick={(event) => event.target === dialog.current && onClose()}
    >
      <GlassSurface className={styles.panel}>
        <div className={styles.inner}>
          {stage.kind === 'search' && (
            <SearchStage
              query={query}
              onQuery={setQuery}
              state={search}
              onPick={(book) => setStage({ kind: 'confirm', book })}
              onManual={() => setStage({ kind: 'manual' })}
              onClose={onClose}
            />
          )}

          {stage.kind === 'manual' && (
            <ManualStage
              onBack={() => setStage({ kind: 'search' })}
              onReady={(book) => setStage({ kind: 'confirm', book })}
            />
          )}

          {stage.kind === 'confirm' && (
            <ConfirmStage
              book={stage.book}
              onBack={() => setStage({ kind: 'search' })}
              onDone={onClose}
            />
          )}
        </div>
      </GlassSurface>
    </dialog>
  )
}

/* ---- Stage one: search ---- */

interface SearchStageProps {
  query: string
  onQuery: (q: string) => void
  state: ReturnType<typeof useBookSearch>
  onPick: (book: BookResult) => void
  onManual: () => void
  onClose: () => void
}

function SearchStage({
  query,
  onQuery,
  state,
  onPick,
  onManual,
  onClose,
}: SearchStageProps) {
  return (
    <>
      <header className={styles.head}>
        <h2 className={styles.title}>Add a book</h2>
        <button type="button" className={styles.close} onClick={onClose}>
          Close
        </button>
      </header>

      <div className={styles.field}>
        <SearchIcon size={18} />
        <input
          className={styles.input}
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Title or author"
          aria-label="Search for a book by title or author"
          // The reader opened a sheet whose only purpose is this field.
          autoFocus
        />
      </div>

      <div className={styles.results}>
        {state.status === 'idle' && (
          <p className={styles.quiet}>
            Search by title or author, and the cover comes with it.
          </p>
        )}

        {state.status === 'searching' && (
          <p className={styles.quiet}>Looking through the shelves…</p>
        )}

        {state.status === 'done' &&
          state.results.map((book) => (
            <button
              key={book.id}
              type="button"
              className={styles.result}
              onClick={() => onPick(book)}
            >
              <BookCover
                size="thumb"
                width={44}
                title={book.title}
                author={book.author}
                covers={book.covers}
                hue={hueFor(book.id)}
                className={styles.resultCover}
              />
              <span className={styles.resultText}>
                <span className={styles.resultTitle}>{book.title}</span>
                <span className={styles.resultMeta}>
                  {[book.author, book.year, book.pages && `${book.pages} pages`]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
            </button>
          ))}

        {state.status === 'done' && state.results.length === 0 && (
          <p className={styles.quiet}>
            Nothing came back for “{query.trim()}”. It may be out of print, or
            spelled differently — you can put it on the shelf yourself.
          </p>
        )}
      </div>

      {/* Always offered, not only after a miss: the catalogues are a
          convenience, and a reader who knows the book should never have to
          fail a search first to be allowed to add it. */}
      <button type="button" className={styles.manualLink} onClick={onManual}>
        Add a book by hand
      </button>
    </>
  )
}

/* ---- Stage two: by hand ---- */

function ManualStage({
  onBack,
  onReady,
}: {
  onBack: () => void
  onReady: (book: BookResult) => void
}) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [pages, setPages] = useState('')
  const ready = title.trim().length > 0 && author.trim().length > 0

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault()
        if (!ready) return
        const clean = { title: title.trim(), author: author.trim() }
        onReady({
          id: seedFrom(clean.title, clean.author),
          ...clean,
          pages: Number(pages) || undefined,
          // No catalogue record means no photograph, which is exactly the
          // case the drawn covers exist for. Nothing to look up, nothing to
          // wait for, and the same cover every time it is drawn.
          covers: [],
        })
      }}
    >
      <header className={styles.head}>
        <button type="button" className={styles.close} onClick={onBack}>
          Back
        </button>
        <h2 className={styles.title}>By hand</h2>
      </header>

      <label className={styles.label}>
        Title
        <input
          className={styles.textInput}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </label>

      <label className={styles.label}>
        Author
        <input
          className={styles.textInput}
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          required
        />
      </label>

      <label className={styles.label}>
        Pages <span className={styles.optional}>optional</span>
        <input
          className={styles.textInput}
          type="number"
          inputMode="numeric"
          min="1"
          value={pages}
          onChange={(event) => setPages(event.target.value)}
        />
      </label>

      <LeafButton type="submit" disabled={!ready} className={styles.submit}>
        Continue
      </LeafButton>
    </form>
  )
}

/* ---- Stage three: how you are reading it ---- */

function ConfirmStage({
  book,
  onBack,
  onDone,
}: {
  book: BookResult
  onBack: () => void
  onDone: () => void
}) {
  const [format, setFormat] = useState<BookFormat>('physical')
  const [startedOn, setStartedOn] = useState(today())
  const [saving, setSaving] = useState(false)

  return (
    <form
      className={styles.form}
      onSubmit={async (event) => {
        event.preventDefault()
        setSaving(true)
        // put, not add: the id is the book's identity, so adding a book that
        // is already on the shelf updates it rather than failing on a
        // constraint or standing it beside itself.
        await db.books.put({ ...book, format, startedOn, addedAt: Date.now() })
        onDone()
      }}
    >
      <header className={styles.head}>
        <button type="button" className={styles.close} onClick={onBack}>
          Back
        </button>
        <h2 className={styles.title}>Onto the shelf</h2>
      </header>

      <div className={styles.chosen}>
        <BookCover
          width={92}
          title={book.title}
          author={book.author}
          covers={book.covers}
          hue={hueFor(book.id)}
        />
        <div className={styles.chosenText}>
          <p className={styles.chosenTitle}>{book.title}</p>
          <p className={styles.resultMeta}>{book.author}</p>
        </div>
      </div>

      <fieldset className={styles.formats}>
        <legend className={styles.label}>How are you reading it?</legend>
        <div className={styles.formatRow}>
          {FORMATS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={styles.format}
              aria-pressed={format === value}
              onClick={() => setFormat(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className={styles.label}>
        Started
        <input
          className={styles.textInput}
          type="date"
          value={startedOn}
          max={today()}
          onChange={(event) => setStartedOn(event.target.value)}
        />
      </label>

      <LeafButton type="submit" disabled={saving} className={styles.submit}>
        {saving ? 'Adding…' : 'Add to library'}
      </LeafButton>
    </form>
  )
}

/** Local date, not UTC: "today" is where the reader is, not where the clock
    happens to be zeroed. toISOString() would put half the world a day out. */
function today() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export default AddBookSheet
