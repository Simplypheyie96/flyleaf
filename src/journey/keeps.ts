/* Writing to a journey.

   Every mutation the journey screen can perform, in one place, so the screen
   itself only ever describes what the reader asked for. Four rules run through
   all of it — two of its own, and two more that arrived with syncing and are
   set out below the imports, where the code they govern is:

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
import { bookGrave, bury, keepGrave, sittingGrave, unbury } from '../data/graves'

/* A third rule joined the two above once the journal learned to sync.

   3. Every deletion here leaves a headstone, and every undo takes it away
      again. A merge can only add, so a deleted book comes back down from the
      other device unless the deletion itself is a fact that travels — and a
      restored keep whose headstone is still standing would be deleted again by
      the very next sync, half a minute after the reader pressed Undo. See
      data/graves.ts.

   4. Every edit stamps `editedAt`. Two devices holding one book both have a
      claim on it, and without a stamp the merge has no way to tell a
      correction from a stale copy — so it takes whichever arrived last, which
      means a change made on the phone can be undone by a laptop that has been
      asleep since Tuesday. */

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
  /* The uid is minted here and never again. It is what lets the other device
     recognise this keep after it has been edited — see `Entry.uid`. */
  return db.entries.add({ ...draft, uid: crypto.randomUUID(), createdAt: Date.now() } as Entry)
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
  /* Stamped after the patch is applied, not inside it, so no caller can pass
     an `editedAt` of their own and claim to be newer than they are. */
  next.editedAt = Date.now()
  /* And a uid if this keep predates them, so THIS edit is the last one that
     has to be recognised by its content. Every one after it is recognised by
     the uid, which is the only identity an edit cannot change.

     AND A HEADSTONE OVER THE OLD CONTENT, which is the half that was missing
     and the owner's report exactly: "when i make changes on my phone, it
     always likes to enforce the one on my mac". The other device is still
     holding this keep under its old fingerprint. Correcting it here changes
     the words, so that fingerprint no longer names anything on this device —
     and a merge that meets a keep it cannot match ADDS it. The uncorrected
     version came back down and sat on the thread looking like the edit had
     been overruled. Burying the old name says "that one is gone" in the one
     language the merge already speaks, so the stale copy is taken off the
     other device rather than pushed back onto this one.

     Only when a uid is minted. A keep that already has one was matched by it
     on both sides, so there is no orphaned name to bury — and burying a
     uid-named keep would tell the other device to delete the very row this
     edit is trying to send it. */
  const named = !next.uid
  if (named) next.uid = crypto.randomUUID()

  await db.transaction('rw', db.entries, db.graves, async () => {
    await db.entries.put(next as unknown as Entry)
    if (named) await bury([keepGrave(current)])
  })
}

/** Delete, with the row and a way back. The caller shows an undo rather than
    a confirmation — see rule 1 at the top of this file. */
export async function removeKeep(entry: Entry) {
  const grave = keepGrave(entry)
  await db.transaction('rw', db.entries, db.graves, async () => {
    await db.entries.delete(entry.id)
    await bury([grave])
  })
  return async function restore() {
    await db.transaction('rw', db.entries, db.graves, async () => {
      await db.entries.put(entry)
      /* The headstone comes down with it. Left standing, the next sync would
         read it as a deletion this device still means and take the keep away
         again — a row that vanishes moments after the reader undid it. */
      await unbury([grave])
    })
  }
}

/* ── The book itself ────────────────────────────────────────────────────── */

export async function setFormats(bookId: number, formats: BookFormat[]) {
  await db.books.update(bookId, { formats, editedAt: Date.now() })
}

export async function setDates(bookId: number, dates: { startedOn?: string; finishedOn?: string }) {
  await db.books.update(bookId, { ...dates, editedAt: Date.now() })
}

/** Finishing is a date, not a status — see `Book.finishedOn`. Unfinishing has
    to clear the field rather than blank it, for the same reason as above. */
export async function finish(bookId: number, on: string | null) {
  if (on) {
    await db.books.update(bookId, { finishedOn: on, editedAt: Date.now() })
    return
  }
  const book = await db.books.get(bookId)
  if (!book) return
  const { finishedOn: _done, ...rest } = book
  await db.books.put({ ...rest, editedAt: Date.now() })
}

/** The book and everything kept from it. No undo on this one, which is why
    the sheet that calls it says out loud how many keeps are going. */
export async function removeBook(bookId: number) {
  await db.transaction('rw', db.books, db.entries, db.sittings, db.graves, async () => {
    /* Read before deleting, because each keep and each sitting needs its own
       headstone — the book's alone would not stop the other device sending
       back the forty quotes that were in it. */
    const keeps = await db.entries.where('bookId').equals(bookId).toArray()
    const sittings = await db.sittings.where('bookId').equals(bookId).toArray()

    await db.entries.where('bookId').equals(bookId).delete()
    // The hours go with it. A sitting has no meaning without the book it was
    // spent on — orphan rows here would quietly inflate any future "time
    // read" total with minutes belonging to nothing on the shelf.
    await db.sittings.where('bookId').equals(bookId).delete()
    await db.books.delete(bookId)

    await bury([
      bookGrave(bookId),
      ...keeps.map(keepGrave),
      ...sittings.map(sittingGrave),
    ])
  })
}
