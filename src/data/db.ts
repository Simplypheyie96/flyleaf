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
  /** Every way this book is being read.

      An array rather than the single `format` above it, because a great many
      readers do two at once — the paperback at home and the audiobook in the
      car are the same book and the same journey, and a field that can only
      hold one of them makes the reader choose which half to tell us about.

      `format` is kept, unread by new code, so that a shelf written before
      this field existed still opens. `formatsOf()` is the only thing that
      should ever look at either. */
  formats?: BookFormat[]
}

export type BookFormat = 'physical' | 'digital' | 'audio'

/** What a book is being read as, from whichever of the two fields a given row
    happens to carry. One place, so nothing else has to remember the history. */
export function formatsOf(book: Pick<Book, 'format' | 'formats'>): BookFormat[] {
  if (book.formats?.length) return book.formats
  return book.format ? [book.format] : []
}

/** The seven things a reader keeps.

    Four of them are things taken out of the book — a line, a thought, thirty
    seconds of your own voice, a picture. Three are things you build *about*
    the book while you read it: a person you are following, a place you want
    to remember, and a suspicion you are testing. All seven live in one table
    because they all hang on the same thread on the same day, and because the
    journey's only real question — everything kept from this book, in order —
    should stay one query.

    `highlight` is gone: a highlight was a quote with a weaker claim on the
    page, and two ways to keep a line is one too many. `strand` is gone too,
    replaced by `thread`, which is an ordinary keep with a stance rather than
    a second table with a lifespan. */
export type EntryType =
  | 'quote'
  | 'note'
  | 'voice'
  | 'image'
  | 'character'
  | 'place'
  | 'thread'

/** How sure the reader is, on a plot thread. The whole point of the type: a
    hunch that hardens into a certainty is the shape of reading a novel, and
    the journey draws that hardening as the link between the notches. */
export type Stance = 'hunch' | 'suspicion' | 'certain'

/** One kept memory, hanging off one book's thread.

    Nearly every field is optional because the types share this row rather than
    each having a table of their own: a voice memo has a blob and a duration
    and no text, a quote is the other way around. The alternative — seven
    tables, or a `data` bag typed per variant — buys strictness the app never
    spends, and costs the one thing the journey screen actually needs, which is
    reading every memory for a book in one ordered query. */
export interface Entry {
  id: number
  /** The book this hangs off — `Book.id`, the cover seed. */
  bookId: number
  type: EntryType
  /** The words: the quotation, the note, the caption under a picture, what
      the reader has to say about a person, a place or a suspicion. Every type
      except voice can carry text, and voice can too once it is transcribed. */
  text?: string
  /** Where in the book it happened. Both are optional and both can be set: a
      reader who knows the page usually knows the chapter too, and one who is
      listening knows neither.

      Per entry, never per book: the page a line is on is a fact about that
      line. A book-level "what page are you on" is `Book.pagesRead`, and the
      two are not the same number. */
  page?: number
  chapter?: string
  /** Recording or picture, held on the device. Never a URL: an entry that
      needed the network to be looked at would not be a kept thing.

      Voice and image both use it, and so does a place the reader has pinned
      a map to. */
  media?: Blob
  /** Seconds. Voice only, and read off the recording rather than typed. */
  duration?: number
  /** ISO yyyy-mm-dd — the day the memory was kept, which is the date shown.
      Separate from `createdAt` so a memory added from an old note can carry
      the day it happened rather than the day it was typed in. */
  keptOn: string
  createdAt: number
  /** The reader's own words for what this is about — "grief", "the sea",
      "things the father won't say". Free text on purpose: a fixed list would
      be somebody else's reading of the book. */
  motifs?: string[]
  /** What it is called — a character's name, a place's name. The heading of
      the card, kept apart from `text` so the two can be styled and searched
      as the different things they are. */
  name?: string
  /** `thread` only — how sure the reader currently is. */
  stance?: Stance
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

/* Strands, motifs and multi-format, all additive again — every row already on
   a reader's device is still valid under this version, so there is no upgrade
   function to write and nothing to go wrong on the way in.

   `*motifs` is a multiEntry index: Dexie indexes each string in the array
   separately, which is what makes "everything I marked 'grief', across every
   book" a query rather than a scan. The archive search in 06 is the caller;
   the journey itself already has every entry in memory and filters there. */
db.version(3).stores({
  books: 'id, addedAt, title',
  entries: '++id, bookId, [bookId+createdAt], strandId, *motifs',
  strands: '++id, bookId',
})

/* The one non-additive version, and the note at the top of this file is worth
   re-reading before adding another: strands were a second table with a
   lifespan, and they did not survive contact with a reader. `strands: null`
   tells Dexie to drop the table outright, and the `strandId` index goes with
   it.

   Nothing is thrown away. A strand keep was always an entry, so it stays an
   entry — it becomes a plot thread, which is the same idea without the
   bookkeeping. A highlight becomes a quote, because it always was one.
   Rows written before this version are rewritten in place here rather than
   translated on every read, so nothing downstream has to know the old shape
   existed.

   `upgrade` runs inside Dexie's own transaction, once, on a device that has
   the old schema. A device installing the app today jumps straight to 4 and
   never enters it. */
db.version(4)
  .stores({
    books: 'id, addedAt, title',
    entries: '++id, bookId, [bookId+createdAt], *motifs',
    strands: null,
  })
  .upgrade((tx) =>
    tx
      .table<Entry & { strandId?: number; strandMark?: string }>('entries')
      .toCollection()
      .modify((entry) => {
        const was = entry.type as EntryType | 'highlight' | 'strand'
        if (was === 'highlight') entry.type = 'quote'
        if (was === 'strand') {
          entry.type = 'thread'
          // The weakest stance, because a strand recorded no confidence at
          // all and claiming certainty on the reader's behalf would be a lie.
          entry.stance = 'hunch'
        }
        delete entry.strandId
        delete entry.strandMark
      }),
  )

export default db
