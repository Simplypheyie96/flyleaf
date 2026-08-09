/* Correcting a book that is already on the shelf.

   A book's id is `seedFrom(title, author)`. That is not a detail: it is the
   primary key, it is the seed the drawn cover is generated from, and it is
   what makes re-adding a book you already have an edit rather than a
   duplicate. It also means the one thing a reader most wants to fix — a
   missing author on a book carried over from somewhere that never asked for
   one — CHANGES THE BOOK'S IDENTITY.

   So a correction is sometimes an update and sometimes a move, and this file
   is the difference. Fix a page count and nothing moves. Fix the author and
   the book is written again under its true name, every keep and every sitting
   follows it there, and the old name is buried so the change travels as a
   change instead of arriving on the other device as a second copy.

   THE UID PROBLEM, which is the whole reason the move is not three lines. A
   keep with no uid is recognised by its content, and its content includes
   which book it hangs on — so moving it renames it, and the other device,
   still holding it under the old name, would never let go. Every keep that
   moves and has no uid is therefore given one first and its old name buried:
   the other device deletes what it was holding and takes the keep back under
   a name that can never drift again. A keep that already has a uid needs
   none of this and is left alone, which matters — burying a uid-named keep
   would tell the other device to delete the very row we are moving. */

import db, { type Book } from './db'
import { seedFrom } from '../books/seed'
import { bookGrave, bury, fingerprint, sittingGrave } from './graves'

/** Everything the edit sheet can change. Anything absent is left as it was. */
export interface Corrections {
  title: string
  author: string
  year?: number
  pages?: number
  covers?: string[]
  coverPick?: number
}

/** Raised when the correction would land on a book the reader already has.
    Not merged: two shelves' worth of keeps silently becoming one is not a
    correction, and undoing it would be impossible. */
export class AlreadyShelved extends Error {
  constructor() {
    super('You already have that book on your shelf.')
    this.name = 'AlreadyShelved'
  }
}

/** Write the correction. Returns the book's id afterwards — the same one when
    only the details changed, a new one when the book has been renamed and the
    caller has to send the reader to the new address. */
export async function reshelve(book: Book, next: Corrections): Promise<number> {
  const title = next.title.trim()
  const author = next.author.trim()
  if (!title) throw new Error('A book needs a title.')

  const now = Date.now()
  const fields = {
    title,
    author,
    year: next.year,
    pages: next.pages,
    covers: next.covers ?? book.covers,
    coverPick: next.coverPick ?? book.coverPick,
    editedAt: now,
  }

  const id = seedFrom(title, author)
  if (id === book.id) {
    await db.books.update(book.id, fields)
    return id
  }

  return db.transaction('rw', db.books, db.entries, db.sittings, db.graves, async () => {
    if (await db.books.get(id)) throw new AlreadyShelved()

    /* The keeps first, and their headstones before they move, because a
       fingerprint raised after the move names the new row rather than the old
       one it is supposed to be retiring. */
    const keeps = await db.entries.where('bookId').equals(book.id).toArray()
    const retired: string[] = []
    for (const keep of keeps) {
      if (keep.uid) continue
      retired.push(`e:${fingerprint(keep)}`)
      keep.uid = crypto.randomUUID()
    }
    for (const keep of keeps) {
      await db.entries.put({ ...keep, bookId: id, editedAt: now })
    }

    const sittings = await db.sittings.where('bookId').equals(book.id).toArray()
    for (const sit of sittings) {
      retired.push(sittingGrave(sit))
      await db.sittings.put({ ...sit, bookId: id })
    }

    /* `addedAt` is kept so a corrected book does not jump to the front of the
       shelf: the reader shelved it when they shelved it, and fixing its
       spelling is not the same as reading it today. */
    await db.books.put({ ...book, ...fields, id })
    await db.books.delete(book.id)
    await bury([bookGrave(book.id), ...retired])

    return id
  })
}
