import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import BookCover from '../components/BookCover'
import { coversOf } from '../books/covers'
import { Mark } from '../brand/Wordmark'
import { IMPRINT } from '../brand/imprint'
import { longDate, shortDate, spanPair, todayISO } from '../components/date/dates'
import db, { formatsOf, type Book, type Entry } from '../data/db'
import { getHandle } from '../data/reader'
import { KIND } from '../journey/kinds'
import styles from './journal.module.css'

/* THE JOURNAL — everything kept, laid out as a book you can hold.

   The reader already has an export: one JSON file with every byte in it,
   restorable onto any device. That file is a BACKUP, and a backup is for a
   machine to read. It answers "if this phone dies, is my reading gone" and
   nothing else. Nobody has ever sat down with a .json and read their year.

   This answers the other half: a document. Covers, dates, the lines you copied
   out, in order, on paper — the thing the reader actually meant when they
   asked to have their journal in hand.

   WHY NO PDF LIBRARY. The obvious build is jsPDF or pdf-lib: a real .pdf blob
   out of the same download() the backup uses. It was the wrong trade three
   ways over. A PDF writer is ~350kB of dependency for one button. It cannot
   have the app's own faces without embedding the TTFs, so the journal would
   come out set in Times while every other surface is Garamond. And the covers
   are live SVG drawn from a seed, so each one would have to be rasterised
   through a canvas — which taints and fails outright on the real covers
   fetched from the catalogues.

   The browser already contains a typesetter and a PDF writer, and they are
   better than anything shipped in a bundle. So the journal is a real page,
   rendered by the same engine with the same fonts and the same drawn covers,
   and `window.print()` hands it to the reader's own "Save as PDF". Zero
   dependency, zero bundle, no rasterising, and the output is selectable text
   rather than a picture of text.

   AND IT IS A PAGE FIRST, A PRINT SECOND. `window.print()` has been unreliable
   inside an installed iOS PWA for years. If it silently does nothing, the
   reader is still standing on a complete, readable, scrollable journal they
   can print from the browser's own share menu — a working screen, not a dead
   button. That is the whole reason this is a route and not a click handler.

   THE PAGE IS ALWAYS LIGHT. A journal is paper. It re-declares the light
   values for the tokens its subtree reads (see journal.module.css) rather than
   inheriting the night sky, because a reader in dark mode who prints this
   should get a white page, not a black rectangle and an empty cartridge. */

type Grouped = { book: Book; keeps: Entry[] }

function mmss(seconds: number) {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/* A recording cannot be played off a sheet of paper, and a line of text saying
   so is a footnote where the app shows a voice. So the printed keep carries
   the SHAPE of it: the same bars, drawn from the recording's own id, so the
   same memo draws the same wave in the app and on the page. */
function bars(seed: number, n = 46) {
  let s = (seed || 1) >>> 0
  const out: number[] = []
  for (let i = 0; i < n; i += 1) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    out.push(0.22 + (s / 4294967296) * 0.78)
  }
  return out
}

function Wave({ seed }: { seed: number }) {
  const heights = useMemo(() => bars(seed), [seed])
  return (
    <svg className={styles.wave} viewBox="0 0 230 24" preserveAspectRatio="none" aria-hidden="true">
      {heights.map((h, i) => (
        <rect
          key={i}
          x={i * 5}
          y={12 - (h * 22) / 2}
          width={2.6}
          height={h * 22}
          rx={1.3}
        />
      ))}
    </svg>
  )
}

/* Every picture in the journey, held as an object URL for exactly as long as
   this screen is open. Built in one pass rather than per-card so the revoking
   is one list to walk — a leaked journey's worth of photographs is the kind of
   leak that only shows up on the device with the most to lose. */
function usePictures(keeps: Entry[]) {
  const [urls, setUrls] = useState<Record<number, string>>({})

  useEffect(() => {
    const made: Record<number, string> = {}
    for (const keep of keeps) {
      if (keep.type === 'image' && keep.media) made[keep.id] = URL.createObjectURL(keep.media)
    }
    setUrls(made)
    return () => {
      for (const url of Object.values(made)) URL.revokeObjectURL(url)
    }
  }, [keeps])

  return urls
}

function Meta({ keep }: { keep: Entry }) {
  const where = [
    keep.chapter,
    keep.page !== undefined ? `p. ${keep.page}` : undefined,
  ].filter(Boolean)

  return (
    <p className={styles.meta}>
      <span className={styles.kind}>{KIND[keep.type].one}</span>
      <span aria-hidden="true"> · </span>
      {shortDate(keep.keptOn)}
      {where.length > 0 && (
        <>
          <span aria-hidden="true"> · </span>
          {where.join(' · ')}
        </>
      )}
    </p>
  )
}

