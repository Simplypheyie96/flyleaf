/* ---- TEMPORARY: a shelf to look at ----

   A deployed Flyleaf opens on an empty library, which is correct for a reader
   and useless for looking at. Every link so far has needed someone to add
   books by hand before there was anything to review, and the reviewer's shelf
   then differed from the last reviewer's.

   So a build lays down a shelf if — and only if — there is not one
   already. Three of these are invented, and two are books that were added
   through the real search, so between them they exercise both cover paths: a
   photographed jacket from Open Library, and the drawn one for a book with no
   jacket to find.

   THIS IS SCAFFOLDING, and as of now it runs everywhere — production too, so
   the live app has something on its shelf while it is being reviewed. Only
   one guard is left standing:

   - It writes nothing into a table that already has a row in it, so it can
     never touch a shelf someone has started. A reader who adds a book before
     this is removed keeps their own library; a reader who arrives to an empty
     one inherits these five.

   That second case is the reason this cannot ship. Before Flyleaf is put in
   front of anyone real, either restore the production guard in vite.config.ts
   or delete this file and the one `seedLibrary()` call in main.tsx. The
   define in vite.config.ts goes with it. */

import db, { type Book, type Entry, type Strand } from './db'

declare const __PREVIEW_SEED__: boolean

/* Fixed ids, not generated ones. The two real books carry the id that
   seedFrom(title, author) gives them, which is the same id the add sheet would
   compute — so adding "Quiet" through search on a seeded shelf edits the row
   that is already there instead of shelving it twice. */
const PREVIEW_SHELF: Book[] = [
  {
    id: 366657726,
    title: 'The Salt Path',
    author: 'Raynor Winn',
    pages: 288,
    /* Somewhere in, so the journey header has a progress figure to show and
       is not reviewed with one of its three facts missing. Scaffolding, like
       the rest of this file. */
    pagesRead: 203,
    covers: [],
    format: 'physical',
    startedOn: '2019-03-14',
    addedAt: 1785519409830,
  },
  {
    id: 111111,
    title: 'A Field Guide to Quiet Hours',
    author: 'M. Hale',
    pages: 244,
    /* The book the preview journey hangs off, and the reason it is an
       invented one: everything kept from it below had to be written by hand,
       and putting invented quotations under a real author's name — even in
       scaffolding, even locally — is not a thing to do. */
    pagesRead: 168,
    covers: [],
    formats: ['physical', 'audio'],
    startedOn: '2026-07-02',
    addedAt: 1785494033136,
  },
  {
    id: 222222,
    title: 'Salt Meridian',
    author: 'R. Okonkwo',
    pages: 318,
    covers: [],
    format: 'audio',
    startedOn: '2026-06-11',
    addedAt: 1785494029136,
  },
  {
    id: 333333,
    title: 'The Long Room',
    author: 'T. Fairweather',
    pages: 190,
    covers: [],
    format: 'digital',
    startedOn: '2026-05-20',
    addedAt: 1785494024136,
  },
  {
    id: 3816777860,
    title: 'Quiet',
    author: 'Susan Cain',
    year: 2012,
    pages: 368,
    /* `L` rather than the `M` this was originally saved with — see
       books/sources.ts for why the board wants the larger plate. */
    covers: ['https://covers.openlibrary.org/b/id/7079753-L.jpg?default=false'],
    format: 'digital',
    startedOn: '2026-07-31',
    addedAt: 1785493794416,
  },
]

/* ---- A journey to look at ----

   The shelf above is only half of what a review needs: a book detail page with
   nothing kept from it shows an empty thread, and none of the sorting,
   filtering, tagging, braiding or gathering can be seen at all. So one of the
   invented books arrives with a journey already on it — every keep type, two
   strands (one tied off, one still running), motifs that overlap, and pages
   that run in a different order from the days they were kept, so "Book order"
   and "As kept" visibly differ.

   These are real rows in the real tables. They can be edited, retagged,
   re-dated and deleted like anything else, which is the point: a placeholder
   that cannot be deleted is not a preview of the app.

   The two strands are written first and their real ids read back, because
   `strands` hands out its own keys: a reader who has already braided something
   on another book owns ids 1 and 2, and hard-coding them here would collide
   and take the whole journey down with it. So the keeps below name a strand by
   a local key and are remapped on the way in. */

const JOURNEY_BOOK = 111111

