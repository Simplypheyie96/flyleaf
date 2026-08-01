import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import BookCover from '../components/BookCover'
import PaperSurface from '../components/PaperSurface'
import VoiceOrb from '../components/VoiceOrb'
import {
  BackIcon,
  BookIcon,
  HeadphonesIcon,
  HighlightIcon,
  ImageIcon,
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

type Tone = 'quote' | 'note' | 'voice' | 'image' | 'highlight'

const KIND: Record<
  EntryType,
  { label: string; tone: Tone; Icon: typeof BookIcon }
> = {
  quote: { label: 'Quote', tone: 'quote', Icon: QuoteIcon },
  note: { label: 'Note', tone: 'note', Icon: NoteIcon },
  voice: { label: 'Voice memo', tone: 'voice', Icon: VoiceIcon },
  image: { label: 'Image', tone: 'image', Icon: ImageIcon },
  highlight: { label: 'Highlight', tone: 'highlight', Icon: HighlightIcon },
}

/* ---------------------------------------------------------------------------
   PLACEHOLDERS — one of each of the five types, so the styling of all five can
   be looked at before there is any way to make one. Not fixtures, not seed
   data: they live here, they are never written to the database, and they are
   deleted the moment step 05 can keep a real memory.

   The two media blobs are made here rather than shipped as files, for the same
   reason. The recording is silent — what it is for is watching the orb breathe
   and the trace fill, and six seconds of a synthesised tone on a page about
   someone's reading would be worse than nothing.
--------------------------------------------------------------------------- */

function silentWav(seconds: number) {
  const rate = 8000
  const frames = rate * seconds
  const buf = new ArrayBuffer(44 + frames)
  const view = new DataView(buf)
  const tag = (at: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(at + i, s.charCodeAt(i))
  }
  tag(0, 'RIFF')
  view.setUint32(4, 36 + frames, true)
  tag(8, 'WAVE')
  tag(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, rate, true)
  view.setUint32(28, rate, true)
  view.setUint16(32, 1, true)
  view.setUint16(34, 8, true)
  tag(36, 'data')
  view.setUint32(40, frames, true)
  // Silence in 8-bit PCM is the middle of the range, not zero.
  new Uint8Array(buf, 44).fill(128)
  return new Blob([buf], { type: 'audio/wav' })
}

/* A photographed page: warm paper, a block of type too small to read, and the
   shadow of the gutter down one side. Abstract on purpose — a real photograph
   would be someone's, and an invented scene would be a picture this app is
   pretending a reader took. */
const PLACEHOLDER_PHOTO = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450">
     <defs>
       <linearGradient id="p" x1="0" y1="0" x2="1" y2="1">
         <stop offset="0" stop-color="#f6efe3"/><stop offset="1" stop-color="#e8dcc8"/>
       </linearGradient>
       <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
         <stop offset="0" stop-color="#000" stop-opacity="0.22"/>
         <stop offset="1" stop-color="#000" stop-opacity="0"/>
       </linearGradient>
     </defs>
     <rect width="600" height="450" fill="url(#p)"/>
     <rect width="46" height="450" fill="url(#g)"/>
     ${Array.from(
       { length: 14 },
       (_, i) =>
         `<rect x="92" y="${70 + i * 24}" width="${i % 5 === 4 ? 250 : 430}" height="6" rx="3" fill="#3b3229" opacity="0.5"/>`,
     ).join('')}
   </svg>`,
)}`

async function placeholderPhoto() {
  return (await fetch(PLACEHOLDER_PHOTO)).blob()
}

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
    text: 'Come back to this one. Something about the way she keeps the worst of it in the margins.',
    chapter: 'Chapter 4',
    keptOn: '2026-06-09',
    createdAt: 2,
  },
  {
    id: -3,
    bookId: 0,
    type: 'highlight',
    text: 'the sea did the same thing every day and it was never once the same',
    page: 96,
    keptOn: '2026-06-14',
    createdAt: 3,
  },
  {
    id: -4,
    bookId: 0,
    type: 'voice',
    text: 'Read this bit out to J. on the phone',
    duration: 6,
    page: 118,
    keptOn: '2026-06-21',
    createdAt: 4,
  },
  {
    id: -5,
    bookId: 0,
    type: 'image',
    text: 'The page I kept turning back to.',
    page: 164,
    keptOn: '2026-07-02',
    createdAt: 5,
  },
  {
    id: -6,
    bookId: 0,
    type: 'quote',
    text: 'Nothing was different, and everything was.',
    page: 203,
    keptOn: '2026-07-14',
    createdAt: 6,
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

/* The thread — one stitched segment, drawn beside the memory it ties on.
   Segments rather than a single line down the section, for two reasons: each
   one stretches its own wander differently, so no two stretches of thread are
   identical the way a repeating border would be; and a short element is a
   subject a scroll-driven timeline can actually measure, which is what lets
   the stitch draw itself as the reader arrives at it.

   `preserveAspectRatio="none"` lets the 100-unit-tall box stretch to any real
   height, which would normally drag the stroke and the dashes out of shape
   with it — `vector-effect: non-scaling-stroke` is what keeps a stitch the
   same length on a long card and a short one. */
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

/** A blob, as something an `img` or an `audio` can be pointed at. The handle is
    released on the way out; a journey scrolled end to end would otherwise leak
    one per picture it passed. */
function useObjectUrl(blob: Blob | undefined) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) return
    const made = URL.createObjectURL(blob)
    setUrl(made)
    return () => {
      URL.revokeObjectURL(made)
      setUrl(undefined)
    }
  }, [blob])
  return url
}

