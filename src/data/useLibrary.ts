import Dexie from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import db, { type Book, type Entry } from './db'

/** Every book kept, newest first — the order a shelf actually fills.

    `undefined` while Dexie is opening, which is deliberately not the same
    value as an empty shelf: showing "nothing here yet" for the two frames
    before the database answers would make a full library flicker through its
    own empty state on every cold load. */
export function useLibrary(): Book[] | undefined {
  return useLiveQuery(() => db.books.orderBy('addedAt').reverse().toArray(), [])
}

/** The most recent keep from each of the given books, by book id.

    One `.last()` per book on the `[bookId+createdAt]` index rather than one
    sweep of the whole table, because a sweep would have to materialise every
    row to sort it — and the rows carry the recordings and the pictures. A
    reader with a year of voice notes would be loading all of them to render a
    list of five lines. This reads exactly one row per book instead.

    `undefined` while Dexie is opening, on the same reasoning as above: a feed
    that rendered "nothing kept yet" for two frames would say something false
    about every book on the shelf. */
export function useLatestKeeps(
  bookIds: number[],
): Record<number, Entry | undefined> | undefined {
  /* The ids themselves are the dependency, not the array holding them — a
     fresh array of the same five books arrives on every render of the shelf,
     and depending on the array would re-run this query each time. */
  const key = bookIds.join(',')

  return useLiveQuery(async () => {
    const pairs = await Promise.all(
      bookIds.map(
        async (id) =>
          [
            id,
            await db.entries
              .where('[bookId+createdAt]')
              .between([id, Dexie.minKey], [id, Dexie.maxKey])
              .last(),
          ] as const,
      ),
    )
    return Object.fromEntries(pairs)
  }, [key])
}