/** A day, as a timestamp, with minutes so two keeps on one day still have an
    order. Written from the ISO date so the keptOn and the createdAt can never
    disagree about which day something happened. */
function at(day: string, minute: number) {
  return Date.parse(`${day}T08:00:00Z`) + minute * 60_000
}

const HOUSE = 'house'
const NARRATOR = 'narrator'

/** A strand under its local key, with no id: the store assigns that. */
const PREVIEW_STRANDS: Record<string, Omit<Strand, 'id'>> = {
  [HOUSE]: {
    bookId: JOURNEY_BOOK,
    name: 'The house that keeps changing',
    hue: 340,
    openedAt: at('2026-07-04', 12),
    closedAt: at('2026-07-24', 40),
  },
  [NARRATOR]: {
    bookId: JOURNEY_BOOK,
    name: 'Whether she is telling the truth',
    hue: 200,
    openedAt: at('2026-07-11', 20),
  },
}

/** A keep before it has a home: `strand` is the local key above, swapped for a
    real `strandId` in `seedLibrary`, and `id` is left to the store for the same
    reason the strands leave theirs. Media is attached there too, because both
    blobs are made in the browser and cannot be written into a `const` here. */
type Fixture = Omit<Entry, 'id' | 'strandId'> & { strand?: string }

const PREVIEW_JOURNEY: Fixture[] = [
  {
    bookId: JOURNEY_BOOK,
    type: 'strand',
    text: 'The rooms are described twice and they are not the same rooms. I am going to watch this.',
    keptOn: '2026-07-04',
    createdAt: at('2026-07-04', 12),
    strand: HOUSE,
    strandMark: 'open',
  },
  {
    bookId: JOURNEY_BOOK,
    type: 'quote',
    text: 'The weather came in the way news does, all at once and from someone who had not decided how to say it.',
    page: 18,
    chapter: 'One',
    keptOn: '2026-07-05',
    createdAt: at('2026-07-05', 30),
    motifs: ['weather', 'the house'],
    strand: HOUSE,
  },
  {
    bookId: JOURNEY_BOOK,
    type: 'note',
    text: 'Third time the hallway has been called “short”. Either the house is smaller than she remembers or she is telling it smaller on purpose.',
    page: 31,
    chapter: 'Two',
    keptOn: '2026-07-07',
    createdAt: at('2026-07-07', 55),
    motifs: ['the house'],
    strand: HOUSE,
  },
  {
    bookId: JOURNEY_BOOK,
    type: 'highlight',
    text: 'nobody in this village has ever agreed about the year the water came up',
    page: 47,
    keptOn: '2026-07-09',
    createdAt: at('2026-07-09', 15),
    motifs: ['weather'],
  },
  {
    bookId: JOURNEY_BOOK,
    type: 'strand',
    text: 'She keeps correcting herself and then not correcting the correction.',
    keptOn: '2026-07-11',
    createdAt: at('2026-07-11', 20),
    strand: NARRATOR,
    strandMark: 'open',
  },
  {
    bookId: JOURNEY_BOOK,
    type: 'voice',
    duration: 22,
    text: 'Walking back from the shop, thinking about the flood chapter.',
    keptOn: '2026-07-14',
    createdAt: at('2026-07-14', 5),
    motifs: ['weather'],
    strand: NARRATOR,
  },
  {
    bookId: JOURNEY_BOOK,
    type: 'image',
    text: 'The margin where I gave up arguing with her.',
    page: 122,
    keptOn: '2026-07-18',
    createdAt: at('2026-07-18', 45),
    motifs: ['the house'],
  },
  {
    bookId: JOURNEY_BOOK,
    type: 'quote',
    text: 'Grief, she said, is mostly furniture. You keep walking into it in the dark and blaming the room.',
    page: 140,
    chapter: 'Nine',
    keptOn: '2026-07-21',
    createdAt: at('2026-07-21', 10),
    motifs: ['grief', 'the house'],
    strand: NARRATOR,
  },
  {
    bookId: JOURNEY_BOOK,
    type: 'strand',
    text: 'It was one house all along and she was describing it from two different years. Tied off.',
    page: 155,
    keptOn: '2026-07-24',
    createdAt: at('2026-07-24', 40),
    strand: HOUSE,
    strandMark: 'close',
  },
  {
    bookId: JOURNEY_BOOK,
    type: 'note',
    text: 'Fifty pages left and I have started reading slower on purpose.',
    page: 168,
    keptOn: '2026-07-28',
    createdAt: at('2026-07-28', 25),
    motifs: ['grief'],
  },
]

