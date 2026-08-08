import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import BookCover from './BookCover'
import LeafButton from './LeafButton'
import Sheet from './Sheet'
import FormatRow from './FormatRow'
import {
  BackIcon,
  CalendarIcon,
  CaretIcon,
  CloseIcon,
  NoteIcon,
  SearchIcon,
} from './TabIcons'
import CalendarPicker from './date/CalendarPicker'
import { longDate, todayISO } from './date/dates'
import { useBookSearch } from '../books/useBookSearch'
import type { BookResult } from '../books/sources'
import { seedFrom } from '../books/seed'
import db, { type BookFormat } from '../data/db'
import { addKeep } from '../journey/keeps'
import { landOnShelf } from '../motion/shelfLanding'
import styles from './AddBookSheet.module.css'

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

/* Three stages, one sheet. Search is where nearly everyone starts and ends;
   manual entry is the floor beneath it, so that no book — out of print, self
   published, in a language neither catalogue indexes well, or simply not
   there — can be refused by this app. Confirm is where the reader says how
   they are reading it, which is the only thing the catalogues cannot know. */
type Stage =
  | { kind: 'search' }
  | { kind: 'manual' }
  | { kind: 'confirm'; book: BookResult }

function AddBookSheet({ open, onClose, seed = '', firstKeep = '' }: AddBookSheetProps) {
  const field = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState<Stage>({ kind: 'search' })
  const search = useBookSearch(stage.kind === 'search' ? query : '')

  // Every visit starts at the beginning: an add flow left half-finished is
  // not a draft, and reopening to someone else's half-typed search is a bug.
  useEffect(() => {
    if (open) {
      setQuery(seed)
      setStage({ kind: 'search' })
    }
    // `seed` is deliberately not a dependency: it is what the sheet opened
    // with, and a reader editing the query afterwards must not have it typed
    // back over them if anything upstream re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  /* The reader opened a sheet whose only purpose is this field, so the field
     is where the caret belongs — and on a phone, that is what raises the
     keyboard.

     `autoFocus` cannot do it: React applies it when the input mounts, which
     is while the dialog is still closed and nothing inside it is focusable,
     and `showModal()` afterwards hands focus to the first focusable element
     instead — Close. Keying on the stage as well as on `open` covers the
     render where the sheet has opened but the stage has not been reset yet,
     and gives the field back to the reader when they come back from confirm. */
  useEffect(() => {
    if (open && stage.kind === 'search') field.current?.focus()
  }, [open, stage.kind])

  return (
    <Sheet open={open} onClose={onClose} label="Add a book" name="add-sheet">
      {stage.kind === 'search' && (
        <SearchStage
          field={field}
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
          firstKeep={firstKeep}
          onBack={() => setStage({ kind: 'search' })}
          onDone={onClose}
        />
      )}
    </Sheet>
  )
}

/* ---- Stage one: search ---- */

interface SearchStageProps {
  field: RefObject<HTMLInputElement | null>
  query: string
  onQuery: (q: string) => void
  state: ReturnType<typeof useBookSearch>
  onPick: (book: BookResult) => void
  onManual: () => void
  onClose: () => void
}

function SearchStage({
  field,
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
        <button
          type="button"
          className={styles.iconButton}
          onClick={onClose}
          aria-label="Close"
        >
          <CloseIcon size={20} />
        </button>
      </header>

      <div className={styles.field}>
        <SearchIcon size={18} />
        <input
          ref={field}
          className={styles.input}
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Title, author, or ISBN"
          aria-label="Search for a book by title, author, or ISBN"
        />
      </div>

      <div className={styles.results}>
        {state.status === 'idle' && (
          <p className={styles.quiet}>
            Search by title, author, or the ISBN printed on the back — the
            cover comes with it.
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

        {/* Said differently from a miss on purpose. A reader with no signal is
            not looking at a spelling mistake, and sending them off to check one
            wastes their time on a search that never left the phone. */}
        {state.status === 'unreachable' && (
          <p className={styles.quiet}>
            The catalogues didn’t answer — you may be offline. Try again in a
            moment, or put the book on the shelf yourself.
          </p>
        )}
      </div>

      {/* Always offered, not only after a miss: the catalogues are a
          convenience, and a reader who knows the book should never have to
          fail a search first to be allowed to add it.

          Which is exactly why it stopped being a text link. A link under a
          list of results reads as a footnote to the search, and this is the
          other half of the choice, not a consolation for the search failing.
          Dashed rather than filled because it is still the second route: an
          outline of a thing you have to fill in yourself. */}
      <button type="button" className={styles.manualButton} onClick={onManual}>
        <NoteIcon size={19} />
        Shelve it yourself
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
        <button
          type="button"
          className={styles.iconButton}
          onClick={onBack}
          aria-label="Back to search"
        >
          <BackIcon size={20} />
        </button>
        <h2 className={styles.title}>Shelve it yourself</h2>
      </header>

      <div className={styles.formBody}>
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
          {/* Both words in one flex item. Loose in the label they are two, and
              the label is a column, so “optional” dropped onto a line of its
              own and read as an instruction rather than as an aside. */}
          <span className={styles.labelLine}>
            Pages <span className={styles.optional}>optional</span>
          </span>
          <input
            className={styles.textInput}
            type="number"
            inputMode="numeric"
            min="1"
            value={pages}
            onChange={(event) => setPages(event.target.value)}
          />
        </label>
      </div>

      <LeafButton type="submit" disabled={!ready} className={styles.submit}>
        Continue
      </LeafButton>
    </form>
  )
}

/* ---- Stage three: how you are reading it ---- */

function ConfirmStage({
  book,
  firstKeep,
  onBack,
  onDone,
}: {
  book: BookResult
  firstKeep: string
  onBack: () => void
  onDone: () => void
}) {
  const navigate = useNavigate()
  /* A set, not a choice. Plenty of people read the paperback at home and
     listen to the same book in the car, and asking them to pick one is asking
     them which half of their reading to leave out. Physical is on to start
     with because it is the commonest answer and an empty row is a question
     nobody asked to be asked. */
  const [formats, setFormats] = useState<BookFormat[]>(['physical'])
  const [startedOn, setStartedOn] = useState(todayISO)
  /* The calendar is folded away to begin with. Almost every book is added the
     day it is started, so the answer is already right on the row and opening
     it is the exception, not the step. */
  const [picking, setPicking] = useState(false)
  const [saving, setSaving] = useState(false)

  const scroller = useRef<HTMLDivElement>(null)
  const picker = useRef<HTMLDivElement>(null)

  /* Follow the calendar down when it unfolds. The form's body is the sheet's
     scroller and the panel is the better part of 300px, so on a short phone
     opening it otherwise leaves the entire grid below the fold with nothing to
     say it is there.

     Measured and nudged by hand rather than `scrollIntoView`: that call walks
     every scrollable ancestor, and it is what scrolled the whole page out from
     under an earlier version of this control. */
  useEffect(() => {
    const panel = picker.current
    const box = scroller.current
    if (!picking || !panel || !box) return
    const over = panel.getBoundingClientRect().bottom - box.getBoundingClientRect().bottom
    if (over > 0) box.scrollTo({ top: box.scrollTop + over + 12, behavior: 'smooth' })
  }, [picking])

  return (
    <form
      className={styles.form}
      onSubmit={async (event) => {
        event.preventDefault()
        setSaving(true)
        await landOnShelf(
          book.id,
          // put, not add: the id is the book's identity, so adding a book that
          // is already on the shelf updates it rather than failing on a
          // constraint or standing it beside itself.
          async () => {
            await db.books.put({ ...book, formats, startedOn, addedAt: Date.now() })
            /* AND THE LINE THEY WROTE FIRST. It was typed before this book
               existed, on a screen that promised "the line you type is the
               first thing kept" — and until now it was thrown away at the
               moment they pressed the button. This is where the promise is
               paid: the book goes on the shelf and the sentence goes on its
               thread, in the same write, so the journey never renders a book
               with an empty spine and then pops a keep onto it.

               `keptOn` is today, not `startedOn`: the day this line was
               written down is a fact about the line, and someone shelving a
               book they began in March did not write this in March. */
            if (firstKeep)
              await addKeep({
                bookId: book.id,
                type: 'note',
                text: firstKeep,
                keptOn: todayISO(),
              })
          },
          onDone,
        )
        /* Straight to the thread, and only when there was a line. They asked
           a question by typing a sentence; landing back on Home would answer
           it with the same empty card they just filled in. Every other way
           into this sheet ends where it started, which is right — that reader
           came to shelve a book, not to be taken somewhere. */
        if (firstKeep) navigate(`/book/${book.id}`)
      }}
    >
      <header className={styles.head}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onBack}
          aria-label="Back to search"
        >
          <BackIcon size={20} />
        </button>
        <h2 className={styles.title}>Onto the shelf</h2>
      </header>

      <div ref={scroller} className={styles.formBody}>
        <div className={styles.chosen}>
          {/* The same name the shelf gives this book, so the browser treats
              the cover here and the book that appears there as one object and
              tweens the gap. Safe to hold while the sheet is open: the book is
              not on the shelf yet, so the name is unique until the moment it
              needs to stop being. */}
          <span
            className={styles.chosenCover}
            style={{ viewTransitionName: `book-${book.id}` } as CSSProperties}
          >
            <BookCover
              width={92}
              title={book.title}
              author={book.author}
              covers={book.covers}
            />
          </span>
          <div className={styles.chosenText}>
            <p className={styles.chosenTitle}>{book.title}</p>
            <p className={styles.resultMeta}>{book.author}</p>
          </div>
        </div>

        <fieldset className={styles.group}>
          <legend className={styles.label}>How are you reading it?</legend>
          <FormatRow value={formats} onChange={setFormats} />
        </fieldset>

        {/* The date, in our own control.

            This was a `<input type="date">` laid over the row at zero opacity,
            on the theory that a tap anywhere would land on the real input and
            open the platform's own picker. On a phone it does. On desktop
            Chrome it does not: clicking the body of a date input only focuses
            a segment, and the one thing that opens the calendar is the little
            indicator at its end — which at zero opacity is invisible. The row
            was unclickable for anyone on a laptop, and a control that works by
            accident of platform is not a control.

            So it is ours now, on every device: the row is a button, and the
            calendar unfolds underneath it. See CalendarPicker. */}
        <div className={styles.dateField}>
          <span className={styles.label} id="started-label">
            When did you start it?
          </span>
          <button
            type="button"
            className={styles.dateBox}
            onClick={() => setPicking((on) => !on)}
            aria-expanded={picking}
            aria-labelledby="started-label started-value"
          >
            <CalendarIcon size={20} />
            <span className={styles.dateValue} id="started-value">
              {longDate(startedOn)}
            </span>
            <CaretIcon size={18} className={styles.dateCaret} />
          </button>

          {picking && (
            <div ref={picker} className={styles.datePicker}>
              <CalendarPicker
                value={startedOn}
                onChange={setStartedOn}
                // Nobody starts a book after today, and a stray year in the
                // future would sort the shelf wrong forever.
                max={todayISO()}
                // The book's own threads, so the bloom on the chosen day is
                // the one already on its cover.
                seed={seedFrom(book.title, book.author)}
              />
            </div>
          )}
        </div>
      </div>

      <LeafButton type="submit" disabled={saving} className={styles.submit}>
        {saving ? 'Adding…' : 'Add to library'}
      </LeafButton>
    </form>
  )
}

export default AddBookSheet
