/* ---- TEMPORARY: a shelf for previews ----

   A deployed Flyleaf opens on an empty library, which is correct for a reader
   and useless for looking at. Every preview link so far has needed someone to
   add books by hand before there was anything to review, and the reviewer's
   shelf then differed from the last reviewer's.

   So a preview build lays down a shelf if — and only if — there is not one
   already. Three of these are invented, and two are books that were added
   through the real search, so between them they exercise both cover paths: a
   photographed jacket from Open Library, and the drawn one for a book with no
   jacket to find.

   THIS IS SCAFFOLDING. Two guards keep it off a real reader's device:

   1. `__PREVIEW_SEED__` is false on a production build — see vite.config.ts,
      which reads Vercel's own VERCEL_ENV. Preview and local dev seed; the
      production deployment never does.
   2. It writes nothing into a table that already has a row in it, so it can
      never touch a shelf someone has started.

   To remove: delete this file and the one `seedLibrary()` call in main.tsx.
   The define in vite.config.ts goes with it. */

import db, { type Book } from './db'

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
    covers: [],
    format: 'physical',
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

export async function seedLibrary() {
  if (!__PREVIEW_SEED__) return

  /* One transaction around the count and the write, so two tabs opening at
     once cannot both read zero and both shelve the same five books. */
  await db.transaction('rw', db.books, async () => {
    if ((await db.books.count()) > 0) return
    await db.books.bulkAdd(PREVIEW_SHELF)
  })
}
