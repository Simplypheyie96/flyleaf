/* Content for the direction picker at /lab/directions.

   One invented book and thirty-one invented keeps hanging off it, spanning
   two months so a direction that organises by time has something to organise.
   Nothing here is written to the database — the ids come from `SAMPLES`, which
   sit far outside the range Dexie hands out.

   The point of using the real `SAMPLES` rather than fresh strings is that the
   awkward lengths come with them: a quote that runs four lines, a headword
   seventeen letters long, a thread whose title is a whole sentence. A layout
   direction judged on flattering content is not judged at all. */

import { useEffect, useMemo, useState } from 'react'
import type { Book, Entry, EntryType } from '../../data/db'
import { KINDS } from '../../journey/kinds'
import { SAMPLES, drawnPicture, silence } from '../../journey/cards/samples'

/** The book every direction opens on. Invented, and deliberately not a real
    title — the reference guardrail applies to the lab as much as to the app. */
export const BOOK: Book = {
  id: 902_001,
  title: 'The Salt Orchard',
  author: 'Ivy Renshaw',
  year: 2024,
  pages: 344,
  covers: [],
  addedAt: 0,
  startedOn: '2026-06-10',
}

/** EVERY BOOK OPEN AT ONCE, in the order they were opened, newest last.

    A reader with one book open is the easy case and the one every direction
    was drawn against; a reader with three is the one that finds the bugs. The
    third was opened today and has nothing kept out of it yet, so the day-one
    branch — no furthest page, no gauge — renders live rather than only behind
    `?n=0`.

    `seen` is the furthest page a keep has been taken from. The FIRST book gets
    its own from the stream, because every sample keep hangs off that one; the
    others carry theirs here, since inventing thirty more keeps to prove a
    shelf row would change the tally, the palette and the word index with it. */
export const OPEN: (Book & { seen?: number })[] = [
  BOOK,
  {
    id: 902_005,
    title: 'Notes on a Drowned Field',
    author: 'Halvard Sjoberg',
    year: 2021,
    pages: 212,
    covers: [],
    addedAt: 0,
    startedOn: '2026-07-02',
    seen: 88,
  },
  {
    id: 902_006,
    title: 'The Ninth Kite',
    author: 'Amara Obi',
    year: 2025,
    pages: 296,
    covers: [],
    addedAt: 0,
    startedOn: '2026-07-13',
    seen: 0,
  },
]

export const READER = { name: 'Mabel', face: 'mabel' }

/** Every sample keep, hung off the one book, newest first.

    Newest first because that is what the journey does and what Home draws
    from; a direction that wants to read forwards can reverse it, and one of
    them does. */
/* Seven more, all quotes and notes.

   The gallery keeps exactly three of every type, which is right for judging
   eight drawings and wrong for judging a stream: a reader's own mix is never
   even. Three of everything makes a kind-tally read as a colour swatch rather
   than as a portrait, and it makes every month look the same height. Real
   reading is lopsided — a fistful of quotes, a few notes, one word looked up,
   the odd recording — so the lopsidedness is put back here.

   Ids continue past the gallery's, still far outside the range Dexie hands
   out. Invented, and belonging to no real book. */
const EXTRA: Entry[] = [
  {
    id: 903_001, bookId: 0, createdAt: 0, type: 'quote', keptOn: '2026-06-12', page: 19,
    text: 'Salt gets into everything eventually. Wood, linen, the way a family talks to itself.',
  },
  {
    id: 903_002, bookId: 0, createdAt: 0, type: 'quote', keptOn: '2026-06-19', page: 88,
    text: 'She had the particular patience of someone who has already decided how it ends.',
  },
  {
    id: 903_003, bookId: 0, createdAt: 0, type: 'quote', keptOn: '2026-06-24', page: 131,
    text: 'Nobody in that house ever said the orchard. They said out there, and everyone knew which out there was meant.',
  },
  {
    id: 903_004, bookId: 0, createdAt: 0, type: 'quote', keptOn: '2026-07-05', page: 246,
    text: 'Grief is mostly logistics, he thought, and was ashamed of the thought for about four seconds.',
  },
  {
    id: 903_005, bookId: 0, createdAt: 0, type: 'quote', keptOn: '2026-07-12', page: 301,
    text: 'The lighthouse did not warn anyone. It only insisted, once every nine seconds, that the coast was still there.',
  },
  {
    id: 903_006, bookId: 0, createdAt: 0, type: 'note', keptOn: '2026-06-24',
    text: 'Three chapters in a row now that open on weather and close on somebody lying. I do not think that is an accident.',
  },
  {
    id: 903_007, bookId: 0, createdAt: 0, type: 'note', keptOn: '2026-07-12', chapter: 'Twenty-two',
    text: 'Finished this on the balcony and sat there a while. Do not want to start anything else tonight.',
  },
]