function Keep({ keep, picture }: { keep: Entry; picture?: string }) {
  const { type, text, name, stance, duration } = keep

  return (
    <article className={styles.keep} data-kind={type}>
      <Meta keep={keep} />

      {name && <h3 className={styles.name}>{name}</h3>}

      {type === 'voice' && (
        <div className={styles.voice}>
          <Wave seed={keep.id} />
          <span className={styles.length}>{mmss(duration ?? 0)}</span>
        </div>
      )}

      {type === 'image' && picture && (
        <img className={styles.picture} src={picture} alt={text || 'A picture you kept'} />
      )}

      {text && (
        <div className={styles.body} data-kind={type}>
          {type === 'voice' && <span className={styles.transcriptTag}>Transcribed voice note</span>}
          <p className={styles.bodyText}>{text}</p>
        </div>
      )}

      {stance && <p className={styles.stance}>{stance}</p>}
    </article>
  )
}

function Chapter({ book, keeps, pictures }: Grouped & { pictures: Record<number, string> }) {
  const span = spanPair(book.startedOn, book.finishedOn)
  const formats = formatsOf(book)
  const facts = [
    span.start ? `${span.start} — ${span.finish ?? 'still reading'}` : undefined,
    book.pages ? `${book.pages} pages` : undefined,
    formats.length ? formats.join(', ') : undefined,
  ].filter(Boolean)

  return (
    <section className={styles.chapter}>
      <header className={styles.chapterHead}>
        <BookCover
          title={book.title}
          author={book.author}
          covers={coversOf(book)}
          width={124}
          className={styles.cover}
        />
        <div className={styles.chapterWords}>
          <h2 className={styles.bookTitle}>{book.title}</h2>
          <p className={styles.author}>{book.author}</p>
          {facts.length > 0 && <p className={styles.facts}>{facts.join(' · ')}</p>}
          <p className={styles.tally}>
            {keeps.length} {keeps.length === 1 ? 'memory' : 'memories'}
          </p>
        </div>
      </header>

      <div className={styles.thread}>
        {keeps.map((keep) => (
          <Keep key={keep.id} keep={keep} picture={pictures[keep.id]} />
        ))}
      </div>
    </section>
  )
}

/* A BOOK WITH NOTHING KEPT FROM IT IS A LINE, NOT A CHAPTER.

   Every chapter opens a fresh page, so the first build spent a whole sheet of
   paper per empty book to print its cover and the words "nothing kept from
   this one yet" — three blank pages in a five-book journey, and the reader
   pays for those in ink. But dropping them entirely would be worse: they read
   the book. It is on the shelf, it belongs in the record.

   So it stays, as one line at the back, the way a real book lists what it did
   not have room to print in full. */
