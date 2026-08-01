/* The reader's own library, on the reader's own device.

   Local-first is not a fallback here, it is the product: a journey through a
   book is private, and nothing in this file is uploaded anywhere. Sync (09)
   will be opt-in and will layer on top of this store rather than replace it,
   so the schema is kept small and additive — new optional fields, never a
   reshaped row. */

import Dexie, { type EntityTable } from 'dexie'

export interface Book {
  /* seedFrom(title, author) — the same number that draws the cover. Using it
     as the primary key means the shelf cannot hold the same book twice, and
     that re-adding a book you already have edits it instead of duplicating
     it, which is the behaviour a reader expects without being told. */
  id: number
  title: string
  author: string
  year?: number
  pages?: number
  /** Real cover URLs to try, in order. Empty means a drawn cover. */
  covers: string[]
  format?: BookFormat
  /** ISO yyyy-mm-dd. A date, not a timestamp: nobody remembers the hour. */
  startedOn?: string
  /** Set the day the book is finished. Its absence is what "still reading"
      means — there is no status field to contradict it. */
  finishedOn?: string
  /** How far in. Pages rather than a percentage, because a reader knows the
      number on the page in front of them and does not know what fraction of
      the book it is. The percentage is derived where it is shown. */
  pagesRead?: number
  addedAt: number
}

export type BookFormat = 'physical' | 'digital' | 'audio'

/** The five things a reader keeps. Quote and highlight are deliberately not
    one type: a quote is chosen and copied out, a highlight is a stripe left
    while reading, and they are remembered differently. */
export type EntryType = 'quote' | 'note' | 'voice' | 'image' | 'highlight'

/** One kept memory, hanging off one book's thread.

    Nearly every field is optional because the types share this row rather than
    each having a table of their own: a voice memo has a blob and a duration
    and no text, a quote is the other way around. The alternative — five
    tables, or a `data` bag typed per variant — buys strictness the app never
    spends, and costs the one thing the journey screen actually needs, which is
    reading every memory for a book in one ordered query. */
export interface Entry {
  id: number
  /** The book this hangs off — `Book.id`, the cover seed. */
  bookId: number
  type: EntryType
  /** The quotation, the note, the highlighted passage. */
  text?: string
  /** Where in the book it happened. Both are optional and both can be set: a
      reader who knows the page usually knows the chapter too, and one who is
      listening knows neither. */
  page?: number
  chapter?: string
  /** Recording or picture, held on the device. Never a URL: an entry that
      needed the network to be looked at would not be a kept thing. */
  media?: Blob
  /** Seconds. Voice only, and read off the recording rather than typed. */
  duration?: number
  /** ISO yyyy-mm-dd — the day the memory was kept, which is the date shown.
      Separate from `createdAt` so a memory added from an old note can carry
      the day it happened rather than the day it was typed in. */
  keptOn: string
  createdAt: number
}

const db = new Dexie('flyleaf') as Dexie & {
  books: EntityTable<Book, 'id'>
  entries: EntityTable<Entry, 'id'>
}

// Only the fields we actually query on: newest-first on the shelf, and title
// for the archive search in 06.
db.version(1).stores({ books: 'id, addedAt, title' })

/* Additive, as the note at the top of this file promises. `books` is restated
   unchanged because a version declares the whole schema, not the difference —
   leaving it out would drop the table rather than keep it.

   `entries` is compound-indexed on [bookId+createdAt] because that is the only
   question the journey asks: every memory for this book, in the order it was
   kept. A plain `bookId` index would make Dexie sort the result in memory
   afterwards, and the new fields on `Book` need no migration step at all —
   they are optional, so every row already written is already valid. */
db.version(2).stores({
  books: 'id, addedAt, title',
  entries: '++id, bookId, [bookId+createdAt]',
})

export default db
