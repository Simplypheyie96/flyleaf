/* Reading somebody else's file.

   A Flyleaf journey is one exact shape and `backup.ts` knows it by name. This
   is the other door: a JSON file from some other reading app, a spreadsheet
   somebody dumped to JSON, an API response a reader saved — none of which have
   ever heard of Flyleaf and none of which agree with each other on what a book
   is called. `title`, `name`, `bookTitle`, `volumeInfo.title`; `author`,
   `authors` as an array, `authors` as an array of objects with a `name`.

   So this reads by MEANING rather than by schema: find the list, and for each
   thing in it, look for a title under any of its usual names. What it cannot
   find, it leaves out. A book with a title is a book; everything else on the
   row is a bonus.

   WHAT IT WILL NOT DO. It never invents. No placeholder authors, no guessed
   dates, no rating turned into a note the reader did not write. And it only
   ever produces books, quotes and notes — the three things another app might
   plausibly hold. Recordings, pictures, characters, places and plot threads
   are Flyleaf's own and arrive only in a Flyleaf journey.

   Everything it produces then goes through the ordinary merge in backup.ts, so
   importing the same foreign file twice adds nothing the second time: books
   key on the cover seed, keeps on a uid derived from their own words. */

import { seedFrom } from '../books/seed'
import type { Book, BookFormat, Entry, EntryType } from './db'

/** A keep on its way in, with its picture still packed the way a file holds
    one. `importJourney` unpacks it into a Blob exactly as it does for a
    Flyleaf journey, so nothing here has to build one. */
export interface AdoptedEntry extends Omit<Entry, 'id' | 'media'> {
  media?: { type: string; data: string }
}

export interface Adopted {
  books: Book[]
  entries: AdoptedEntry[]
  /** The reader's own name, when the file happens to carry one. */
  handle?: string
  /** An older Flyleaf's own file rather than a stranger's, so everything it
      held is understood and the reader can be told so. */
  first?: boolean
}

type Bag = Record<string, unknown>

const isBag = (value: unknown): value is Bag =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** The first of these keys that holds something usable. Case and punctuation
    are ignored, so `date_started`, `dateStarted` and `Date Started` are one
    name — which is exactly the difference between two exports of the same
    library from two different tools. */
function pick(row: Bag, names: string[]): unknown {
  const flat = new Map<string, unknown>()
  for (const [key, value] of Object.entries(row)) {
    const plain = key.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!flat.has(plain)) flat.set(plain, value)
  }
  for (const name of names) {
    const value = flat.get(name.toLowerCase().replace(/[^a-z0-9]/g, ''))
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

function text(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined
  if (typeof value === 'number') return String(value)
  return undefined
}

/** One or many, strings or objects — every shape an author list arrives in. */
function people(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const names = value.map(person).filter(Boolean)
    return names.length ? names.join(', ') : undefined
  }
  return person(value)
}

function person(value: unknown): string | undefined {
  if (isBag(value)) return text(pick(value, ['name', 'author', 'fullName', 'displayName']))
  return text(value)
}

function count(value: unknown): number | undefined {
  const n = typeof value === 'string' ? Number(value.replace(/[^0-9]/g, '')) : Number(value)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined
}

/** A calendar day, from whatever a date looked like where it came from —
    yyyy-mm-dd, a full ISO stamp, a US-style slash date, or epoch seconds or
    milliseconds. Anything unreadable is simply not a date, and the book keeps
    its journey without one. */
function day(value: unknown): string | undefined {
  if (typeof value === 'number') {
    const ms = value < 1e11 ? value * 1000 : value
    return calendar(new Date(ms))
  }
  const raw = text(value)
  if (!raw) return undefined
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  return calendar(new Date(raw))
}

/** The date as the clock on the wall reads it. `toISOString` would be a day
    out for half the world — a date parsed as local midnight is the previous
    evening in UTC, so "1 March" arrives on the shelf as 28 February. */
function calendar(at: Date): string | undefined {
  if (Number.isNaN(at.getTime())) return undefined
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
}

