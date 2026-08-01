import { useLiveQuery } from 'dexie-react-hooks'
import db, { type Book } from './db'

/** Every book kept, newest first — the order a shelf actually fills.

    `undefined` while Dexie is opening, which is deliberately not the same
    value as an empty shelf: showing "nothing here yet" for the two frames
    before the database answers would make a full library flicker through its
    own empty state on every cold load. */
export function useLibrary(): Book[] | undefined {
  return useLiveQuery(() => db.books.orderBy('addedAt').reverse().toArray(), [])
}
