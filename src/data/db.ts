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
  /** Which of `covers` the reader chose to look at, or `DRAWN` (-1) for
      Flyleaf's own. Absent means we never asked and the first one stands.
      Read it through `coversOf()` in books/covers.ts, never directly. */
  coverPick?: number
  /** When this book was pinned to the front of the shelf; absent if it is
      not. Three at a time — see data/pins.ts. Unindexed on purpose: three
      rows out of a personal library is a filter, not a query. */
  pinnedAt?: number
  format?: BookFormat
  /** ISO yyyy-mm-dd. A date, not a timestamp: nobody remembers the hour. */
  startedOn?: string
  /** Set the day the book is finished. Its absence is what "still reading"
      means — there is no status field to contradict it. */
  finishedOn?: string
  addedAt: number
  /** When anything on this row was last changed, so a sync can tell an edit
      from a stale copy. Absent on every row written before it existed, which
      reads as "older than anything stamped" and is exactly right: a device
      that has never edited a book should lose to one that has. */
  editedAt?: number
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
export type EntryType = 'quote' | 'note' | 'voice' | 'image' | 'character' | 'place' | 'thread'

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
      line, and it is the ONLY page number this app holds. There was a
      book-level `pagesRead` beside it and nothing ever wrote to it — if a
      "how far in am I" number is ever wanted, it has to arrive with a screen
      that sets it, not as a field hoping to be filled. */
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
  /** WHO THIS KEEP IS, everywhere, forever — and `id` is not that, because ids
      are per-device autoincrements that two devices hand out independently.

      Sync used to recognise a keep by its content: book, kind, day, moment,
      words. That works until the reader corrects a typo, at which point the
      words are different, the content no longer matches, and the other device
      receives the corrected quote as a SECOND quote and keeps both. A uid
      survives an edit, so a correction arrives as a correction.

      Optional because rows written before it existed have none; those still
      fall back to the content fingerprint, exactly as they always did. */
  uid?: string
  /** When the keep was last edited. Same job as `Book.editedAt`: it decides
      which of two copies of one keep is the current one. */
  editedAt?: number
  /** What it is called — a character's name, a place's name. The heading of
      the card, kept apart from `text` so the two can be styled and searched
      as the different things they are. */
  name?: string
  /** `thread` only — how sure the reader currently is. */
  stance?: Stance
  /** `character` only — which face the reader has swapped to.

      The app assigns one, and it assigns it from the name, so the same person
      keeps the same face across the journey, the board and the plate without
      anything having to be stored. Absent means exactly that: the first face
      the name draws, which is what nearly every character will keep.

      It only appears once the reader has pressed the swap button, and then it
      is just a count of how many times — the drawing is still the app's, and
      the reader is never asked to pick one. What they are saying with the
      button is "not that one", which is a thing they can know without being
      able to describe what they want instead. */
  face?: number
}

/** One stretch of time spent reading one book.

    A sitting is not a keep and does not live in `entries`. Everything in that
    table is something the reader wrote down on purpose; a sitting is something
    that merely happened, measured by a clock while they were doing something
    else. Mixing them would put "you read for 40 minutes" on the same thread as
    a line they chose to copy out by hand, which is not the same kind of thing
    and would not deserve the same card.

    Nothing is derived from `startedAt + seconds`: an interval throttled by a
    backgrounded tab under-counts, so the elapsed time is always read off the
    wall clock and only the total is written here. */
export interface Sitting {
  id: number
  /** The book being read — `Book.id`, the cover seed. */
  bookId: number
  /** Epoch ms the clock was started. The sort key, and the only ordering that
      makes sense for something with no name. */
  startedAt: number
  /** Whole seconds. Sittings shorter than a minute are never written. */
  seconds: number
  /** ISO yyyy-mm-dd of the day it STARTED, so a sitting that runs past
      midnight belongs to the evening the reader thinks it belongs to. */
  keptOn: string
}

/** A deletion, recorded so it can travel. See db.version(8) for why a merge
    that only ever adds cannot express one, and graves.ts for the keys. */
export interface Grave {
  /** `b:<bookId>`, `e:<uid or fingerprint>`, `s:<bookId>:<startedAt>`. */
  key: string
  at: number
}