function year(value: unknown): number | undefined {
  const raw = text(value)
  const found = raw?.match(/\d{4}/)
  const n = found ? Number(found[0]) : undefined
  return n && n > 500 && n <= new Date().getFullYear() + 2 ? n : undefined
}

/** Physical, digital or audio, from whatever word the other app used for it.
    Nothing recognised means nothing recorded — a format Flyleaf guessed wrong
    is worse than a format it left blank. */
function format(value: unknown): BookFormat | undefined {
  const raw = text(value)?.toLowerCase()
  if (!raw) return undefined
  if (/audio|audible|listen|spoken/.test(raw)) return 'audio'
  if (/ebook|e-book|kindle|epub|digital|pdf/.test(raw)) return 'digital'
  if (/paper|hard|physical|print|book|bound/.test(raw)) return 'physical'
  return undefined
}

/* THE LIST. A file might be the list itself, or hold it under any of a dozen
   names, or bury it one level down inside a wrapper object. Preferred names
   are tried first so a file with both `books` and some unrelated array of
   tags cannot be read as a library of tags. */
const LIST_KEYS = [
  'books', 'library', 'items', 'entries', 'data', 'results', 'records',
  'shelf', 'reading', 'readings', 'list', 'rows', 'volumes',
]

function findList(root: unknown, depth = 0): Bag[] | null {
  if (Array.isArray(root)) return root.filter(isBag)
  if (!isBag(root) || depth > 2) return null

  for (const key of LIST_KEYS) {
    const found = Object.entries(root).find(
      ([name]) => name.toLowerCase().replace(/[^a-z0-9]/g, '') === key,
    )
    const rows = found?.[1]
    if (Array.isArray(rows) && rows.some(isBag)) return rows.filter(isBag)
  }

  // No name we know, so take the longest array of objects in the file, then
  // look one level deeper for a wrapper that holds one.
  const arrays = Object.values(root).filter(
    (value): value is unknown[] => Array.isArray(value) && value.some(isBag),
  )
  if (arrays.length) {
    const longest = arrays.sort((a, b) => b.length - a.length)[0]
    return longest.filter(isBag)
  }
  for (const value of Object.values(root)) {
    const nested = findList(value, depth + 1)
    if (nested?.length) return nested
  }
  return null
}

/** Some exports wrap the book itself — `{ book: {...}, rating: 4 }`, or Google
    Books' `{ volumeInfo: {...} }`. Read both levels as one row, with the outer
    one winning so the reader's own dates beat the publisher's. */
function flatten(row: Bag): Bag {
  const inner = pick(row, ['volumeInfo', 'book', 'work', 'volume', 'edition', 'fields'])
  return isBag(inner) ? { ...inner, ...row } : row
}

/** A stable name for an adopted keep, so importing the same file twice does
    not write it twice. Derived from the words themselves — the source file has
    no id we could trust, and its own ids collide meaninglessly with ours. */
function mark(bookId: number, kind: string, words: string): string {
  let h = 0x811c9dc5
  const id = `${bookId} ${kind} ${words}`
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `adopted-${(h >>> 0).toString(36)}`
}

/** Quotes and highlights, however they were stored: a list of strings, a list
    of objects with the line under one of the usual names, or one long string
    of them separated by blank lines. */
function lines(value: unknown): { words: string; page?: number }[] {
  if (typeof value === 'string') {
    return value
      .split(/\n\s*\n/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((words) => ({ words }))
  }
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item === 'string') {
      const words = item.trim()
      return words ? [{ words }] : []
    }
    if (!isBag(item)) return []
    const words = text(pick(item, ['text', 'quote', 'highlight', 'body', 'content', 'note', 'line']))
    if (!words) return []
    return [{ words, page: count(pick(item, ['page', 'pageNumber', 'location', 'loc'])) }]
  })
}

