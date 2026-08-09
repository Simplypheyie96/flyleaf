/* WHICH JACKET THIS BOOK WEARS.

   A search turns up several real editions of the same book — the first
   printing, the film tie-in, the school edition with the exam board's badge
   on it, the foreign-language jacket. Flyleaf picks the first one and, until
   now, that was the end of it. But the cover is the thing the reader looks at
   every day on their own shelf, and the one we happened to rank first is not
   always the one they own or the one they love.

   So the choice is theirs, and it is stored as an INDEX into the list we
   already keep, not as a URL. Two reasons. A url copied out would go stale
   the day a catalogue reorganises its files, and the list itself is already
   on the row — every candidate, in order — so an index costs one number and
   no new data. `DRAWN` is the escape from the real ones altogether: Flyleaf's
   own drawn cover, which needs no network and is the same every time.

   A pick out of range is ignored rather than corrected. It can only happen to
   a row written by a future version, and a book quietly wearing its default
   jacket is a better outcome than one that throws while a shelf is drawing. */

import type { Book } from '../data/db'
import db from '../data/db'

/** The reader asked for Flyleaf's own drawn cover, not a photographed one. */
export const DRAWN = -1

/** The covers to try, in order, honouring the reader's pick.

    Rotated rather than filtered: the pick goes first and the rest stay behind
    it, so the fall-through that `BookCover` already does still has somewhere
    to go if the chosen file 404s on the day. Every stored book renders
    through this — never `book.covers` directly. */
export function coversOf(book: Pick<Book, 'covers' | 'coverPick'>): string[] {
  const pick = book.coverPick
  if (pick === DRAWN) return []
  if (pick === undefined || pick < 0 || pick >= book.covers.length) return book.covers
  return [book.covers[pick], ...book.covers.filter((_, i) => i !== pick)]
}

/** Remember the jacket. `DRAWN` for our own. */
export function chooseCover(bookId: number, pick: number) {
  return db.books.update(bookId, { coverPick: pick })
}