function KeptImage({ entry }: { entry: Entry }) {
  const url = useObjectUrl(entry.media)
  return (
    <figure className={styles.mount}>
      <div className={styles.print}>
        {url ? (
          /* The caption is the alt text when there is one. A reader writing
             "the page I kept turning back to" has described their own picture
             better than any generated string would. */
          <img src={url} alt={entry.text ?? 'A picture kept from this book'} />
        ) : (
          <p className={styles.absent}>This picture isn’t on this device.</p>
        )}
        {/* Photo corners. Four, because three is a mount that has come loose. */}
        <span className={styles.corner} data-at="tl" aria-hidden="true" />
        <span className={styles.corner} data-at="tr" aria-hidden="true" />
        <span className={styles.corner} data-at="bl" aria-hidden="true" />
        <span className={styles.corner} data-at="br" aria-hidden="true" />
      </div>
      {entry.text && (
        <figcaption className={styles.caption}>{entry.text}</figcaption>
      )}
    </figure>
  )
}

function EntryBody({ entry }: { entry: Entry }) {
  switch (entry.type) {
    case 'voice':
      return (
        <>
          <VoiceOrb
            media={entry.media}
            duration={entry.duration}
            seed={entry.id}
            label={`the memo kept on ${keptLabel(entry.keptOn)}`}
          />
          {entry.text && <p className={styles.caption}>{entry.text}</p>}
        </>
      )
    case 'image':
      return <KeptImage entry={entry} />
    case 'highlight':
      /* The stripe goes on the inline span, not the paragraph: a marker
         follows the words to the end of each line and stops, and a background
         on the block would run the full width of the card and read as a
         coloured panel. */
      return (
        <p className={styles.marked}>
          <span>{entry.text}</span>
        </p>
      )
    case 'note':
      return <p className={`${styles.text} ${styles.ruled}`}>{entry.text}</p>
    default:
      return <p className={styles.text}>{entry.text}</p>
  }
}

function JourneyEntry({ entry, last }: { entry: Entry; last: boolean }) {
  const kind = KIND[entry.type]
  /* Alternating, and small. The tilt is what makes a card look laid down
     rather than placed; past a degree or so it stops reading as handmade and
     starts reading as broken. Driven off the row's own order so a card does
     not change its lean when something is kept before it. */
  const rotate = entry.createdAt % 2 === 0 ? 0.5 : -0.5

  const where =
    entry.chapter ?? (entry.page !== undefined ? `Page ${entry.page}` : null)

  return (
    <article className={styles.entry} data-last={last || undefined}>
      <Thread className={styles.thread} />
      {/* The knot this memory is tied on by. Over the thread, in the page's
          own colour, so the stitch appears to pass behind it. */}
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

        <EntryBody entry={entry} />

        {where && <p className={styles.where}>{where}</p>}
      </PaperSurface>
    </article>
  )
}

/* The journey: the inside cover of a book, then everything kept from it,
   hanging off one thread in the order it was kept.

   On a phone the thread runs down the leading edge rather than the middle. The
   plan drawn for this screen had entries alternating either side of a centre
   spine on the phone too, and the arithmetic does not survive it: the column is
   about 342px at 390px wide, so a card either side of a centre line gets
   ~165px, and after its own padding that is roughly 117px of text — twelve
   characters a line. A quote would come apart. Against the leading edge each
   card keeps ~310px and, just as usefully, there is only one place the next
   memory can be, so the order is never ambiguous. The centre spine and the
   alternation arrive at the width that can pay for them, near 760px. */
function BookJourney() {
  const { id } = useParams()
  const parsed = Number(id)
  const book = useBook(Number.isFinite(parsed) ? parsed : undefined)
  const entries = usePlaceholders()

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
              <div className={styles.opening}>
                <BookCover
                  title={book.title}
                  author={book.author}
                  covers={book.covers}
                  width={112}
                  rotate={-2}
                />
              </div>
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
              {entries.map((entry, i) => (
                <JourneyEntry
                  key={entry.id}
                  entry={entry}
                  last={i === entries.length - 1}
                />
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  )
}

/* Placeholder media, attached after the first paint. Both blobs are built in
   the browser, and neither is worth holding up the page for. Goes with the
   placeholders themselves at step 05. */
function usePlaceholders() {
  const [entries, setEntries] = useState(PLACEHOLDERS)
  useEffect(() => {
    let live = true
    void placeholderPhoto().then((photo) => {
      if (!live) return
      setEntries((current) =>
        current.map((entry) => {
          if (entry.type === 'image') return { ...entry, media: photo }
          if (entry.type === 'voice')
            return { ...entry, media: silentWav(entry.duration ?? 6) }
          return entry
        }),
      )
    })
    return () => {
      live = false
    }
  }, [])
  return entries
}

export default BookJourney
