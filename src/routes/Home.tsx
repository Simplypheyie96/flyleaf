import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import BookCover from '../components/BookCover'
import { coversOf } from '../books/covers'
import Bunny from '../rabbit/Bunny'
import Face from '../components/Face'
import Sparkle from '../components/Sparkle'
import PaperSurface from '../components/PaperSurface'
import { type Book } from '../data/db'
import { useLibrary, useKeepCount, useKeepTotal } from '../data/useLibrary'
import { inWords, useReadingTime } from '../data/sittings'
import { getFace, getHandle } from '../data/reader'
import Draw, { PREVIEW_BARE, PREVIEW_FIRST } from './home/Draw'
import Nook from './home/nook/Nook'
import pageStyles from './page.module.css'
import styles from './Home.module.css'

/* Home, on the reader's own shelf.

   It ran on sample data until now — a fixed book and three invented memories
   — which was right while the store was being built and is a lie the moment
   the reader has a shelf of their own. Everything on this screen is now read
   from Dexie: the book they are in the middle of, the last few things they
   kept, and the count under the cover.

   THE GREETING IS THE ONE HANDWRITTEN THING. The brief asks for a personal
   hand on the greeting so the app opens like a journal rather than a
   dashboard; the name is the only place it appears, because handwriting used
   twice stops being a signature. A reader who skipped the name gets the
   greeting without one, which reads perfectly well. */

