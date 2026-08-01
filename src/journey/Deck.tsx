/* B · The Deck — kind is the spine.

   A journey is not one substance. A quote is the book talking, a note is the
   reader talking, a voice memo is the reader talking out loud in a car, and a
   photograph is neither. Down a single column those six things interleave into
   something that has to be read one card at a time to be understood at all.

   So this reading sorts by what a thing *is*. The book gets a real masthead —
   the cover run off the leading edge the way a printed page does it — and
   everything kept is dealt into a deck per kind, one deck at a time, swiped
   through sideways. Nothing repeats the kind on the cards, because the tab
   above them already said it once. */

import { useRef, useState } from 'react'
import BookCover from '../components/BookCover'
import Keep, { KIND } from './Keep'
import { count, formatPhrase } from './lexicon'
import { depthOf, type Reading } from './layout'
import type { EntryType } from '../data/db'
import type { Row } from './order'
import styles from './Deck.module.css'

/* The dealing order, and it is not alphabetical. The book's own words first,
   then the reader's, then the things that are not words at all, then the
   strands — which are about the book rather than out of it, and so come last
   the way an afterword does. */
const DEAL: EntryType[] = ['quote', 'highlight', 'note', 'voice', 'image', 'strand']

const PLURAL: Record<EntryType, string> = {
  quote: 'Quotes',
  highlight: 'Marks',
  note: 'Notes',
  voice: 'Voice',
  image: 'Pictures',
  strand: 'Strands',
}

function Deck({
  book,
  keeps,
  strands,
  rows,
  sift,
  tools,
  sentinel,
  onMenu,
  onMotif,
  onAbout,
}: Reading) {
  const [picked, setPicked] = useState<EntryType | null>(sift.type)
  const [at, setAt] = useState(0)
  const track = useRef<HTMLDivElement>(null)

  const depth = depthOf(book)

  const decks: { type: EntryType; rows: Row[] }[] = DEAL.map((type) => ({
    type,
    rows: rows.filter((r) => r.keep.type === type),
  })).filter((d) => d.rows.length > 0)

  /* The picked deck may have been emptied by a sift since it was picked, so
     the first deck that still has cards in it is the answer either way. */
  const deck = decks.find((d) => d.type === picked) ?? decks[0]

  function deal(type: EntryType) {
    setPicked(type)
    setAt(0)
    track.current?.scrollTo({ left: 0 })
  }

  /* Which card is under the reader, from the scroller's own position — no
     observer and no loop, and nothing on the page animates off it. The count
     is text, and text that changes is the cheapest thing a scroll can drive. */
  function follow() {
    const el = track.current
    if (!el || !el.firstElementChild) return
    const step = (el.firstElementChild as HTMLElement).offsetWidth + parseFloat(
      getComputedStyle(el).columnGap || '0',
    )
    setAt(step > 0 ? Math.round(el.scrollLeft / step) : 0)
  }

  return (
    <>
      {/* The masthead. The cover runs off the leading edge of the column — the
          one place in the app anything is allowed to, and the reason this
          reading looks like a printed spread rather than a list. */}
      <header className={styles.masthead}>
        <div className={styles.plate}>
          <BookCover
            title={book.title}
            author={book.author}
            covers={book.covers}
            width={150}
          />
        </div>

        <h1 className={styles.title}>{book.title}</h1>
        <p className={styles.author}>{book.author}</p>

        <div className={styles.chips}>
          <span className={styles.chip}>{formatPhrase(book) || 'not marked'}</span>
          {depth !== null && (
            <span className={styles.chip}>{`p. ${book.pagesRead} of ${book.pages}`}</span>
          )}
          <span className={styles.chip}>
            {count(keeps.length, { one: 'keep', many: 'keeps' })}
          </span>
          <button type="button" className={styles.about} onClick={onAbout}>
            About this book
          </button>
        </div>
      </header>

      <div ref={sentinel} aria-hidden="true" />

      {tools}

      {deck ? (
        <>
          {/* The decks themselves. A scroller rather than a segmented control:
              six kinds do not fit across a phone, and a reader with two kinds
              should not be looking at four empty tabs. */}
          <div className={styles.tabs} role="tablist" aria-label="What kind to look at">
            {decks.map(({ type, rows: cards }) => {
              const on = type === deck.type
              return (
                <button
                  key={type}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  className={styles.tab}
                  data-on={on || undefined}
                  onClick={() => deal(type)}
                >
                  {PLURAL[type]}
                  <span className={styles.tally}>{cards.length}</span>
                </button>
              )
            })}
          </div>

          <div
            ref={track}
            className={styles.track}
            onScroll={follow}
            role="tabpanel"
            aria-label={PLURAL[deck.type]}
          >
            {deck.rows.map((row) => (
              <div key={row.keep.id} className={styles.card}>
                <Keep
                  keep={row.keep}
                  strands={strands}
                  onMenu={onMenu}
                  onMotif={onMotif}
                  unlabelled
                />
              </div>
            ))}
          </div>

          {/* Where you are in the deck, as a number. Not pips: five of them
              beside each other on a fast swipe read as one smeared bar, and a
              deck of thirty cannot have pips at all. */}
          <p className={styles.place} aria-hidden="true">
            <span>{Math.min(at + 1, deck.rows.length)}</span>
            {' / '}
            <span>{deck.rows.length}</span>
            <span className={styles.placeKind}>{KIND[deck.type].label}</span>
          </p>
        </>
      ) : (
        <p className={styles.absent}>
          {keeps.length
            ? 'Nothing here matches that. Change what you are looking for, or show everything again.'
            : 'The first deck starts with the first thing you keep.'}
        </p>
      )}
    </>
  )
}

export default Deck
