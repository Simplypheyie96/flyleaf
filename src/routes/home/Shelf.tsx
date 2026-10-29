/* CURRENTLY READING — the library card. The one lifted object on Home.

   Picked by the owner from three single-book prototypes (2026-10-22, branch
   `prototype/currently-reading`), replacing the shelf of spines: "just the
   book the user is reading". The cover sits on the left and the words on the
   right, like a card pulled from a catalogue drawer. The rabbit sits on the
   card's floor beside the last line, on the same ledge as the cover.

   Every open book gets the whole card (2026-10-29, "swipe the deck", picked
   from three on branch `prototype/currently-reading-many`): they lie side by
   side inside the one paper, no taller than a single card, and step by swipe
   or by Home's pager pill hung on the bottom edge opposite the heading tab. */

import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import BookCover from '../../components/BookCover'
import PaperSurface from '../../components/PaperSurface'
import Bunny from '../../rabbit/Bunny'
import { coversOf } from '../../books/covers'
import type { Book } from '../../data/db'
import home from '../Home.module.css'
import s from './Shelf.module.css'

/** "10 Jun", read at local midnight so a date never slips a day west of UTC. */
function short(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}

interface Props {
  /** Every open book, the one to show at the front first. */
  books: Book[]
  /** The furthest page anything was kept from, per book. */
  far?: Record<number, number>
}

function Card({ book, far, front, rabbit }: {
  book: Book
  far?: Record<number, number>
  front: boolean
  rabbit: boolean
}) {
  const furthest = far?.[book.id] ?? 0
  const through = book.pages ? Math.min(furthest / book.pages, 1) : 0
  /* One fact to a line: beside the rabbit there is no room for both on one,
     and a line that breaks at its own dot reads as a mistake. */
  const facts = [
    book.startedOn ? `Opened ${short(book.startedOn)}` : null,
    book.pages ? `${book.pages} pages` : null,
  ].filter(Boolean)

  return (
    <Link to={`/book/${book.id}`} className={s.card} draggable={false}
          tabIndex={front ? undefined : -1}>
      <BookCover title={book.title} author={book.author} covers={coversOf(book)}
                 width={104} rotate={0} />
      <div className={s.words}>
        <h3 className={s.title}>{book.title}</h3>
        <p className={s.author}>{book.author}</p>
        {furthest ? <p className={s.pickup}>Pick up at p. {furthest}</p> : null}
        {furthest && book.pages ? (
          <span className={s.gauge} aria-hidden="true">
            <span className={s.gaugeFill} style={{ inlineSize: `${through * 100}%` }} />
          </span>
        ) : null}
        <div className={s.floor}>
          {facts.length ? (
            <p className={s.fact}>
              {facts.map((fact) => <span key={fact}>{fact}</span>)}
            </p>
          ) : null}
          {rabbit ? (
            <span className={s.rabbit} aria-hidden="true">
              <Bunny pose="waiting" size={56} />
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

export default function Shelf({ books, far }: Props) {
  const deck = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState(0)
  const pitch = () => {
    const [a, b] = deck.current?.children ?? []
    return a && b ? (b as HTMLElement).offsetLeft - (a as HTMLElement).offsetLeft : 1
  }
  const step = (d: number) => {
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    deck.current?.scrollBy({ left: d * pitch(), behavior: still ? 'auto' : 'smooth' })
  }

  return (
    <div className={home.stage}>
      <h2 id="currently-reading" className={home.tab}>
        Currently reading
      </h2>
      <PaperSurface rotate={-0.4} className={s.plate}>
        <div ref={deck} className={s.deck}
             onScroll={() => setAt(Math.round((deck.current?.scrollLeft ?? 0) / pitch()))}>
          {books.map((book, i) => (
            <div key={book.id} className={s.slide} aria-hidden={i !== at || undefined}>
              {/* The rabbit waits on the front card only: one rabbit, and its
                  56px floor would push a long-titled slide past one card's height. */}
              <Card book={book} far={far} front={i === at} rabbit={i === 0} />
            </div>
          ))}
        </div>
      </PaperSurface>
      {books.length > 1 ? (
        <div className={`${home.pager} ${s.pager}`}>
          <button type="button" className={home.pagerStep} onClick={() => step(-1)}
                  disabled={at === 0} aria-label="Previous book">
            {/* Remix Icon arrow-left-s-line. */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M10.8284 12.0007L15.7782 16.9504L14.364 18.3646L8 12.0007L14.364 5.63672L15.7782 7.05093L10.8284 12.0007Z" />
            </svg>
          </button>
          <span className={home.pagerCount} aria-live="polite">
            <span className={home.pagerAt}>{at + 1}</span>/{books.length}
            <span className={home.away}> books open</span>
          </span>
          <button type="button" className={home.pagerStep} onClick={() => step(1)}
                  disabled={at === books.length - 1} aria-label="Next book">
            {/* Remix Icon arrow-right-s-line. */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M13.1717 12.0007L8.22192 7.05093L9.63614 5.63672L16.0001 12.0007L9.63614 18.3646L8.22192 16.9504L13.1717 12.0007Z" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  )
}
