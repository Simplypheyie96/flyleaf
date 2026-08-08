/* Writing to a journey.

   Every mutation the journey screen can perform, in one place, so the screen
   itself only ever describes what the reader asked for. Two rules run through
   all of it:

   1. Nothing here is destructive without a way back. `removeKeep` hands back
      the row it deleted and a function that puts it there again, which is what
      lets the screen offer Undo instead of a confirmation dialog. A dialog
      asks a reader to be certain before they have seen what happens; an undo
      lets them look first.

   2. `createdAt` is the journey's spine. It is the sort key and it is what
      decides which notch is next to which on the thread. So it is set once, on
      the way in, and never touched again — the day a keep is *about* is
      `keptOn`, and that one the reader can edit freely without the thread
      reordering itself underneath them. */

import db, { type BookFormat, type Entry, type EntryType, type Stance } from '../data/db'

export interface Draft {
  bookId: number
  type: EntryType
  text?: string
  page?: number
  chapter?: string
  media?: Blob
  duration?: number
  keptOn: string
  name?: string
  stance?: Stance
}

/** A new keep, at the end of the thread. */
export async function addKeep(draft: Draft) {
  return db.entries.add({ ...draft, createdAt: Date.now() } as Entry)
}

/** An edit to a keep already on the thread — because people mistype, misremember
    a page, and change their minds about a suspicion, and a journal you cannot
    correct is a journal you stop writing in.

    `createdAt` is not in the type, so no caller can move a keep in time by
    accident: correcting a quote must not shuffle it away from the day it
    belongs to.

    A key set to `undefined` is *removed*, not ignored. Dexie's `update()`
    silently skips undefined values, which would make "clear the page number I
    got wrong" do nothing at all — so the row is rewritten whole. */
export async function editKeep(
  id: number,
  patch: Partial<Omit<Entry, 'id' | 'bookId' | 'createdAt'>>,
) {
  const current = await db.entries.get(id)
  if (!current) return
  const next = { ...current } as Record<string, unknown>
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete next[key]
    else next[key] = value
  }
  await db.entries.put(next as unknown as Entry)
}

/** Delete, with the row and a way back. The caller shows an undo rather than
    a confirmation — see rule 1 at the top of this file. */
export async function removeKeep(entry: Entry) {
  await db.entries.delete(entry.id)
  return async function restore() {
    await db.entries.put(entry)
  }
}

/* ── The book itself ────────────────────────────────────────────────────── */

export async function setFormats(bookId: number, formats: BookFormat[]) {
  await db.books.update(bookId, { formats })
}

export async function setDates(bookId: number, dates: { startedOn?: string; finishedOn?: string }) {
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
  await db.transaction('rw', db.books, db.entries, db.sittings, async () => {
    await db.entries.where('bookId').equals(bookId).delete()
    // The hours go with it. A sitting has no meaning without the book it was
    // spent on — orphan rows here would quietly inflate any future "time
    // read" total with minutes belonging to nothing on the shelf.
    await db.sittings.where('bookId').equals(bookId).delete()
    await db.books.delete(bookId)
  })
}
