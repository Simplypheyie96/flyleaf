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

import { SURVEY_BOX, surveyMarks } from '../journey/cards/art'
import db, { type Book, type Entry } from './db'

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
    formats: ['physical'],
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
    /* Two at once — the paperback at home and the narrator on the way there.
       One book on the shelf has to carry a pair, or the multi-select in the
       journey header is only ever reviewed with a single answer in it. */
    formats: ['audio', 'physical'],
    startedOn: '2026-06-11',
    addedAt: 1785494029136,
  },
  {
    id: 333333,
    title: 'The Long Room',
    author: 'T. Fairweather',
    pages: 190,
    covers: [],
    formats: ['digital'],
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
    formats: ['digital'],
    startedOn: '2026-07-31',
    addedAt: 1785493794416,
  },
]

/* ---- A journey to look at ----

   The shelf above is only half of what a review needs: a book detail page with
   nothing kept from it shows an empty thread, and none of the sorting,
   filtering, tagging or gathering can be seen at all. So one of the invented
   books arrives with a journey already on it — all seven kinds of keep, three
   plot threads at the three stances so the tie between them can be seen
   hardening, a place with a map and a place without one, motifs that overlap,
   and pages that run in a different order from the days they were kept, so
   "Book order" and "As kept" visibly differ.

   These are real rows in the real table. They can be edited, retagged,
   re-dated and deleted like anything else, which is the point: a placeholder
   that cannot be deleted is not a preview of the app. */

const JOURNEY_BOOK = 111111

/** A day, as a timestamp, with minutes so two keeps on one day still have an
    order. Written from the ISO date so the keptOn and the createdAt can never
    disagree about which day something happened. */
function at(day: string, minute: number) {
  return Date.parse(`${day}T08:00:00Z`) + minute * 60_000
}

/** A keep before it has a home. `id` is left to the store, and media is
    attached in `seedLibrary` because both blobs are made in the browser and
    cannot be written into a `const` here. */
type Fixture = Omit<Entry, 'id'>