function partOfDay() {
  const hour = new Date().getHours()
  if (hour < 5) return 'Still awake'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/** The book to put at the top: the one being read, and failing that the one
    most recently shelved. Started-and-unfinished is the real answer; a reader
    who has not said either way still has a book they added last night.

    IT CAN COME BACK EMPTY, and that is a fix rather than a gap. The last
    fallback used to be `books[0]` — any book at all — which meant a reader who
    had finished everything on their shelf was shown a book they had closed,
    under a heading that said they were currently reading it. Between the shelf
    and the heading, the heading is the thing that has to stay true: no
    unfinished book, no book here. What goes in its place is a state, not a
    blank — see `Idle` below. */
function inTheMiddleOf(books: Book[]): Book | undefined {
  const reading = books.filter((book) => !book.finishedOn)
  const started = reading.filter((book) => book.startedOn)
  return started[0] ?? reading[0]
}

function Hero({ book, pager }: { book: Book; pager?: ReactNode }) {
  const kept = useKeepCount(book.id)
  const readFor = useReadingTime(book.id)
  const pages = book.pages ?? 0
  const read = book.pagesRead ?? 0
  const pct = pages > 0 ? Math.min(100, Math.round((read / pages) * 100)) : null

  return (
    /* THE PAPER IS THE OUTSIDE NOW, NOT THE INSIDE. It used to be the link that
       wrapped the card; the pager underneath has to be pressable, and a button
       inside an anchor is neither valid nor operable. So the card holds two
       things — a link over the whole book, and, when there is more than one
       book open, a row of pages under it. Both inside the same sheet of paper,
       which is what the owner asked for: the other books reachable from within
       Currently reading rather than stacked below it. */
    <PaperSurface rotate={-0.4} className={styles.heroCard}>
      <Link to={`/book/${book.id}`} className={styles.heroLink}>
        <div className={styles.hero}>
          <BookCover
            title={book.title}
            author={book.author}
            covers={coversOf(book)}
            width={104}
            rotate={-2}
          />
          <div className={styles.heroInfo}>
            <h3 className={styles.heroTitle}>{book.title}</h3>
            <p className={styles.heroAuthor}>{book.author}</p>
            {pct !== null && (
              <div className={styles.gauge}>
                <div className={styles.gaugeHead}>
                  <span>
                    {read} / {pages}
                  </span>
                  <span>{pct}%</span>
                </div>
                <div
                  className={styles.gaugeTrack}
                  role="progressbar"
                  aria-label="Reading progress"
                  aria-valuenow={read}
                  aria-valuemin={0}
                  aria-valuemax={pages}
                >
                  <div className={styles.gaugeFill} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}
            {/* One quiet line, up to two facts: what has been kept, and how
                long this book has been sat with. The clock's minutes belong
                on the reading, not only on the clock. */}
            <p className={styles.entryHint}>
              {kept === undefined
                ? ' '
                : [
                    kept === 0
                      ? 'Nothing kept yet'
                      : `${kept} ${kept === 1 ? 'memory' : 'memories'} kept`,
                    readFor ? `${inWords(readFor)} of reading` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
            </p>
          </div>
        </div>
      </Link>
      {pager}
    </PaperSurface>
  )
}

/* EVERY OPEN BOOK, IN ONE CARD.

   The other books used to sit in a strip of thumbnails BELOW Currently reading,
   labelled "Also open", and the owner's objection was exact: they belong inside
   the card, reachable by swiping, with the card itself saying there is more.
   A second row under a hero card reads as a lesser class of book. Swiped
   through the card, they are the same thing — you are simply not looking at
   that one right now.

   A SCROLLER, NOT A CAROUSEL. Each book is a full-width page in a horizontally
   snapping strip, so the gesture is the platform's own: momentum, rubber-band
   at the ends, and a real scrollbar for a mouse. Nothing here re-implements
   dragging, which is the part of a hand-built carousel that always feels wrong.
   The dots are buttons for anyone not swiping — a pointer, a keyboard, a
   screen reader — and they say which book they go to.

   Order is the shelf's order and never re-sorts as you swipe; a card that
   rearranges itself under a thumb is unusable. */
function Reading({ books }: { books: Book[] }) {
  const strip = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState(0)

  /* Read the page from the scroll position rather than tracking it, so a swipe,
     a dot, a trackpad and a scrollbar all agree without any of them telling the
     others what they did. */
  const follow = useCallback(() => {
    const box = strip.current
    if (!box) return
    const page = Math.round(box.scrollLeft / Math.max(1, box.clientWidth))
    setAt(Math.min(books.length - 1, Math.max(0, page)))
  }, [books.length])

  if (books.length === 1) return <Hero book={books[0]} />

  function goTo(index: number) {
    const box = strip.current
    if (!box) return
    box.scrollTo({
      left: index * box.clientWidth,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }

  const pager = (
    <div className={styles.pager}>
      {/* Said in words as well as dots. Dots alone are a puzzle at a glance —
          "how many more?" is the question the card is here to answer. */}
      <span className={styles.pagerCount}>
        {at + 1} of {books.length} open
      </span>
      <div className={styles.pagerDots}>
        {books.map((book, index) => (
          <button
            key={book.id}
            type="button"
            className={styles.pagerDot}
            aria-current={index === at}
            aria-label={`Show ${book.title}`}
            onClick={() => goTo(index)}
          />
        ))}
      </div>
    </div>
  )

  return (
    <div
      ref={strip}
      className={styles.deck}
      onScroll={follow}
      aria-roledescription="carousel"
      aria-label="Books you have open"
    >
      {books.map((book) => (
        <div key={book.id} className={styles.page}>
          <Hero book={book} pager={pager} />
        </div>
      ))}
    </div>
  )
}

/* BETWEEN BOOKS. A shelf with books on it and nothing open on any of them.

   It is the one state on Home that is genuinely a pause rather than a lack:
   this reader has finished things. So it does not get the language of an empty
   screen, and it does not get a drawing of a book — it gets the rabbit sitting
   up and looking at the heading directly above it, which is the whole reason
   the pose is called `think`. The creature's eyeline runs UP out of the card
   and lands on the words "Currently reading", so the picture and the heading
   are one sentence: *nothing, yet, and we are both waiting on it.*

   Paper rather than a dashed leaf. This is the same slot the hero card lives
   in, and swapping the material as well as the contents would make the section
   look like it had been replaced instead of emptied. */
function Idle() {
  return (
    <PaperSurface rotate={-0.4} className={styles.idle}>
      <Bunny pose="think" size={126} />
      <p className={styles.idleLine}>Nothing open right now.</p>
      <p className={styles.idleHint}>
        Whatever you start next will sit here, with everything you keep from it
        one tap behind the cover.
      </p>
      <Link to="/library" className={styles.idleAct}>
        Pick the next one
      </Link>
    </PaperSurface>
  )
}

function Home() {
  const books = useLibrary()
  const [name, setName] = useState(getHandle)
  const [face, setFace] = useState(getFace)

  useEffect(() => {
    const sync = () => {
      setName(getHandle())
      setFace(getFace())
    }
    window.addEventListener('flyleaf-reader', sync)
    return () => window.removeEventListener('flyleaf-reader', sync)
  }, [])

  /* `undefined` is Dexie still opening. A shelf must not flash its own empty
     state on the way in — the same rule the Library keeps. */
  const shelf = books ?? []
  const settled = books !== undefined
  const book = inTheMiddleOf(shelf)
  /* Every book still open, the freshest first — the deck's pages, in the order
     `inTheMiddleOf` would have picked them.

     UNFINISHED IS THE TEST, NOT STARTED, and it has to match `inTheMiddleOf`
     exactly or books fall down the gap between them: a reader with two books
     going, one shelved without a start date, was once shown one and told
     nothing about the other. */
  const open = book ? [book, ...shelf.filter((b) => !b.finishedOn && b.id !== book.id)] : []
  const byId = new Map(shelf.map((b) => [b.id, b]))
  const firstRun = PREVIEW_FIRST || (settled && shelf.length === 0)

  /* What the reader has, under their name. Two counts and a middot — the
     smallest line on the page, and the only one on Home carrying a number
     about them rather than about a book.

     It is nothing until there is something: a masthead that greets you by
     name and then reports "0 books · 0 kept" is the app telling a first-time
     reader they have failed at it before they have started. The first run has
     its own card for that, with a field to do something about it.

     IT ALSO WAITS ON THE KEEPS, not just on the books, and that is a fix for a
     real contradiction rather than a preference. The card below decides it is
     a first run from the drawer being empty; this line decided it from the
     shelf being empty. Shelve five books without keeping anything and the two
     disagreed on screen — a tally reporting five books directly above a card
     asking "what are you reading right now?", which reads as the app having
     forgotten what it just said. Nothing kept, nothing counted: one state,
     one voice. */
  const shelved = shelf.length
  const total = useKeepTotal()
  const size =
    !firstRun && shelved > 0 && total
      ? `${shelved} ${shelved === 1 ? 'book' : 'books'} · ${total} kept`
      : null

  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.column}>
        {/* A NAME-PLATE: three lines of type, and the face across from them.

            The words are stacked because the hour and the name do different
            jobs and could not share a size on one line — 13 for the hour, 24 in
            the serif for the name, and a third line of plain fact under it. And
            the face sits at the far edge rather than in front of them, so the
            block reads as a plate with a portrait mounted on it. With one line
            of type that arrangement left a hole in the middle of the row; with
            three there is enough weight on the leading side to hold the span.

            The third line is the smallest thing here and the only number: it
            says how much of this is theirs. A greeting is pleasant and says
            nothing, and it was the whole masthead. */}
        <header className={styles.masthead}>
          <div className={styles.greeting}>
            <p className={styles.hello}>{name ? `${partOfDay()},` : `${partOfDay()}.`}</p>
            {name && <p className={styles.who}>{name}</p>}
            {size && <p className={styles.tally}>{size}</p>}
          </div>
          {/* Decorative: the name is right beside it, so alt text here would
              read the reader out twice. A reader who skipped the picker gets
              no disc rather than a placeholder one. */}
          {face && (
            <span className={styles.portrait}>
              <Face seed={face} size={48} />
              <Sparkle className={`${styles.sparkle} ${styles.sparkleMast}`} />
            </span>
          )}
        </header>

        {firstRun ? (
          /* NO "CURRENTLY READING" ON A SHELF WITH NOTHING ON IT. It was
             rendering above the first-run card, which is the app telling a
             reader who has never used it what they are in the middle of. A
             first run has one thing on it: the question, and the field to
             answer it in. (It also replaces a thin "Your shelf is waiting"
             card that said the same thing with less to do about it.) */
          <Draw books={byId} opening />
        ) : (
          /* `settled` and not `book`: the section has to render whether or not
             there is a book in progress, because "nothing open" is a state of
             this section rather than a reason to delete it. What must not
             render is the guess made while Dexie is still opening — a shelf
             must not flash its own empty state on the way in. */
          settled && (
            <>
              <section aria-labelledby="currently-reading">
                <div className={styles.stage}>
                  {/* The heading, first in the document and last in the paint
                      order — it is a tab mounted on the card's top edge rather
                      than a line of the page, so it leaves the greeting alone
                      at the top of the screen and belongs to the object it
                      names. It is also the thing the creature below walks
                      into. */}
                  <h2 id="currently-reading" className={styles.tab}>
                    Currently reading
                  </h2>
                  {book && !PREVIEW_BARE ? (
                    /* SOMETHING IS BEHIND THE PAGE. The rabbit lives in a strip
                       that ends exactly at the card's top edge and is clipped
                       there, so it is genuinely hidden by the paper rather than
                       drawn over it. It comes up at the far end of the card,
                       walks the ledge until it blunders into the tab, and backs
                       away — but it never leaves, because the ears stay over
                       the edge the whole time. See `.lurk` for the timeline.

                       Four wrappers, one transform each, because four tracks
                       run at once and an element has one `transform`: the walk
                       is `left` on `.lurkRun`, the ducking is `.lurkRise`, the
                       gait is `.lurkStep`, and the collision squash rides the
                       rabbit itself as `.lurkBump`. Nothing here reaches into
                       the drawing's own frames.

                       This is the same drawn rabbit as everywhere else in the
                       app — it used to be a second, hand-drawn one, and two
                       drawings of one character is a thing readers notice
                       (owner's call). 72 is the smallest rabbit in the app,
                       sized so the head above the ledge matches the old
                       drawing's 48px. Every number in `.lurk` is measured
                       against this pose at this size; change one, remeasure.

                       Only on this branch: `Idle` already has a rabbit sitting
                       inside the card, and two of them on one section turns a
                       character into a motif. */
                    <>
                      <span className={styles.lurk}>
                        <span className={styles.lurkRun}>
                          <span className={styles.lurkRise}>
                            <span className={styles.lurkStep}>
                              <Bunny pose="peek" size={72} className={styles.lurkBump} />
                            </span>
                          </span>
                        </span>
                      </span>
                      <Reading books={open} />
                    </>
                  ) : (
                    <Idle />
                  )}
                </div>
              </section>

              {/* What used to be "Recent memories" — a list of the last six
                  things kept, which is a record of what you already know you
                  did. One memory, pulled at random out of any book, is the
                  same material and the opposite feeling. See home/Draw.tsx. */}
              <Draw books={byId} reading={book} />

              {/* Third and last. The first two sections are made of the
                  reader's own books; this one is not about their library at
                  all, and that is the point — Home ends somewhere to sit
                  rather than with another thing to read. See home/nook/. */}
              <Nook reading={book} />
            </>
          )
        )}

        {/* THE TOUR IS GONE FROM HERE, and it is not moving further down the
            page either. Onboarding happens at the door — Welcome, two panels,
            once, before this screen is ever reached — and a nine-step tour
            card living on Home was a second onboarding for a reader who had
            already been onboarded. Home is the reader's own shelf, not a
            place the app explains itself. (Owner's call; it overrides 07's
            guided-discovery card.) */}
      </div>
    </main>
  )
}

export default Home
