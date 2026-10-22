/* CURRENTLY READING — the library card. The one lifted object on Home.

   Picked by the owner from three single-book prototypes (2026-10-22, branch
   `prototype/currently-reading`), replacing the shelf of spines: "just the
   book the user is reading". The cover sits on the left and the words on the
   right, like a card pulled from a catalogue drawer. The rabbit sits on the
   card's floor beside the last line, on the same ledge as the cover.

   Only the front open book shows. Any others are one quiet line under it
   that goes to the library, where they all are. */

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

export default function Shelf({ books, far }: Props) {
  const book = books[0]
  const more = books.length - 1
  const furthest = far?.[book.id] ?? 0
  const through = book.pages ? Math.min(furthest / book.pages, 1) : 0
  /* One fact to a line: beside the rabbit there is no room for both on one,
     and a line that breaks at its own dot reads as a mistake. */
  const facts = [
    book.startedOn ? `Opened ${short(book.startedOn)}` : null,
    book.pages ? `${book.pages} pages` : null,
  ].filter(Boolean)

  return (
    <div className={home.stage}>
      <h2 id="currently-reading" className={home.tab}>
        Currently reading
      </h2>
      <PaperSurface rotate={-0.4} className={s.plate}>
        <Link to={`/book/${book.id}`} className={s.card} draggable={false}>
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
              <span className={s.rabbit} aria-hidden="true">
                <Bunny pose="waiting" size={56} />
              </span>
            </div>
          </div>
        </Link>
        {more > 0 ? (
          <Link to="/library" className={s.more}>
            {more === 1 ? '1 more book open' : `${more} more books open`}
            {/* Remix Icon arrow-right-s-line. */}
            <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"
                 aria-hidden="true" focusable="false">
              <path d="M13.1717 12.0007L8.22192 7.05093L9.63614 5.63672L16.0001 12.0007L9.63614 18.3646L8.22192 16.9504L13.1717 12.0007Z" />
            </svg>
          </Link>
        ) : null}
      </PaperSurface>
    </div>
  )
}