const PREVIEW_JOURNEY: Fixture[] = [
  {
    bookId: JOURNEY_BOOK,
    type: 'thread',
    name: 'The house that keeps changing',
    text: 'The rooms are described twice and they are not the same rooms. I am going to watch this.',
    stance: 'hunch',
    page: 12,
    keptOn: '2026-07-04',
    createdAt: at('2026-07-04', 12),
    motifs: ['the house'],
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
  },
  {
    bookId: JOURNEY_BOOK,
    type: 'character',
    name: 'Aunt Bel',
    avatar: 'bun',
    text: 'Runs the house and the conversation. Answers questions nobody asked and lets the asked ones sit. I do not trust a word of it and I like her enormously.',
    page: 24,
    chapter: 'Two',
    keptOn: '2026-07-06',
    createdAt: at('2026-07-06', 18),
    motifs: ['the house'],
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
  },
  {
    bookId: JOURNEY_BOOK,
    /* A place with a map pinned to it. Its pair further down has none, so both
       halves of the place card can be seen on one page. */
    type: 'place',
    name: 'Ardvane',
    text: 'The village the water came up in. Everyone dates their own life from it and nobody dates it the same year.',
    page: 47,
    keptOn: '2026-07-09',
    createdAt: at('2026-07-09', 15),
    motifs: ['weather'],
  },
  {
    bookId: JOURNEY_BOOK,
    type: 'thread',
    name: 'Whether she is telling the truth',
    text: 'She keeps correcting herself and then not correcting the correction.',
    stance: 'suspicion',
    page: 58,
    keptOn: '2026-07-11',
    createdAt: at('2026-07-11', 20),
  },
  {
    bookId: JOURNEY_BOOK,
    type: 'voice',
    duration: 22,
    text: 'Walking back from the shop, thinking about the flood chapter.',
    page: 63,
    keptOn: '2026-07-14',
    createdAt: at('2026-07-14', 5),
    motifs: ['weather'],
  },
  {
    bookId: JOURNEY_BOOK,
    type: 'place',
    name: 'The long field behind the chapel',
    text: 'Where she goes to not be in the house. Described four times and never once in daylight.',
    page: 96,
    chapter: 'Six',
    keptOn: '2026-07-16',
    createdAt: at('2026-07-16', 30),
    motifs: ['the house'],
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
  },
  {
    bookId: JOURNEY_BOOK,
    type: 'thread',
    name: 'It was one house all along',
    text: 'She was describing it from two different years. Everything that did not fit was a decade, not a lie.',
    stance: 'certain',
    page: 155,
    keptOn: '2026-07-24',
    createdAt: at('2026-07-24', 40),
    motifs: ['the house'],
  },
  {
    bookId: JOURNEY_BOOK,
    type: 'character',
    name: 'The boy from the ferry',
    avatar: 'crop',
    text: 'Six pages and he has not come back. I have a feeling about him and no evidence at all.',
    page: 161,
    keptOn: '2026-07-26',
    createdAt: at('2026-07-26', 20),
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

/** A drawn map for the place that has one, so the picture across the top of a
    place card can be reviewed with real cartography in it and not only with
    the horizon the card draws for itself when nothing is pinned.

    This used to be its own drawing and it was the weakest picture in the app:
    five wavy strokes, a river and a dashed track, on a window this wide it read
    as a smudge, and there was nothing in it a reader could name. It is now the
    app's own survey — a lake with its shore shaded, the lane, a hamlet with a
    church, a wood of separate trees — baked to fixed colours, which is the one
    thing a pinned file has to be: a blob in an <img> cannot reach a custom
    property, so `currentColor` has to be resolved here instead.

    Ink and paper are the daylight ends of the place hue and the card reverse.
    They do not flip after dark, and that is correct rather than an oversight:
    what a reader pins is a picture of a thing, and a photograph on the table
    does not turn its own lights down at night. */
function previewMap() {
  const paper = '#eee7d8'
  const ink = '#3d6a72'
  const { w } = SURVEY_BOX

  /* The survey is drawn upright, for the tall window on a plate. The postcard's
     window is a letterbox two and a third times as wide as it is high, so
     something has to go — and leaving that to `object-fit: cover` meant the
     browser took an equal bite off the top and the bottom and sliced the field
     boundaries and the north point in half on the way through. A map with
     half a compass rose on its top edge looks like a rendering fault.

     So the crop is chosen here instead of discovered there: the band from 36
     down is 200×84, which is the window's own proportion to within a pixel, and
     it holds the lane, the hamlet, the church, the lake and the whole wood with
     nothing cut through. The lane still runs off the top edge, which is what
     lanes do on maps. */
  const band = { y: 36, h: 84 }
  const { ink: strokes, wash } = surveyMarks(707182)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 5}" height="${band.h * 5}" viewBox="0 ${band.y} ${w} ${band.h}">
    <rect x="-4" y="-4" width="${w + 8}" height="${SURVEY_BOX.h + 8}" fill="${paper}"/>
    ${wash
      .map((m) => `<path d="${m.d}" fill="${ink}" fill-opacity="${m.o}"/>`)
      .join('')}
    <g fill="none" stroke="${ink}" stroke-linecap="round" stroke-linejoin="round">
      ${strokes
        .map((m) => `<path d="${m.d}" stroke-width="${m.w}" stroke-opacity="${m.o}"/>`)
        .join('')}
    </g>
  </svg>`
  return new Blob([svg], { type: 'image/svg+xml' })
}

export async function seedLibrary() {
  if (!__PREVIEW_SEED__) return

  /* Every blob before the transaction opens. A Dexie transaction that awaits a
     promise which is not one of its own is closed by the time it resumes.

     The map goes on the first place only — the second is there precisely to
     show a place without one. */
  let mapped = false
  const withMedia = PREVIEW_JOURNEY.map((keep) => {
    if (keep.type === 'voice') return { ...keep, media: silentWav(keep.duration ?? 6) }
    if (keep.type === 'image') return { ...keep, media: previewPhoto() }
    if (keep.type === 'place' && !mapped) {
      mapped = true
      return { ...keep, media: previewMap() }
    }
    return keep
  })

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

  /* The journey fixtures have been revised since the first preview went out
     (the original ten were mostly quotes; the showcase is now thirteen across
     all seven kinds). A device that seeded the old set keeps it for ever
     unless the version says otherwise — so the version says otherwise. Only
     the invented book's own rows are ever touched; a reader's real keeps
     never carry this book's id. */
  const SEED_V = 'flyleaf-seed-v'
  const CURRENT = '2'
  await db.transaction('rw', db.books, db.entries, async () => {
    if (!(await db.books.get(JOURNEY_BOOK))) return
    const have = await db.entries.where('bookId').equals(JOURNEY_BOOK).count()
    if (have > 0 && localStorage.getItem(SEED_V) === CURRENT) return
    await db.entries.where('bookId').equals(JOURNEY_BOOK).delete()
    await db.entries.bulkAdd(withMedia as Entry[])
    localStorage.setItem(SEED_V, CURRENT)
  })
}