const db = new Dexie('flyleaf') as Dexie & {
  books: EntityTable<Book, 'id'>
  entries: EntityTable<Entry, 'id'>
  sittings: EntityTable<Sitting, 'id'>
  graves: EntityTable<Grave, 'key'>
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

/* The second non-additive version, and it removes rather than reshapes.

   Motifs asked the reader to name what a keep was "about" before they had
   finished having the thought, and then made that name the price of ever
   finding the keep again. Nobody typed them. The ones that did get typed were
   a second, worse copy of what the keep already said. So the field is gone,
   the multiEntry index that made it queryable goes with it, and `entries` is
   restated without `*motifs` — a version declares the whole schema, so the
   index disappears by not being named.

   The key is deleted from every row rather than left to rot, because a field
   that is not in the type but is in the database is the thing that makes the
   next migration hard to reason about. There is nothing here to translate into
   something else: a motif was the reader's word for a subject, and the app has
   no other place that means that. It is a deletion and it is written as one. */
db.version(5)
  .stores({
    books: 'id, addedAt, title',
    entries: '++id, bookId, [bookId+createdAt]',
  })
  .upgrade((tx) =>
    tx
      .table<Entry & { motifs?: string[] }>('entries')
      .toCollection()
      .modify((entry) => {
        delete entry.motifs
      }),
  )

/* One added index, and nothing else changes.

   `type` is the only question the first-page guide asks — "has this reader
   ever kept a quote / a note / a recording / a picture / a thread" — and
   asking it without an index means reading the whole table, which on this
   schema means loading every recording and every photograph into memory to
   answer nine boolean questions on a cold Home.

   Purely additive: Dexie builds the index on upgrade, every row already
   written is already valid, and there is no upgrade function to get wrong. */
db.version(6).stores({
  books: 'id, addedAt, title',
  entries: '++id, bookId, type, [bookId+createdAt]',
})

/* A new table, and nothing else touched — the most additive version there is.
   A device that never starts the clock never writes a row, and a device
   upgrading from 6 gets an empty table it can ignore.

   `[bookId+startedAt]` because the book page asks one question: this book's
   sittings, newest first. `startedAt` on its own is the same question without
   the book, which is how "how much have I read lately" would be asked if it
   is ever asked. */
db.version(7).stores({
  books: 'id, addedAt, title',
  entries: '++id, bookId, type, [bookId+createdAt]',
  sittings: '++id, bookId, startedAt, [bookId+startedAt]',
})

/* THE HEADSTONES, and syncing does not work without them.

   Sync merges: it takes the union of what two devices hold, which is what
   stops a phone with no signal losing an afternoon's writing to a laptop. But
   a union has no way to say "this is gone". Delete a book on the phone and the
   laptop still has it; the laptop pushes its copy up, the phone pulls it back
   down, and the book the reader deleted reappears — not once, but every time,
   because nothing in the file records the deletion as a fact.

   So a deletion becomes a row. `key` names WHAT died in terms both devices
   agree on — a book by its cover seed, a keep by its uid, a sitting by the
   millisecond it began — and `at` is when. They travel in the journey file
   like everything else, and on the way in they are applied after the merge, so
   a copy that arrived in the same file is taken straight back out again.

   Tiny and permanent. A headstone is a few dozen bytes and there is no safe
   moment to sweep one away: a device that has been in a drawer for a year
   still holds the book, and the only thing that will ever remove it is the
   headstone still being there when it wakes up. */
db.version(8).stores({
  books: 'id, addedAt, title',
  entries: '++id, bookId, type, [bookId+createdAt]',
  sittings: '++id, bookId, startedAt, [bookId+startedAt]',
  graves: 'key, at',
})

/* `editedAt` indexed, and only so that sync can ask one question cheaply:
   has anything on this device been EDITED since the last time it synced?
   Without the index the answer costs a full read of both tables, which on a
   journal with voice memos in it means pulling every recording off disk once
   every ninety seconds to compute a string. With it, it is two lookups.

   Rows written before the stamp existed simply are not in the index, which is
   correct — they have never been edited. */
db.version(9).stores({
  books: 'id, addedAt, title, editedAt',
  entries: '++id, bookId, type, editedAt, [bookId+createdAt]',
  sittings: '++id, bookId, startedAt, [bookId+startedAt]',
  graves: 'key, at',
})

export default db
