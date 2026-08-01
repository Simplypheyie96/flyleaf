import Dexie from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import db, { type Book, type Entry, type Strand } from './db'

/** One book, by the id in the URL.

    Three answers, not two, and the difference matters on a route anyone can
    deep-link into or come back to from the home screen. `undefined` means
    Dexie has not answered yet and the page should show nothing; `null` means
    it answered and there is no such book, which is the only case that earns a
    "this isn't here" message. Collapsing the two would put that message on
    screen for a frame every single time a real book opens. */
export function useBook(id: number | undefined): Book | null | undefined {
  return useLiveQuery(
    async () => (id === undefined ? null : ((await db.books.get(id)) ?? null)),
    [id],
  )
}

/** Every memory kept for one book, oldest first — the order the journey is
    read down the page, and the order the compound index already holds them
    in, so this is a range scan rather than a sort. */
export function useEntries(id: number | undefined): Entry[] | undefined {
  return useLiveQuery(
    async () =>
      id === undefined
        ? []
        : db.entries
            .where('[bookId+createdAt]')
            .between([id, Dexie.minKey], [id, Dexie.maxKey])
            .toArray(),
    [id],
  )
}

/** Every strand opened in one book, oldest first. Small enough to sort here:
    a reader follows two or three things through a book, not two hundred. */
export function useStrands(id: number | undefined): Strand[] | undefined {
  return useLiveQuery(
    async () =>
      id === undefined
        ? []
        : (await db.strands.where('bookId').equals(id).toArray()).sort(
            (a, b) => a.openedAt - b.openedAt,
          ),
    [id],
  )
}
