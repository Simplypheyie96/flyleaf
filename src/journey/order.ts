/* How a journey is read.

   The thread down the page is chronological by default, because that is what a
   journey is. A reader looking for one thing wants other orders and other
   subsets, and this file is the whole of that: filter, sort, group, and the one
   piece of drawing logic that depends on all three — the tie between plot
   threads. Nothing here renders; it decides what is on the page and in what
   order, and `BookJourney` draws whatever it is handed. */

import type { Entry, EntryType } from '../data/db'
import { KINDS, STANCE } from './kinds'

export type Order = 'kept' | 'newest' | 'book' | 'motif'

export const ORDERS: { value: Order; label: string; hint: string }[] = [
  { value: 'kept', label: 'As kept', hint: 'oldest first, the way it happened' },
  { value: 'newest', label: 'Newest first', hint: 'the last thing you kept, at the top' },
  { value: 'book', label: 'Book order', hint: 'by page, the way the book runs' },
  { value: 'motif', label: 'By motif', hint: 'grouped by what they are about' },
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
  motif: string | null
}

export const ALL: Sift = { order: 'kept', types: [], motif: null }

export function sifting(s: Sift) {
  return s.types.length > 0 || s.motif !== null
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
  /** A group heading printed above this row, when the order groups. */
  divider?: string
  tie?: Tie
}

const MOTIFLESS = 'Unmarked'

/** The rows the journey renders, in the order it renders them. */
export function arrange(keeps: Entry[], sift: Sift): Row[] {
  let kept = keeps
  if (sift.types.length) kept = kept.filter((e) => sift.types.includes(e.type))
  if (sift.motif) kept = kept.filter((e) => e.motifs?.includes(sift.motif!))

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
      /* Keeps with no page cannot be placed in the book, so they follow the
         ones that can, still in the order they were kept. Sorting them to the
         front on a page of 0 would put every voice memo before chapter one. */
      rows = plain(
        [...chrono].sort(
          (a, b) => (a.page ?? Infinity) - (b.page ?? Infinity) || a.createdAt - b.createdAt,
        ),
      )
      break

    case 'motif':
      rows = grouped(chrono, (e) => (e.motifs?.length ? e.motifs : [MOTIFLESS]))
      break
  }

  return tie(rows, sift)
}

/* A keep can carry several motifs, so grouping duplicates it under each one.
   That is the right answer for a reader — a quote about grief and the sea
   belongs under both headings — and it is why the group key is an array. */
function grouped(chrono: Entry[], keysOf: (e: Entry) => string[]): Row[] {
  const buckets = new Map<string, Entry[]>()
  for (const e of chrono) {
    for (const key of keysOf(e)) {
      const bucket = buckets.get(key)
      if (bucket) bucket.push(e)
      else buckets.set(key, [e])
    }
  }

  /* Named groups in the order their first keep was kept; the catch-all last,
     wherever it fell, because "everything else" is not a subject. */
  const names = [...buckets.keys()].sort((a, b) => {
    const loose = (n: string) => (n === MOTIFLESS ? 1 : 0)
    return loose(a) - loose(b) || buckets.get(a)![0].createdAt - buckets.get(b)![0].createdAt
  })

  const rows: Row[] = []
  for (const name of names) {
    let head = true
    for (const keep of buckets.get(name)!) {
      rows.push({ keep, divider: head ? name : undefined })
      head = false
    }
  }
  return rows
}

/* The tie is drawn only when plot threads are the *only* thing on screen.
   Mixed in with quotes and pictures, a line joining rows three apart would be
   a line drawn over unrelated things; alone, the rows are consecutive and the
   line means exactly what it looks like. A divider breaks it, because two
   motifs are two arguments. */
function tie(rows: Row[], sift: Sift): Row[] {
  const only = sift.types.length === 1 && sift.types[0] === 'thread'
  if (!only) return rows
  return rows.map((row, i) => ({
    ...row,
    tie: {
      up: i > 0 && !row.divider,
      down: i < rows.length - 1 && !rows[i + 1].divider,
      weight: STANCE[row.keep.stance ?? 'hunch'].weight,
    },
  }))
}

/** Every motif used in this book, commonest first — the filter list. */
export function motifsIn(keeps: Entry[]) {
  const tallied = new Map<string, number>()
  for (const e of keeps) for (const m of e.motifs ?? []) tallied.set(m, (tallied.get(m) ?? 0) + 1)
  return [...tallied.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}