export const STREAM: Entry[] = [...KINDS.flatMap((kind) => SAMPLES[kind]), ...EXTRA]
  .map((keep) => ({ ...keep, bookId: BOOK.id }))
  .sort((a, b) => b.keptOn.localeCompare(a.keptOn) || b.id - a.id)

/* ── Media ────────────────────────────────────────────────────────────────

   Pictures and recordings are made on the device, exactly as the card gallery
   makes them, so the picture card is judged on a picture and the voice card on
   something that actually plays. A direction compared against two empty states
   is a direction compared against nothing. */

export function useStream() {
  const [media, setMedia] = useState<Record<number, Blob>>({})

  useEffect(() => {
    let live = true
    const made: Record<number, Blob> = {}
    for (const keep of SAMPLES.voice) made[keep.id] = silence(keep.duration ?? 30)

    void Promise.all(
      SAMPLES.image.map(async (keep) => {
        made[keep.id] = await drawnPicture(keep.id)
      }),
    ).then(() => {
      if (live) setMedia(made)
    })

    return () => {
      live = false
    }
  }, [])

  /* One pass, so a keep object is stable between renders — the drawings hold
     object URLs keyed on the blob, and a new blob every render would revoke
     and remake every picture on the page. */
  return useMemo(
    () => STREAM.map((keep) => (media[keep.id] ? { ...keep, media: media[keep.id] } : keep)),
    [media],
  )
}

/* ── Dates ────────────────────────────────────────────────────────────────

   The keeps carry an ISO day and nothing else, so every label on every
   direction is derived here rather than formatted eight times over. Parsed at
   local midnight: `new Date('2026-06-14')` is UTC, and west of Greenwich that
   is the thirteenth. */

export function day(iso: string) {
  return new Date(`${iso}T00:00:00`)
}

export const DAY_NUMBER = (iso: string) => String(day(iso).getDate())
export const WEEKDAY = (iso: string) =>
  day(iso).toLocaleDateString(undefined, { weekday: 'short' })
export const MONTH = (iso: string) =>
  day(iso).toLocaleDateString(undefined, { month: 'long' })