/* THE FIRST FLYLEAF.

   There was a version of this app before this one, and its export is neither
   a journey nor a stranger's file: `{ app: "flyleaf", version: 1 }`, books
   keyed by uuid, and every keep in one list at the top rather than hanging off
   its book. Read by the tolerant path above it would give up its books and
   drop every last thing written about them, which for the person who wrote
   them is the whole point of the file.

   So it gets its own door, and the door is a translation. Five of the six old
   kinds have an exact heir here; `lore` and `vocab` do not, and are placed
   where they lose the least:

     quote     → quote
     note      → note
     character → character      the reason for this whole path
     plot      → thread         a suspicion, at the weakest stance, exactly as
                                the old `strand` rows were upgraded in db.ts
     lore      → place          world-building was always somewhere
     vocab     → note           a word and why it was kept is a note about the
                                book; there is no other honest home for it

   Pictures come across — the old `photo` is already the shape this app packs
   one in. Nothing else is invented: no stance the reader did not express, no
   date they did not write. */
const V1_KIND: Record<string, EntryType> = {
  quote: 'quote',
  note: 'note',
  character: 'character',
  plot: 'thread',
  lore: 'place',
  vocab: 'note',
}

function firstFlyleaf(root: Bag): Adopted | null {
  const rows = Array.isArray(root.books) ? root.books.filter(isBag) : []
  if (!rows.length) return null

  const now = Date.now()
  const books = new Map<number, Book>()
  /* The old uuid to the new cover seed, so the keeps below can find the book
     they belong to. A keep whose book was left out is left out with it. */
  const byOldId = new Map<string, number>()
  let samples = 0

  rows.forEach((row, index) => {
    const title = text(pick(row, ['title', 'name']))
    if (!title) return

    /* The old app shipped a demo book and marked it. It is not this reader's
       reading, and a library that quietly gains a book nobody read is worse
       than one that gains nothing. */
    if (pick(row, ['isSample', 'sample', 'isDemo']) !== undefined) {
      samples += 1
      return
    }

    const author = people(pick(row, ['authors', 'author'])) ?? ''
    const id = seedFrom(title, author)
    const oldId = text(pick(row, ['id']))
    if (oldId) byOldId.set(oldId, id)
    if (books.has(id)) return

    const shape = format(pick(row, ['format', 'binding', 'mediaType']))
    books.set(id, {
      id,
      title,
      author,
      year: year(pick(row, ['year', 'published', 'publishedYear'])),
      pages: count(pick(row, ['pages', 'pageCount', 'numPages'])),
      covers: [],
      startedOn: day(pick(row, ['startedOn', 'dateStarted', 'started'])),
      finishedOn: day(pick(row, ['finishedOn', 'dateFinished', 'finished'])),
      formats: shape ? [shape] : undefined,
      addedAt: count(pick(row, ['addedAt'])) ?? now - (rows.length - index) * 1000,
    })
  })

  /* Every book in the file was the old app's demo. Said out loud rather than
     dropped through to the tolerant reader below, which does not know what
     `isSample` means and would shelve the demo book as a real one. */
  if (!books.size) {
    if (samples) throw new Error('That file only holds the old sample book, so there was nothing to bring over.')
    return null
  }

  const entries: AdoptedEntry[] = []
  const keeps = Array.isArray(root.entries) ? root.entries.filter(isBag) : []
  for (const keep of keeps) {
    const kind = V1_KIND[text(pick(keep, ['type', 'kind']))?.toLowerCase() ?? '']
    if (!kind) continue

    const bookId = byOldId.get(text(pick(keep, ['bookId', 'book'])) ?? '')
    if (bookId === undefined) continue

    const words = text(pick(keep, ['text', 'body', 'content']))
    const photo = pick(keep, ['photo', 'image', 'picture'])
    const media =
      isBag(photo) && typeof photo.data === 'string' && typeof photo.type === 'string'
        ? { type: photo.type, data: photo.data }
        : undefined
    // Nothing to keep: no words and no picture is an empty row, not a memory.
    if (!words && !media) continue

    const at = count(pick(keep, ['createdAt', 'created', 'at'])) ?? now
    entries.push({
      bookId,
      type: kind,
      text: words,
      // "p. 42" as often as 42 — the old field took whatever was typed.
      page: count(pick(keep, ['page', 'pageNumber'])),
      chapter: text(pick(keep, ['chapter'])),
      media,
      // Its own weakest stance, never a confidence the reader never claimed.
      stance: kind === 'thread' ? 'hunch' : undefined,
      keptOn: day(pick(keep, ['keptOn', 'date'])) ?? calendar(new Date(at))!,
      createdAt: at,
      /* The old uuid, kept as this keep's name forever. It was already unique
         and already stable, so the same file imported twice lands on the same
         rows rather than beside them. */
      uid: text(pick(keep, ['id'])) ? `flyleaf1-${text(pick(keep, ['id']))}` : undefined,
      editedAt: count(pick(keep, ['updatedAt', 'editedAt'])),
    })
  }

  return { books: [...books.values()], entries, handle: text(pick(root, ['username', 'handle'])), first: true }
}

