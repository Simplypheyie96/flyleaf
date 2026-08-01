import { Link, useParams } from 'react-router-dom'
import BookCover from '../components/BookCover'
import PaperSurface from '../components/PaperSurface'
import {
  BackIcon,
  BookIcon,
  HeadphonesIcon,
  NoteIcon,
  QuoteIcon,
  ScreenIcon,
  VoiceIcon,
} from '../components/TabIcons'
import { fromISO } from '../components/date/dates'
import type { BookFormat, Entry, EntryType } from '../data/db'
import { useBook } from '../data/useBook'
import pageStyles from './page.module.css'
import styles from './BookJourney.module.css'

const FORMAT: Record<BookFormat, { label: string; Icon: typeof BookIcon }> = {
  physical: { label: 'Physical', Icon: BookIcon },
  digital: { label: 'Digital', Icon: ScreenIcon },
  audio: { label: 'Audio', Icon: HeadphonesIcon },
}

/* Which object each kind of memory is. `tone` is the paper it is written on
   and comes from PaperSurface's own set, so a quote here is the same tan sheet
   a quote is on the home timeline — the reader learns the colour once.

   Image and highlight are listed with no paper of their own yet: they are
   gate 2's work, and until they have one they fall back to plain paper rather
   than borrowing a colour that already means something else. */
const KIND: Record<
  EntryType,
  { label: string; tone?: 'quote' | 'note' | 'voice'; Icon: typeof BookIcon }
> = {
  quote: { label: 'Quote', tone: 'quote', Icon: QuoteIcon },
  note: { label: 'Note', tone: 'note', Icon: NoteIcon },
  voice: { label: 'Voice memo', tone: 'voice', Icon: VoiceIcon },
  image: { label: 'Image', Icon: NoteIcon },
  highlight: { label: 'Highlight', Icon: QuoteIcon },
}

/* GATE 1 PLACEHOLDERS — not a fixture, and not shipped past this gate.

   They are typed as real `Entry` rows and rendered through the same component
   the store will feed, so gate 2 replaces the source and touches no markup.
   Deliberately uneven: a long quote, a two-word note and a memo with no text
   are the three shapes that break a timeline, and a set of tidy equal cards
   would prove nothing about whether this layout holds. */
const PLACEHOLDERS: Entry[] = [
  {
    id: -1,
    bookId: 0,
    type: 'quote',
    text: 'She had the odd habit of reading the last page first, so that she would know, all the way through, exactly what she was losing.',
    page: 34,
    keptOn: '2026-06-02',
    createdAt: 1,
  },
  {
    id: -2,
    bookId: 0,
    type: 'note',
    text: 'Come back to this one.',
    chapter: 'Chapter 4',
    keptOn: '2026-06-09',
    createdAt: 2,
  },
  {
    id: -3,
    bookId: 0,
    type: 'voice',
    duration: 47,
    page: 118,
    keptOn: '2026-06-21',
    createdAt: 3,
  },
  {
    id: -4,
    bookId: 0,
    type: 'quote',
    text: 'Nothing was different, and everything was.',
    page: 203,
    keptOn: '2026-07-14',
    createdAt: 4,
  },
]

/** "2 June" — the day, without the year, because a journey is read as one
    stretch of time and the year is the same on nearly every row of it. */
function keptLabel(iso: string) {
  return fromISO(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
  })
}

/** "0:47". Minutes and seconds, never bare seconds: 47 on its own reads as a
    page number on a screen that is full of page numbers. */
function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/* The thread itself — a single stitched line running the height of whatever
   it is put inside.

   Drawn rather than built from a dashed border because a border is a machine
   line: perfectly straight, perfectly even, and the one thing this screen is
   not meant to look like. The path wanders by a pixel or so, the way a hand
   sewing a straight seam does.

   `preserveAspectRatio="none"` lets the 100-unit-tall viewBox stretch to any
   real height, which would normally drag the stroke and the dashes out of
   shape with it — `vector-effect: non-scaling-stroke` is what keeps a stitch
   the same length and the same weight on a journey of four entries and one of
   forty. */
function Thread({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 8 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d="M4 0 C 3.2 12, 4.8 24, 4 36 C 3.3 48, 4.7 60, 4 72 C 3.4 84, 4.6 92, 4 100" />
    </svg>
  )
}

