/* Deletions, written down so they can travel.

   A sync merges: it takes the union of two devices, which is what stops a
   phone with no signal losing an afternoon's writing. The cost is that a
   union cannot say "gone" — delete a book on the phone, and the laptop's copy
   comes straight back down on the next pull, forever. See db.version(8).

   So every deletion in the app also leaves a headstone. This file owns the
   keys, and that is the whole reason it exists: a key computed one way when
   the row dies and another way when the file is read back is a headstone over
   an empty plot, and the deletion would silently stop working. One function
   per kind of thing, used by both sides.

   Undo takes the headstone away again. `removeKeep` hands the caller a way
   back, and a restored keep whose grave is still standing would be deleted by
   the very next sync — a row that vanishes half a minute after the reader
   pressed Undo, which is worse than having no undo at all. */

import db, { type Entry, type Sitting } from './db'

export function bookGrave(id: number): string {
  return `b:${id}`
}

/** By uid when there is one, and by content when there is not.

    The fallback is not a nicety: every keep written before uids existed has
    none, and a headstone that cannot name them could never delete them. */
export function keepGrave(entry: Entry): string {
  return `e:${entry.uid ?? fingerprint(entry)}`
}

export function sittingGrave(sit: Pick<Sitting, 'bookId' | 'startedAt'>): string {
  return `s:${sit.bookId}:${sit.startedAt}`
}

/** What makes two keeps the same keep when neither carries a uid: not the id,
    which is a per-device autoincrement, but the day it was kept, what kind of
    thing it is, and what it says. Two genuinely different notes written on one
    day about one book would have to say exactly the same words to collide.

    It lives here rather than in `backup.ts`, where it started, because a
    headstone spelled one way at the deletion and another way at the merge is a
    headstone over an empty plot. One spelling, one file, both callers. The NUL
    joiner is part of it: a separator that cannot occur inside a quote is what
    stops two different keeps sharing a fingerprint. */
export function fingerprint(
  entry: Pick<Entry, 'bookId' | 'type' | 'keptOn' | 'createdAt' | 'text' | 'name'>,
): string {
  return [
    entry.bookId,
    entry.type,
    entry.keptOn,
    entry.createdAt,
    entry.text ?? '',
    entry.name ?? '',
  ].join('\u0000')
}

/** Raise headstones. Called from inside the caller's transaction where there
    is one, so a deletion and its record cannot come apart. */
export async function bury(keys: string[]) {
  if (!keys.length) return
  const at = Date.now()
  await db.graves.bulkPut(keys.map((key) => ({ key, at })))
}

/** Take them down again — the reader pressed Undo. */
export async function unbury(keys: string[]) {
  if (!keys.length) return
  await db.graves.bulkDelete(keys)
}

/** Every headstone this device holds, as a set of keys. */
export async function buried(): Promise<Set<string>> {
  return new Set((await db.graves.toArray()).map((grave) => grave.key))
}

/** Every headstone with the MOMENT it was raised — which is the difference
    between a deletion and a life sentence.

    A grave key for a book is `b:<id>`, and a book's id is a hash of its title
    and author. So the key does not name the row that died; it names the BOOK,
    for as long as that book exists anywhere. Delete a book today, add it again
    next month, and the headstone from today is still standing over it: the very
    next sync reads the grave, finds a matching row, and deletes the book a
    second time. The reader adds it, watches it appear, and watches it go — and
    there is no way out, because re-adding produces the same id every time.

    That is the owner's report, exactly: "some of the books i imported got
    deleted." It was not the import that was wrong. It was that the app was
    still holding a grudge from a deletion she had made and moved on from.

    The fix is the stamp `bury` has always written and nothing has ever read. A
    headstone speaks for the row that was there WHEN IT WAS RAISED. A row made
    afterwards is a different act by the same reader, more recent than the
    deletion, and it wins. */
export async function buriedWhen(): Promise<Map<string, number>> {
  return new Map((await db.graves.toArray()).map((grave) => [grave.key, grave.at]))
}

/** Is this row dead? Only if a headstone stands over it AND that headstone was
    raised after the row was made. `madeAt` is the row's own newest stamp — when
    it was added, or last edited, whichever is later. */
export function isBuried(graves: Map<string, number>, key: string, madeAt: number): boolean {
  const at = graves.get(key)
  if (at === undefined) return false
  /* `>=`, not `>`: a grave and a row stamped in the same millisecond is the
     deletion, since the row has to exist before it can be deleted. */
  return at >= madeAt
}

/** The newest moment a book was touched. */
export function bookMadeAt(book: { addedAt?: number; editedAt?: number }): number {
  return Math.max(book.addedAt ?? 0, book.editedAt ?? 0)
}

/** The newest moment a keep was touched. */
export function keepMadeAt(entry: { createdAt?: number; editedAt?: number }): number {
  return Math.max(entry.createdAt ?? 0, entry.editedAt ?? 0)
}