function AlsoRead({ books }: { books: Book[] }) {
  return (
    <section className={styles.also}>
      <h2 className={styles.alsoTitle}>Also on the shelf</h2>
      <p className={styles.alsoNote}>
        {books.length === 1 ? 'One book' : `${books.length} books`} you have read, with nothing kept
        from {books.length === 1 ? 'it' : 'them'} yet.
      </p>
      <ul className={styles.contents}>
        {books.map((book) => (
          <li key={book.id}>
            <span className={styles.contentsTitle}>{book.title}</span>
            <span className={styles.contentsAuthor}>{book.author}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Journal() {
  const sheet = useRef<HTMLDivElement>(null)
  const [readying, setReadying] = useState(false)
  const handle = getHandle()

  const shelf = useLiveQuery(async () => {
    const [books, entries] = await Promise.all([db.books.toArray(), db.entries.toArray()])

    // Chronological, because that is what a journal is. A book with no start
    // date falls back to the day it was shelved, which is the closest thing
    // the reader ever told us about when it entered their year.
    const when = (b: Book) => (b.startedOn ? Date.parse(b.startedOn) : b.addedAt)
    books.sort((a, b) => when(a) - when(b))

    const byBook = new Map<number, Entry[]>()
    for (const entry of entries) {
      const list = byBook.get(entry.bookId)
      if (list) list.push(entry)
      else byBook.set(entry.bookId, [entry])
    }
    for (const list of byBook.values()) {
      list.sort((a, b) => a.keptOn.localeCompare(b.keptOn) || a.createdAt - b.createdAt)
    }

    const all = books.map((book) => ({ book, keeps: byBook.get(book.id) ?? [] }))

    return {
      chapters: all.filter((c) => c.keeps.length > 0),
      // See AlsoRead — read, but with nothing written down yet.
      bare: all.filter((c) => c.keeps.length === 0).map((c) => c.book),
      books: books.length,
      keeps: entries.length,
      days: entries.map((e) => e.keptOn).sort(),
    }
  }, [])

  const everyKeep = useMemo(
    () => shelf?.chapters.flatMap((c) => c.keeps) ?? [],
    [shelf],
  )
  const pictures = usePictures(everyKeep)

  /* The document title is the filename.
     Both Chrome and Safari pre-fill "Save as PDF" from `document.title`, so
     leaving it alone hands the reader a file called Flyleaf.pdf — the name of
     the app that made it, which is the one fact they already know and the one
     they will never search for. Named for them and for what it is, it lands in
     a downloads folder already labelled. Restored on the way out so the tab
     does not keep somebody's journal title after they have left the page. */
  const title = handle ? `${handle}'s reading journal` : 'A reading journal'
  useEffect(() => {
    const was = document.title
    document.title = title
    return () => {
      document.title = was
    }
  }, [title])

  /* Fonts and photographs first, THEN the dialog. Chrome takes its snapshot the
     moment print() is called: a picture that has not decoded prints as a blank
     box and a face that has not loaded prints in the fallback, and neither
     failure is visible until the reader is holding the paper. */
  async function toPaper() {
    setReadying(true)
    try {
      await document.fonts.ready
      const images = sheet.current ? [...sheet.current.querySelectorAll('img')] : []
      await Promise.all(images.map((img) => img.decode().catch(() => undefined)))
    } catch {
      /* Print anyway — a journal set in the fallback face beats no journal. */
    } finally {
      setReadying(false)
    }
    window.print()
  }

  const empty = shelf ? shelf.books === 0 : true
  const first = shelf?.days[0]
  const last = shelf?.days[shelf.days.length - 1]

  return (
    <div className={styles.journal}>
      {/* Screen only header bar */}
      <div className={styles.bar}>
        <Link to="/settings" className={styles.back}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5 8 12l7 7" />
          </svg>
          Settings
        </Link>

        <button type="button" className={styles.print} onClick={toPaper} disabled={empty || readying}>
          {readying ? 'Getting it ready…' : 'Print or save as PDF'}
        </button>
      </div>

      <p className={styles.how}>
        Your browser&rsquo;s print window is where the PDF is made — choose
        <strong> Save as PDF</strong> as the destination, or
        <strong> Share &rarr; Print</strong> on an iPhone, then pinch the preview
        and save it to Files.
      </p>

      {/* The journal document: shows a clean document preview card representing the PDF as a whole */}
      <div className={styles.sheet} ref={sheet}>
        <section className={styles.plate}>
          <Mark size={54} className={styles.plateMark} />
          <h1 className={styles.plateTitle}>
            {handle ? `${handle}’s reading journal` : 'A reading journal'}
          </h1>
          {first && last && (
            <p className={styles.platePeriod}>
              {first === last ? longDate(first) : `${shortDate(first)} — ${shortDate(last)}`}
            </p>
          )}
          <p className={styles.plateTally}>
            {shelf?.books ?? 0} {shelf?.books === 1 ? 'book' : 'books'} · {shelf?.keeps ?? 0}{' '}
            {shelf?.keeps === 1 ? 'memory' : 'memories'}
          </p>

          {/* Table of contents overview */}
          {shelf && shelf.chapters.length > 0 && (
            <ol className={styles.contents}>
              {shelf.chapters.map(({ book }) => (
                <li key={book.id}>
                  <span className={styles.contentsTitle}>{book.title}</span>
                  <span className={styles.contentsAuthor}>{book.author}</span>
                </li>
              ))}
            </ol>
          )}

          <p className={styles.printed}>Printed {longDate(todayISO())}</p>
          <p className={styles.imprint}>{IMPRINT}</p>
        </section>

        {empty ? (
          <p className={styles.nothing}>
            There is nothing on the shelf yet. Keep a line from a book and it will be here.
          </p>
        ) : (
          <div className={styles.chaptersList}>
            {shelf?.chapters.map((chapter) => (
              <Chapter key={chapter.book.id} {...chapter} pictures={pictures} />
            ))}
            {shelf && shelf.bare.length > 0 && <AlsoRead books={shelf.bare} />}
          </div>
        )}
      </div>
    </div>
  )
}

export default Journal
