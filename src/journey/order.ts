/* How a journey is read.

   The thread down the page is chronological by default, because that is what
   a journey is. But a reader looking for one thing wants other orders, and the
   moment the order changes the braid has to be honest about it: a second line
   drawn "through the stretch where a strand was live" means nothing once the
   rows are no longer in time order. So `braid` is computed only for the two
   orders that are still time, and dropped for the ones that are not — the
   strand is still named on every keep tied to it, it simply stops pretending
   to be a span. */

import type { Entry, EntryType, Strand } from '../data/db'

export type Order = 'kept' | 'newest' | 'book' | 'strand' | 'motif'

export const ORDERS: { value: Order; label: string; hint: string }[] = [
  { value: 'kept', label: 'As kept', hint: 'oldest first, the way it happened' },
  { value: 'newest', label: 'Newest first', hint: 'the last thing you kept, at the top' },
  { value: 'book', label: 'Book order', hint: 'by page, the way the book runs' },
  { value: 'strand', label: 'By strand', hint: 'grouped under what you were following' },
  { value: 'motif', label: 'By motif', hint: 'grouped by what they are about' },
]

export interface Sift {
  order: Order
  type: EntryType | null
  motif: string | null
  strandId: number | null
}

export const ALL: Sift = { order: 'kept', type: null, motif: null, strandId: null }

export function sifting(s: Sift) {
  return s.type !== null || s.motif !== null || s.strandId !== null
}

/** One strand's ribbon at one row. */
export interface BraidPass {
  strandId: number
  hue: number
  /** Which line out from the spine this strand runs on, 0-based. */
  lane: number
  /** This keep is tied to this strand — the braid knots here. */
  knot: boolean
  first: boolean
  last: boolean
}

export interface Row {
  keep: Entry
  braid: BraidPass[]
  /** A group heading printed above this row, when the order groups. */
  divider?: string
}

/** Lanes, assigned once per book so a strand keeps the same line for its
    whole life. Greedy by opening time: a strand takes the lowest lane not
    already occupied by a strand still running when it opens. Two strands that
    never overlap share a lane, which keeps the braid narrow on the phone. */
export function lanes(strands: Strand[]): Map<number, number> {
  const out = new Map<number, number>()
  const busy: number[] = [] // lane -> closedAt of its current occupant
  for (const s of [...strands].sort((a, b) => a.openedAt - b.openedAt)) {
    let lane = busy.findIndex((until) => until <= s.openedAt)
    if (lane === -1) lane = busy.length
    busy[lane] = s.closedAt ?? Number.MAX_SAFE_INTEGER
    out.set(s.id, lane)
  }
  return out
}

const MOTIFLESS = 'Unmarked'
const STRANDLESS = 'Loose'

/** The rows the journey renders, in the order it renders them. */
export function arrange(keeps: Entry[], strands: Strand[], sift: Sift): Row[] {
  const byId = new Map(strands.map((s) => [s.id, s]))
  const lane = lanes(strands)

  let kept = keeps
  if (sift.type) kept = kept.filter((e) => e.type === sift.type)
  if (sift.strandId !== null) kept = kept.filter((e) => e.strandId === sift.strandId)
  if (sift.motif) kept = kept.filter((e) => e.motifs?.includes(sift.motif!))

  const chrono = [...kept].sort((a, b) => a.createdAt - b.createdAt)

  /* The braid, on the two orders where a span still means something. It is
     built off the unfiltered timeline so that filtering to one type does not
     make a strand look shorter than it was. */
  const braidAt = (e: Entry): BraidPass[] => {
    if (sift.order !== 'kept' && sift.order !== 'newest') return []
    const passes: BraidPass[] = []
    for (const s of strands) {
      const end = s.closedAt ?? Number.MAX_SAFE_INTEGER
      if (e.createdAt < s.openedAt || e.createdAt > end) continue
      passes.push({
        strandId: s.id,
        hue: s.hue,
        lane: lane.get(s.id) ?? 0,
        knot: e.strandId === s.id,
        first: e.createdAt === s.openedAt,
        last: e.createdAt === end,
      })
    }
    return passes
  }

  const plain = (list: Entry[]): Row[] =>
    list.map((keep) => ({ keep, braid: braidAt(keep) }))

  switch (sift.order) {
    case 'kept':
      return plain(chrono)

    case 'newest':
      return plain([...chrono].reverse())

    case 'book':
      /* Keeps with no page cannot be placed in the book, so they follow the
         ones that can, still in the order they were kept. Sorting them to the
         front on a page of 0 would put every voice note before chapter one. */
      return plain(
        [...chrono].sort(
          (a, b) => (a.page ?? Infinity) - (b.page ?? Infinity) || a.createdAt - b.createdAt,
        ),
      )

    case 'strand':
      return grouped(chrono, braidAt, (e) =>
        e.strandId !== undefined ? [byId.get(e.strandId)?.name ?? STRANDLESS] : [STRANDLESS],
      )

    case 'motif':
      return grouped(chrono, braidAt, (e) =>
        e.motifs?.length ? e.motifs : [MOTIFLESS],
      )
  }
}

/* A keep can carry several motifs, so grouping duplicates it under each one.
   That is the right answer for a reader — a quote about grief and the sea
   belongs under both headings — and it is why the group key is an array. */
function grouped(
  chrono: Entry[],
  braidAt: (e: Entry) => BraidPass[],
  keysOf: (e: Entry) => string[],
): Row[] {
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
    const loose = (n: string) => (n === MOTIFLESS || n === STRANDLESS ? 1 : 0)
    return loose(a) - loose(b) || buckets.get(a)![0].createdAt - buckets.get(b)![0].createdAt
  })

  const rows: Row[] = []
  for (const name of names) {
    let head = true
    for (const keep of buckets.get(name)!) {
      rows.push({ keep, braid: braidAt(keep), divider: head ? name : undefined })
      head = false
    }
  }
  return rows
}

/** Every motif used in this book, commonest first — the filter list. */
export function motifsIn(keeps: Entry[]) {
  const tally = new Map<string, number>()
  for (const e of keeps) for (const m of e.motifs ?? []) tally.set(m, (tally.get(m) ?? 0) + 1)
  return [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

/** A strand's colour, resolved against whichever theme is on. Lightness and
    chroma belong to the room; only the hue belongs to the strand. */
export function strandColor(hue: number) {
  return `oklch(var(--strand-l) var(--strand-c) ${hue})`
}

/* Six hues spaced far enough apart to be told apart at 2px wide, and chosen to
   sit beside the five keep colours rather than collide with them. */
const HUES = [340, 200, 300, 30, 160, 250]

export function nextHue(strands: Strand[]) {
  const used = new Set(strands.map((s) => s.hue))
  return HUES.find((h) => !used.has(h)) ?? HUES[strands.length % HUES.length]
}