function JourneyEntry({ entry }: { entry: Entry }) {
  const kind = KIND[entry.type]
  /* Alternating, and small. The tilt is what makes a card look laid down
     rather than placed; past a degree or so it stops reading as handmade and
     starts reading as broken. Driven off the row's own order so a card does
     not change its lean when something is kept before it. */
  const rotate = entry.createdAt % 2 === 0 ? 0.5 : -0.5

  const where =
    entry.chapter ?? (entry.page !== undefined ? `Page ${entry.page}` : null)

  return (
    <article className={styles.entry}>
      {/* The knot where this memory is tied on. Sits over the thread, in the
          page's own colour, so the stitch appears to pass behind it. */}
      <span className={styles.knot} aria-hidden="true" />

      {/* Not every card is taped. An identical strip at the identical spot on
          every sheet is the machine tell — the thing that turns a scrapbook
          back into a feed with decoration on it. */}
      <PaperSurface
        tone={kind.tone}
        rotate={rotate}
        taped={entry.createdAt % 2 === 1}
        className={styles.card}
      >
        <header className={styles.cardHead}>
          <span className={styles.chip} aria-hidden="true">
            <kind.Icon size={15} />
          </span>
          <span className={styles.kind}>{kind.label}</span>
          <span className={styles.when}>{keptLabel(entry.keptOn)}</span>
        </header>

        {entry.type === 'voice' ? (
          <p className={styles.pending}>
            {entry.duration !== undefined ? clock(entry.duration) : 'Recording'}
          </p>
        ) : (
          <p className={styles.text}>{entry.text}</p>
        )}

        {where && <p className={styles.where}>{where}</p>}
      </PaperSurface>
    </article>
  )
}

/* The journey: the inside cover of a book, then everything kept from it,
   hanging off one thread in the order it was kept.

   The thread runs down the leading edge rather than the middle. The plan drawn
   for this screen had entries alternating either side of a centre spine on the
   phone too, and the arithmetic does not survive it: the column is about 342px
   at 390px wide, so a card either side of a centre line gets ~165px, and after
   its own padding that is roughly 117px of text — twelve characters a line. A
   quote would come apart. Against the leading edge each card keeps ~310px and,
   just as usefully, there is only one place the next memory can be, so the
   order is never ambiguous. Alternation is worth having at iPad width, where
   there is room for it, and that is gate 5. */
function BookJourney() {
  const { id } = useParams()
  const parsed = Number(id)
  const book = useBook(Number.isFinite(parsed) ? parsed : undefined)
  const entries = PLACEHOLDERS

  // Dexie has not answered yet. Nothing, rather than a skeleton: the answer is
  // local and arrives within a frame or two, and a shape that flashes is worse
  // than a page that appears.
  if (book === undefined) return <main className={pageStyles.page} />

  const format = book?.format ? FORMAT[book.format] : null
  const pct =
    book?.pages && book.pagesRead
      ? Math.round((book.pagesRead / book.pages) * 100)
      : null

  return (
    <main className={pageStyles.page}>
      <div className={`${pageStyles.column} ${styles.journeyColumn}`}>
        <Link to="/library" className={styles.back}>
          <BackIcon size={18} />
          <span>Library</span>
        </Link>

        {book === null ? (
          <p className={styles.missing}>
            That book isn’t on your shelf. It may have been removed from this
            device.
          </p>
        ) : (
          <>
            {/* The inside cover. On the sky rather than on a card, because a
                card here would make the book one more keepsake among the
                keepsakes below instead of the thing they all belong to. */}
            <header className={styles.insideCover}>
              <BookCover
                title={book.title}
                author={book.author}
                covers={book.covers}
                width={112}
                rotate={-2}
              />
              <div className={styles.identity}>
                <h1 className={styles.title}>{book.title}</h1>
                <p className={styles.author}>{book.author}</p>

                <dl className={styles.facts}>
                  {format && (
                    <div className={styles.fact}>
                      <dt>Format</dt>
                      <dd>
                        <format.Icon size={14} />
                        {format.label}
                      </dd>
                    </div>
                  )}
                  {book.startedOn && (
                    <div className={styles.fact}>
                      <dt>Started</dt>
                      <dd>{keptLabel(book.startedOn)}</dd>
                    </div>
                  )}
                  {pct !== null && (
                    <div className={styles.fact}>
                      <dt>Progress</dt>
                      <dd>{pct}%</dd>
                    </div>
                  )}
                </dl>
              </div>
            </header>

            <section className={styles.journey} aria-label="Kept memories">
              <Thread className={styles.thread} />
              {entries.map((entry) => (
                <JourneyEntry key={entry.id} entry={entry} />
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  )
}

export default BookJourney
