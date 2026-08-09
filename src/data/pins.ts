/* THREE BOOKS HELD AT THE FRONT.

   A shelf sorted by when a book was added is right for a shelf and wrong for
   a reader: the two or three books actually in your hands this month sink as
   soon as you shelve anything else, and they are the ones you open daily.
   A pin floats a book above whatever sort is running, so it stays put whether
   the shelf is arranged by title, by date, or by how much is kept in it.

   THE CAP IS THE FEATURE. Three, because a pin only means anything while it
   is scarce — a shelf where everything is pinned is just a shelf, and the
   moment the reader has to think about which of nine pinned books matters
   most, the thing has stopped saving them the work it existed to save.

   Stored as the moment it was pinned rather than as a flag, so the three keep
   a stable order among themselves — newest pin to the front, which is the
   same direction as everything else on this shelf. */

import db, { type Book } from './db'

export const MAX_PINS = 3

export function isPinned(book: Pick<Book, 'pinnedAt'>) {
  return book.pinnedAt !== undefined
}

/** Pinned books first, newest pin leading; everything else in the order it
    arrived in. Applied on top of the reader's chosen sort, not instead of it
    — a pin says "keep this at the front", not "sort by pinned". */
export function floatPins<T extends Pick<Book, 'pinnedAt'>>(books: T[]): T[] {
  const pinned = books.filter(isPinned).sort((a, b) => b.pinnedAt! - a.pinnedAt!)
  return pinned.length ? [...pinned, ...books.filter((b) => !isPinned(b))] : books
}

/** Pin or unpin, and say what happened so the caller can tell the reader.

    The cap is enforced here rather than in the UI, because the count it
    depends on lives in the database and a button that reads a stale one would
    let a fourth pin through. Unpinning is never refused. */
export async function togglePin(bookId: number): Promise<'pinned' | 'unpinned' | 'full'> {
  const book = await db.books.get(bookId)
  if (!book) return 'full'
  if (isPinned(book)) {
    await db.books.update(bookId, { pinnedAt: undefined, editedAt: Date.now() })
    return 'unpinned'
  }
  const count = await db.books.filter(isPinned).count()
  if (count >= MAX_PINS) return 'full'
  await db.books.update(bookId, { pinnedAt: Date.now(), editedAt: Date.now() })
  return 'pinned'
}
