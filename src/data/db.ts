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
  addedAt: number
}

export type BookFormat = 'physical' | 'digital' | 'audio'

const db = new Dexie('flyleaf') as Dexie & {
  books: EntityTable<Book, 'id'>
}

// Only the fields we actually query on: newest-first on the shelf, and title
// for the archive search in 06.
db.version(1).stores({ books: 'id, addedAt, title' })

export default db