export const YEAR = (iso: string) => String(day(iso).getFullYear())
export const SHORT = (iso: string) =>
  day(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

/** How long ago, in the app's own voice — never a timestamp, because nobody
    remembers the hour they kept something. */
export function ago(iso: string, from = '2026-07-13') {
  const days = Math.round((day(from).getTime() - day(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'last week'
  if (days < 31) return `${Math.round(days / 7)} weeks ago`
  return `in ${MONTH(iso)}`
}

export interface DayGroup {
  iso: string
  keeps: Entry[]
}

export interface MonthGroup {
  key: string
  month: string
  year: string
  days: DayGroup[]
  count: number
}

/** The stream, grouped by day and then by month, in the order it is handed in. */
export function calendar(stream: Entry[]): MonthGroup[] {
  const months: MonthGroup[] = []
  for (const keep of stream) {
    const key = keep.keptOn.slice(0, 7)
    let month = months.at(-1)
    if (!month || month.key !== key) {
      month = { key, month: MONTH(keep.keptOn), year: YEAR(keep.keptOn), days: [], count: 0 }
      months.push(month)
    }
    let group = month.days.at(-1)
    if (!group || group.iso !== keep.keptOn) {
      group = { iso: keep.keptOn, keeps: [] }
      month.days.push(group)
    }
    group.keeps.push(keep)
    month.count += 1
  }
  return months
}

/** How many of each kind are in the stream, biggest first — the reader's own
    palette, which is the one number Home does not currently show them. */
export function palette(stream: Entry[]): { kind: EntryType; count: number }[] {
  const tally = new Map<EntryType, number>()
  for (const keep of stream) tally.set(keep.type, (tally.get(keep.type) ?? 0) + 1)
  return KINDS.filter((kind) => tally.has(kind))
    .map((kind) => ({ kind, count: tally.get(kind)! }))
    .sort((a, b) => b.count - a.count)
}

/* ── The riff's extra material ────────────────────────────────────────────

   Everything below exists because the second round of Home modules asks for
   facts the one-book stream cannot supply: a keep from a year ago, a shelf of
   finished books, a week of sittings, and chapter boundaries. All invented,
   all in the same range of ids, none of it written anywhere. */

export const TODAY = '2026-07-13'

/** A keep from this same date a year ago, out of a book that is long closed.

    The module built on it renders nothing at all on a day with no match, so
    the interesting case to design against is the one where there IS a match —
    which is why it is here rather than left to chance. */
export const ANNIVERSARY: { keep: Entry; book: string; author: string } = {
  keep: {
    id: 904_001,
    bookId: 902_002,
    createdAt: 0,
    type: 'quote',
    keptOn: '2025-07-13',
    page: 77,
    text: 'You can tell how long a family has lived somewhere by what they have stopped noticing.',
  },
  book: 'The Paper Wasp',
  author: 'Dunya Aldouri',
}

export interface Closed {
  id: number
  title: string
  author: string
  startedOn: string
  finishedOn: string
  /** Seconds in the chair, as the sitting log would total them. */
  seconds: number
}

/** Books already closed, newest first. Two long ones and one that took four
    days, so the "how long it took" line has a range to prove itself on. */
export const SHELF: Closed[] = [
  {
    id: 902_002,
    title: 'The Paper Wasp',
    author: 'Dunya Aldouri',
    startedOn: '2026-04-28',
    finishedOn: '2026-06-08',
    seconds: 41_400,
  },
  {
    id: 902_003,
    title: 'Small Hours at the Tannery',
    author: 'Petra Lund',
    startedOn: '2026-04-20',
    finishedOn: '2026-04-24',
    seconds: 9_720,
  },
  {
    id: 902_004,
    title: 'What the Cartographer Left Out',
    author: 'Owen Keast',
    startedOn: '2026-02-11',
    finishedOn: '2026-04-16',
    seconds: 63_000,
  },
]

/** The last seven days of sittings, oldest first, in seconds. Two zero days on
    purpose — a week that is full every day is a week that proves nothing. */
export const WEEK: { iso: string; seconds: number }[] = [
  { iso: '2026-07-07', seconds: 2_640 },
  { iso: '2026-07-08', seconds: 0 },
  { iso: '2026-07-09', seconds: 4_500 },
  { iso: '2026-07-10', seconds: 1_500 },
  { iso: '2026-07-11', seconds: 0 },
  { iso: '2026-07-12', seconds: 5_820 },
  { iso: '2026-07-13', seconds: 1_980 },
]

/** Hours and minutes, the way the app already says them elsewhere. */
export function spell(seconds: number) {
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  const rest = mins % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

/** Whole days between two ISO days, inclusive of neither end. */
export function span(from: string, to: string) {
  return Math.round((day(to).getTime() - day(from).getTime()) / 86_400_000)
}

export interface Chapter {
  name: string
  from: number
  to: number
}

/** The book's own chapters. Invented, and the reason one journey direction can
    be organised by where in the book a thing happened rather than by when it
    was kept. */
export const CHAPTERS: Chapter[] = [
  { name: 'The Sea Road', from: 1, to: 48 },
  { name: 'Halloran’s Yard', from: 49, to: 106 },
  { name: 'The Winter Room', from: 107, to: 168 },
  { name: 'What the House Saw', from: 169, to: 244 },
  { name: 'Out There', from: 245, to: 310 },
  { name: 'Salt', from: 311, to: 344 },
]

/** Which chapter a keep fell in, or null when it carries no page.

    Null is the common case and not an edge one: only a quote or a word looked
    up tends to arrive with a page on it, and a direction that hides the
    pageless keeps is hiding half the drawer. */
export function chapterOf(keep: Entry): Chapter | null {
  if (!keep.page) return null
  return CHAPTERS.find((c) => keep.page! >= c.from && keep.page! <= c.to) ?? null
}

/** The furthest page any keep reached — the only "how far in" the data can
    honestly produce, since nothing in the app has ever written a `pagesRead`. */
export function furthest(stream: Entry[]) {
  return stream.reduce((far, keep) => Math.max(far, keep.page ?? 0), 0)
}