/** Six seconds of nothing, as a real WAV, so the voice keep has a recording to
    draw and to play rather than a broken control. Silent on purpose: what it
    is for is watching the orb breathe, and a synthesised tone on a page about
    someone's reading would be worse than nothing.

    8-bit PCM silence is 128, not 0 — an array of zeroes is full-scale
    negative, which is a click. */
function silentWav(seconds: number) {
  const rate = 8000
  const frames = rate * seconds
  const buf = new ArrayBuffer(44 + frames)
  const view = new DataView(buf)
  const tag = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(offset + i, s.charCodeAt(i))
  }
  tag(0, 'RIFF')
  view.setUint32(4, 36 + frames, true)
  tag(8, 'WAVE')
  tag(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, rate, true)
  view.setUint32(28, rate, true)
  view.setUint16(32, 1, true)
  view.setUint16(34, 8, true)
  tag(36, 'data')
  view.setUint32(40, frames, true)
  new Uint8Array(buf, 44).fill(128)
  return new Blob([buf], { type: 'audio/wav' })
}

/** A drawn stand-in for a photographed page, so the image keep has something
    with real proportions in it. Drawn rather than shipped: no binary in the
    repo, no request over the network, and it is obviously not a photograph. */
function previewPhoto() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="675" viewBox="0 0 900 675">
    <defs>
      <linearGradient id="light" x1="0" y1="0" x2="0.7" y2="1">
        <stop offset="0" stop-color="#f6efe2"/>
        <stop offset="1" stop-color="#dccfb6"/>
      </linearGradient>
    </defs>
    <rect width="900" height="675" fill="url(#light)"/>
    <rect x="96" y="72" width="708" height="531" rx="6" fill="#fbf7ee"/>
    ${Array.from({ length: 14 }, (_, i) => {
      const y = 132 + i * 33
      const w = i === 13 ? 300 : 560 + ((i * 37) % 90)
      return `<rect x="150" y="${y}" width="${w}" height="7" rx="3.5" fill="#c9bda6"/>`
    }).join('')}
    <rect x="150" y="264" width="392" height="26" rx="6" fill="#e7d79b" opacity="0.75"/>
  </svg>`
  return new Blob([svg], { type: 'image/svg+xml' })
}

export async function seedLibrary() {
  if (!__PREVIEW_SEED__) return

  /* Both blobs before the transaction opens. A Dexie transaction that awaits a
     promise which is not one of its own is closed by the time it resumes. */
  const withMedia = PREVIEW_JOURNEY.map((keep) =>
    keep.type === 'voice'
      ? { ...keep, media: silentWav(keep.duration ?? 6) }
      : keep.type === 'image'
        ? { ...keep, media: previewPhoto() }
        : keep,
  )

  /* Two guards, not one, and they are deliberately independent.

     The shelf is laid down only on a device with no books at all. The journey
     is laid down only when the book it belongs to is on the shelf with nothing
     kept from it — which is true on a fresh device, and also true on every
     device that was seeded before this journey existed. A single
     `books.count() > 0` guard around both would mean those earlier devices
     never see a journey at all, which is most of the ones being reviewed.

     Neither can touch a reader's own work: the first only writes into an empty
     library, and the second only into an invented book that has nothing under
     it. Delete the book, or keep one thing from it, and this stops.

     One transaction around each count and its write, so two tabs opening at
     once cannot both read zero and both write the same rows. */
  await db.transaction('rw', db.books, async () => {
    if ((await db.books.count()) > 0) return
    await db.books.bulkAdd(PREVIEW_SHELF)
  })

  await db.transaction('rw', db.books, db.entries, db.strands, async () => {
    if (!(await db.books.get(JOURNEY_BOOK))) return
    if ((await db.entries.where('bookId').equals(JOURNEY_BOOK).count()) > 0) return

    const keys = Object.keys(PREVIEW_STRANDS)
    const ids = (await db.strands.bulkAdd(
      keys.map((key) => PREVIEW_STRANDS[key] as Strand),
      { allKeys: true },
    )) as number[]
    const assigned = new Map(keys.map((key, i) => [key, ids[i]]))

    await db.entries.bulkAdd(
      withMedia.map(({ strand, ...keep }) => ({
        ...keep,
        ...(strand ? { strandId: assigned.get(strand) } : {}),
      })) as Entry[],
    )
  })
}
