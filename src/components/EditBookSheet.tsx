/* FIXING A BOOK THAT IS ALREADY ON THE SHELF.

   Every book on the shelf arrived from somewhere, and not every somewhere
   asked for as much as Flyleaf does. A book carried over from another app can
   land with no author, no year, no page count and no jacket — and until this
   sheet existed there was nowhere to say so. The cover mark was the only way
   in, and it hid itself whenever there were no covers to choose between,
   which is exactly the book that most needed fixing.

   So the mark is always there now, and it opens this: the same four facts the
   add sheet asks for, plus the jacket, in one form. The cover strip moved in
   here rather than staying under the journey head, because a book with no
   covers has to be able to go and find some — and the search that does that
   belongs beside the title and author it searches on, not beside a heading.

   The search runs once, quietly, when the sheet opens on a book with no
   jacket. Nothing it finds is applied: the strip simply gains tiles, and the
   pick stays where it was until the reader touches one. A sheet that changed
   a book's cover for it on open would be a sheet nobody could trust to open.

   The hard part is not here. Correcting an author changes `seedFrom(title,
   author)`, which is the book's primary key — so saving is `reshelve`, which
   moves the keeps and the sittings and buries the old name. This file only
   asks the questions. */

import { useEffect, useMemo, useState } from 'react'
import LeafButton from './LeafButton'
import Sheet from './Sheet'
import { CloseIcon } from './TabIcons'
import CoverStrip from './CoverChoice'
import { DRAWN, cleanCovers } from '../books/covers'
import { useBookSearch } from '../books/useBookSearch'
import { AlreadyShelved, reshelve } from '../data/reshelve'
import type { Book } from '../data/db'
import styles from './AddBookSheet.module.css'
import own from './EditBookSheet.module.css'

interface EditBookSheetProps {
  book: Book
  open: boolean
  onClose: () => void
  /** The book's id afterwards. Different from the one that went in whenever
      the title or author changed, so the caller can move the reader to the
      address the book now lives at. */
  onSaved: (id: number) => void
}

/** How many jackets the strip is allowed to offer. Past about eight the
    reader is no longer choosing, they are searching — and this is a sheet for
    fixing one book, not a catalogue browser. */
const MOST = 8