/** Read a foreign file. Returns null when nothing in it looks like a book,
    which is the caller's signal to say so plainly rather than import silence. */
export function adopt(text_: string): Adopted | null {
  let root: unknown
  try {
    root = JSON.parse(text_)
  } catch {
    return null
  }

  /* An older Flyleaf's own file, which has its own door because it is the one
     foreign shape whose every kind we already understand. */
  if (isBag(root) && text(pick(root, ['app']))?.toLowerCase() === 'flyleaf') {
    const first = firstFlyleaf(root)
    if (first) return first
  }

  const rows = findList(root)
  if (!rows?.length) return null

  const now = Date.now()
  const books = new Map<number, Book>()
  const entries: AdoptedEntry[] = []

  rows.forEach((raw, index) => {
    const row = flatten(raw)
    const title = text(pick(row, ['title', 'name', 'bookTitle', 'book_title', 'workTitle', 'book']))
    if (!title) return

    const author =
      people(pick(row, ['author', 'authors', 'authorName', 'author_name', 'by', 'creator', 'writer'])) ?? ''

    const id = seedFrom(title, author)
    const startedOn = day(
      pick(row, ['startedOn', 'dateStarted', 'started', 'startDate', 'beganOn', 'firstDateRead']),
    )
    const finishedOn = day(
      pick(row, [
        'finishedOn', 'dateFinished', 'finished', 'dateRead', 'lastDateRead', 'readAt', 'readDate',
        'endDate', 'completedOn', 'dateCompleted',
      ]),
    )
    const shape = format(pick(row, ['format', 'binding', 'editionFormat', 'mediaType', 'type']))

    /* Later rows lose to earlier ones on the same book rather than overwriting
       them, so a file that lists a book twice keeps the first sighting and its
       dates instead of whichever copy happened to be last. */
    if (!books.has(id)) {
      books.set(id, {
        id,
        title,
        author,
        year: year(pick(row, ['year', 'publishedYear', 'publicationYear', 'firstPublishYear', 'published', 'publishedDate'])),
        pages: count(pick(row, ['pages', 'numPages', 'pageCount', 'numberOfPages', 'length'])),
        covers: [],
        startedOn,
        finishedOn,
        formats: shape ? [shape] : undefined,
        // Spaced by index so the shelf keeps the file's own order instead of
        // arriving as one indistinguishable instant.
        addedAt: now - (rows.length - index) * 1000,
      })
    }

    const kept = finishedOn ?? startedOn ?? calendar(new Date(now))!
    const keep = (type: 'quote' | 'note', words: string, page?: number) => {
      entries.push({
        bookId: id,
        type,
        text: words,
        page,
        keptOn: kept,
        createdAt: now + entries.length,
        uid: mark(id, type, words),
      })
    }

    for (const { words, page } of lines(pick(row, ['quotes', 'highlights', 'passages', 'excerpts']))) {
      keep('quote', words, page)
    }
    for (const { words } of lines(pick(row, ['notes', 'review', 'myReview', 'comment', 'comments', 'thoughts']))) {
      keep('note', words)
    }
  })

  if (!books.size) return null
  return { books: [...books.values()], entries }
}
