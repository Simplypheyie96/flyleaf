/* How a journey is read.

   The thread down the page is chronological by default, because that is what a
   journey is. A reader looking for one thing wants other orders and other
   subsets, and this file is the whole of that: filter, sort, and the one piece
   of drawing logic that depends on both — the tie between plot
   threads. Nothing here renders; it decides what is on the page and in what
   order, and `BookJourney` draws whatever it is handed. */

import type { Entry, EntryType } from '../data/db'
import { KINDS, STANCE } from './kinds'

export type Order = 'kept' | 'newest' | 'book'

export const ORDERS: { value: Order; label: string; hint: string }[] = [
  { value: 'kept', label: 'As kept', hint: 'oldest first, the way it happened' },
  { value: 'newest', label: 'Newest first', hint: 'the last thing you kept, at the top' },
  { value: 'book', label: 'Book order', hint: 'by page, the way the book runs' },
]

/** Which way the thread runs. The opening inscription is the first notch when
    time runs forwards and the last when it runs backwards — it is where the
    journey *began* either way, and putting it at the top of a newest-first
    list would make it look like the latest thing that happened. */
export function runsForward(order: Order) {
  return order !== 'newest'
}

export interface Sift {
  order: Order
  /** Empty means everything. A set rather than one value because a reader
      comparing what a book's people say to where it happens wants two kinds on
      screen at once, and making them choose is making them do the work. */
  types: EntryType[]
}

export const ALL: Sift = { order: 'kept', types: [] }

export function sifting(s: Sift) {
  return s.types.length > 0
}

/** Add or drop one kind, leaving the rest alone. */
export function toggleType(s: Sift, type: EntryType): Sift {
  return {
    ...s,
    types: s.types.includes(type)
      ? s.types.filter((t) => t !== type)
      : /* Kept in registry order rather than tap order, so the chip row and
           the summary line never disagree about which came first. */
        KINDS.filter((t) => t === type || s.types.includes(t)),
  }
}

/** How many of each kind this book holds. The number on every filter chip, and
    the reason a kind with none of anything can be greyed rather than hidden —
    a reader should be able to see that pictures exist as an idea. */
export function tally(keeps: Entry[]): Map<EntryType, number> {
  const out = new Map<EntryType, number>()
  for (const t of KINDS) out.set(t, 0)
  for (const e of keeps) out.set(e.type, (out.get(e.type) ?? 0) + 1)
  return out
}

/** The tie between two plot threads that follow one another.

    Filter to threads alone and the cards stop being a list and become one
    argument: hunch, then suspicion, then certainty, each tied to the last. The
    line thickens as the reader gets surer, which is the only place in the app
    where a drawn line carries a value rather than a decoration. */
export interface Tie {
  up: boolean
  down: boolean
  /** 1, 2 or 3 — the stance of this keep. */
  weight: number
}

export interface Row {
  keep: Entry
  tie?: Tie
}

/** The rows the journey renders, in the order it renders them. */
export function arrange(keeps: Entry[], sift: Sift): Row[] {
  let kept = keeps
  if (sift.types.length) kept = kept.filter((e) => sift.types.includes(e.type))

  const chrono = [...kept].sort((a, b) => a.createdAt - b.createdAt)
  const plain = (list: Entry[]): Row[] => list.map((keep) => ({ keep }))

  let rows: Row[]
  switch (sift.order) {
    case 'kept':
      rows = plain(chrono)
      break

    case 'newest':
      rows = plain([...chrono].reverse())
      break

    case 'book':
      /* Keeps with no page or percent cannot be placed in the book, so they follow the
         ones that can, still in the order they were kept. */
      const pos = (e: Entry) => e.page ?? (e.percent !== undefined ? e.percent * 10 : Infinity)
      rows = plain(
        [...chrono].sort((a, b) => pos(a) - pos(b) || a.createdAt - b.createdAt),
      )
      break
  }

  return tie(rows)
}

/* Two plot threads that stand next to each other are tied to each other —
   whatever the current filter is. Filtered down to threads alone, every row
   is a thread, so the whole argument strings together; on the full journey a
   tie only appears when two threads happen to be neighbours, which is the
   honest version of the same statement. */
function tie(rows: Row[]): Row[] {
  const thread = (row?: Row) => row?.keep.type === 'thread'
  return rows.map((row, i) => {
    if (!thread(row)) return row
    const up = i > 0 && thread(rows[i - 1])
    const down = i < rows.length - 1 && thread(rows[i + 1])
    if (!up && !down) return row
    return {
      ...row,
      tie: { up, down, weight: STANCE[row.keep.stance ?? 'hunch'].weight },
    }
  })
}