function EditBookSheet({ book, open, onClose, onSaved }: EditBookSheetProps) {
  const [title, setTitle] = useState(book.title)
  const [author, setAuthor] = useState(book.author)
  const [year, setYear] = useState(book.year ? String(book.year) : '')
  const [pages, setPages] = useState(book.pages ? String(book.pages) : '')
  const [pick, setPick] = useState(book.coverPick ?? (book.covers.length ? 0 : DRAWN))
  /* Empty until the reader asks, or until the sheet asks on their behalf for a
     book with no jacket at all. Held apart from the fields so that typing in
     the title does not fire a search on every keystroke: this is a correction
     form, not a search box. */
  const [hunt, setHunt] = useState('')
  /* What the reader has typed into the search field, held apart from `hunt`
     so that editing the words does not fire a request per keystroke. `hunt`
     only moves when they ask it to. */
  const [words, setWords] = useState('')
  const [saving, setSaving] = useState(false)
  const [snag, setSnag] = useState('')

  const found = useBookSearch(hunt)

  /* Alternating a trailing space when the words have not changed: the search
     keys on the string, so asking twice for the same title would otherwise do
     nothing — and asking twice is exactly what a reader does when the first
     attempt found nothing. The hook trims, so both forms are one search. */
  const look = () =>
    setHunt((was) => {
      const q = words.trim()
      return was === q ? `${q} ` : q
    })

  /* DROP THE AUTHOR AND ASK AGAIN, once, when the pair found nothing.
     `title + author` is the better query when both are right, and the worse
     one when either is not: catalogues match the whole string, so a single
     wrong or missing author turns a findable book into no results at all.
     Imported rows are exactly where that goes wrong, and a reader looking at
     an empty strip has no way to know the author was the problem.

     Only when the search genuinely came back empty — `unreachable` is the
     network, and retrying that would just fail twice — and only while the
     words still hold an author to drop, so this cannot loop. */
  useEffect(() => {
    if (found.status !== 'done' || found.results.length > 0) return
    const bare = title.trim()
    if (bare.length < 2 || hunt.trim() === bare) return
    setWords(bare)
    setHunt(bare)
  }, [found, hunt, title])

  // Every opening starts from what is actually stored. A half-typed correction
  // left behind by a sheet the reader closed is not a draft.
  useEffect(() => {
    if (!open) return
    setTitle(book.title)
    setAuthor(book.author)
    setYear(book.year ? String(book.year) : '')
    setPages(book.pages ? String(book.pages) : '')
    setPick(book.coverPick ?? (book.covers.length ? 0 : DRAWN))
    setSnag('')
    const q = `${book.title} ${book.author}`.trim()
    setWords(q)
    setHunt(book.covers.length ? '' : q)
  }, [open, book])

  /* The book's own jackets first, so a stored `coverPick` still points at the
     jacket it was chosen for however many the search adds behind it. */
  const covers = useMemo(() => {
    const all = cleanCovers(book.covers)
    if (found.status === 'done') {
      for (const result of found.results) {
        for (const url of cleanCovers(result.covers)) {
          if (all.length >= MOST) break
          if (!all.includes(url)) all.push(url)
        }
      }
    }
    return cleanCovers(all)
  }, [book.covers, found])

  async function save() {
    setSaving(true)
    setSnag('')
    try {
      const id = await reshelve(book, {
        title,
        author,
        year: Number(year) || undefined,
        pages: Number(pages) || undefined,
        covers,
        coverPick: pick,
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
    <Sheet open={open} onClose={onClose} label="Edit this book" name="edit-sheet">
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault()
          if (!saving && title.trim()) void save()
        }}
      >
        <header className={styles.head}>
          <h2 className={styles.title}>Edit this book</h2>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">
            <CloseIcon size={20} />
          </button>
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
            <span className={styles.labelLine}>
              Author <span className={styles.optional}>optional</span>
            </span>
            <input
              className={styles.textInput}
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder="Who wrote it"
            />
          </label>

          <div className={own.pair}>
            <label className={styles.label}>
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

            <label className={styles.label}>
              <span className={styles.labelLine}>
                Year <span className={styles.optional}>optional</span>
              </span>
              <input
                className={styles.textInput}
                type="number"
                inputMode="numeric"
                value={year}
                onChange={(event) => setYear(event.target.value)}
              />
            </label>
          </div>

          {/* A fieldset rather than a label: the strip is a set of choices, and
              a label wrapping a radio group names the wrong thing. */}
          <fieldset className={styles.group}>
            <legend className={styles.label}>Cover</legend>

            <CoverStrip
              title={title}
              author={author}
              covers={covers}
              pick={pick}
              onPick={setPick}
            />

            {covers.length === 0 && (
              <p className={own.note}>
                {found.status === 'searching'
                  ? 'Looking for covers…'
                  : found.status === 'unreachable'
                    ? 'The catalogues could not be reached. Try again when you are online.'
                    : 'No cover was found for this one, so Flyleaf drew its own.'}
              </p>
            )}

            {/* THE WORDS ARE THE READER'S, NOT THE ROW'S.
                This used to search `title + author` with no way to change it,
                and for an imported book that is the one case where those two
                fields are least likely to be what a catalogue would recognise
                — they came out of an app that could not store an author, so
                they arrive misspelt, abbreviated, or carrying a subtitle no
                edition uses. The owner found a cover for one of these in
                seconds by typing the name herself, and then could not get the
                same cover onto the same book from this sheet, because this
                sheet would only ever ask the question the row already had.

                So the query is a field. It is filled in from the book, which
                is right most of the time, and it can be corrected, which is
                the whole point. Submitting is what searches — this is inside a
                form, so the button is type=button and Enter is caught here,
                or a stray Return would save the book instead. */}
            <div className={own.hunt}>
              <label className={own.hide} htmlFor="cover-hunt">
                Words to search for
              </label>
              <input
                id="cover-hunt"
                className={own.field}
                type="search"
                value={words}
                placeholder="Title, or title and author"
                onChange={(event) => setWords(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    look()
                  }
                }}
              />
              <button
                type="button"
                className={own.go}
                onClick={look}
                disabled={found.status === 'searching' || words.trim().length < 2}
              >
                {found.status === 'searching' ? 'Looking…' : 'Look for covers'}
              </button>
            </div>
          </fieldset>
        </div>

        {snag && <p className={styles.snag}>{snag}</p>}

        <LeafButton type="submit" disabled={saving || !title.trim()} className={styles.submit}>
          {saving ? 'Saving…' : 'Save'}
        </LeafButton>
      </form>
    </Sheet>
  )
}

export default EditBookSheet
