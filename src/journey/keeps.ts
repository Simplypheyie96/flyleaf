/* Writing to a journey.

   Every mutation the journey screen can perform, in one place, so the screen
   itself only ever describes what the reader asked for. Two rules run through
   all of it:

   1. Nothing here is destructive without a way back. `removeKeep` hands back
      the row it deleted and a function that puts it there again, which is what
      lets the screen offer Undo instead of a confirmation dialog. A dialog
      asks a reader to be certain before they have seen what happens; an undo
      lets them look first.

   2. `createdAt` is the journey's spine. It is the sort key, it is what the
      braid measures spans against, and it is what a strand stores as its
      opening. So it is set once, on the way in, and never touched again — the
      day a keep is *about* is `keptOn`, and that one the reader can edit
      freely without the thread reordering itself underneath them. */

import db, { type BookFormat, type Entry, type EntryType, type Strand } from '../data/db'
import { nextHue } from './order'

export interface Draft {
  bookId: number
  type: EntryType
  text?: string
  page?: number
  chapter?: string
  media?: Blob
  duration?: number
  keptOn: string
  motifs?: string[]
  strandId?: number
}

/** A new keep, at the end of the thread. */
export async function addKeep(draft: Draft) {
  return db.entries.add({ ...draft, createdAt: Date.now() } as Entry)
}

/** An edit to a keep already on the thread. `createdAt` is not in the type,
    so no caller can move a keep in time by accident. */
export async function editKeep(
  id: number,
  patch: Partial<Omit<Entry, 'id' | 'bookId' | 'createdAt'>>,
) {
  await db.entries.update(id, patch)
}

/** Delete, with the row and a way back.

    The strand a keep opened goes with it, because a strand whose opening has
    been deleted has no beginning for the braid to start from. Restoring puts
    both back. */
export async function removeKeep(entry: Entry) {
  const strand =
    entry.strandMark === 'open' && entry.strandId !== undefined
      ? await db.strands.get(entry.strandId)
      : undefined

  await db.entries.delete(entry.id)
  if (strand) await db.strands.delete(strand.id)

  return async function restore() {
    if (strand) await db.strands.put(strand)
    await db.entries.put(entry)
  }
}

/* ── Strands ───────────────────────────────────────────────────────────────

   A strand is opened by a keep and closed by a keep, and the strand row only
   records where those two sit on the thread. Writing the keep first and the
   strand second is deliberate: `openedAt` has to be a real `createdAt` that
   exists, or the braid starts at a row that is not there. */

export async function openStrand(
  bookId: number,
  name: string,
  reflection: string,
  keptOn: string,
  existing: Strand[],
) {
  const createdAt = Date.now()
  const id = (await db.entries.add({
    bookId,
    type: 'strand',
    text: reflection || undefined,
    keptOn,
    createdAt,
    strandMark: 'open',
  } as Entry)) as number

  const strandId = (await db.strands.add({
    bookId,
    name,
    hue: nextHue(existing),
    openedAt: createdAt,
  } as Strand)) as number

  await db.entries.update(id, { strandId })
  return strandId
}

/** Tie it off. Also a keep, because "here is where it landed" is a thing the
    reader wrote and belongs in the journey, not in a settings row. */
export async function closeStrand(
  strand: Strand,
  reflection: string,
  keptOn: string,
) {
  const createdAt = Date.now()
  await db.entries.add({
    bookId: strand.bookId,
    type: 'strand',
    text: reflection || undefined,
    keptOn,
    createdAt,
    strandId: strand.id,
    strandMark: 'close',
  } as Entry)
  await db.strands.update(strand.id, { closedAt: createdAt })
}

/** Undo a tie-off: the closing keep goes, and the braid runs on. */
export async function reopenStrand(strand: Strand) {
  const closing = await db.entries
    .where('strandId')
    .equals(strand.id)
    .filter((e) => e.strandMark === 'close')
    .toArray()
  await db.entries.bulkDelete(closing.map((e) => e.id))
  // `undefined` through Dexie's update() is a no-op, so the field has to be
  // removed on a full row rather than patched away.
  const { closedAt: _closed, ...open } = strand
  await db.strands.put(open as Strand)
}

/* ── The book itself ────────────────────────────────────────────────────── */

export async function setFormats(bookId: number, formats: BookFormat[]) {
  await db.books.update(bookId, { formats })
}

export async function setDates(
  bookId: number,
  dates: { startedOn?: string; finishedOn?: string },
) {
  await db.books.update(bookId, dates)
}

/** How far in. Pages, because that is the number the reader is looking at —
    the percentage on the jacket is derived from it and is never stored.
    Clamped rather than validated: a reader typing 5000 into a 300-page book
    has made a typo, and the bookmark should not fall off the end of the
    jacket while they fix it. */
export async function setProgress(bookId: number, pagesRead: number, pages?: number) {
  const at = Math.max(0, Math.round(pagesRead))
  await db.books.update(bookId, { pagesRead: pages ? Math.min(at, pages) : at })
}

/** Finishing is a date, not a status — see `Book.finishedOn`. Unfinishing has
    to clear the field rather than blank it, for the same reason as above. */
export async function finish(bookId: number, on: string | null) {
  if (on) {
    await db.books.update(bookId, { finishedOn: on })
    return
  }
  const book = await db.books.get(bookId)
  if (!book) return
  const { finishedOn: _done, ...rest } = book
  await db.books.put(rest)
}

/** The book and everything kept from it. No undo on this one, which is why
    the sheet that calls it says out loud how many keeps are going. */
export async function removeBook(bookId: number) {
  await db.transaction('rw', db.books, db.entries, db.strands, async () => {
    await db.entries.where('bookId').equals(bookId).delete()
    await db.strands.where('bookId').equals(bookId).delete()
    await db.books.delete(bookId)
  })
}
