/* ---- TAKING THE DEMO SHELF BACK OFF ----

   For a while the preview seed ran in production too, at the owner's call, so
   the live link had something on its shelf while it was being looked at.
   Turning the seed off stops the next device inheriting five books that are
   not its reader's. It does nothing at all for the devices that already have
   them — a phone that seeded weeks ago keeps that shelf for ever, because the
   rows are now ordinary rows in an ordinary table.

   So this sweeps them off, once, on whatever device is carrying them.

   THE DANGEROUS PART, and the reason this file is careful rather than short:
   two of the five demo books are real books, and they carry the id that
   `seedFrom(title, author)` computes — which is exactly the id a reader gets
   when they add the same book through search. Matching on id alone would
   delete a stranger's own copy of Quiet along with ours.

   So a row has to match on id AND on the `addedAt` the fixture was written
   with. Those are frozen constants baked into seed.ts; a real add stamps
   `Date.now()`. The chance of a reader's own add landing on one of these five
   millisecond values is nil, and unlike the id it is not something the app can
   ever recompute into a collision. A book that matches only the id — a reader
   who genuinely added Quiet — is left exactly where it is.

   Keeps and sittings go with a book only when we actually removed that book.
   If a reader had made the demo shelf their own by writing on it, that work
   would go too; that is the correct reading of "clear the demo data", and it
   is the reason this runs now, before the app is in front of anyone, rather
   than a year from now.

   This file has a job with an end. Once no device in the wild can still be
   carrying the seed, delete it and its call in main.tsx. */

import db from './db'

declare const __PREVIEW_SEED__: boolean

/** The five fixtures, as `id → addedAt`. Copied rather than imported: seed.ts
    is compiled out of the production build, and this has to run there. It is
    also correct that they cannot drift apart — these are a record of what was
    written, not a description of what the seed currently writes. */
const DEMO: Record<number, number> = {
  366657726: 1785519409830, // The Salt Path
  111111: 1785494033136, // A Field Guide to Quiet Hours
  222222: 1785494029136, // Salt Meridian
  333333: 1785494024136, // The Long Room
  3816777860: 1785493794416, // Quiet
}

/** The key the seed used to remember which revision of the demo journey a
    device had. Left behind it would do no harm, but a device that somehow
    re-seeds later should start from nothing rather than from a version stamp
    claiming it is already current. */
const SEED_V = 'flyleaf-seed-v'

/** Remembers that the sweep has run, so it costs one `localStorage` read per
    launch rather than three table reads. Not the guard against deleting twice
    — the matching is the guard, and it is safe to run any number of times. */
const SWEPT = 'flyleaf-demo-swept'

/** The reading clock, if one was left running. It is the one piece of state
    outside the three tables that names a book by id, and a clock still ticking
    against a book that has just been taken off the shelf would stop into a
    sitting for a book that does not exist. */
const RUNNING = 'flyleaf-sitting'

export async function clearDemoData() {
  /* A build that still seeds must not also sweep, or dev and preview would lay
     the shelf down and take it straight back off. Reading the same flag the
     seed reads, rather than ordering the two calls, means the pair can never
     be got the wrong way round by a later edit to main.tsx. */
  if (__PREVIEW_SEED__) return
  if (localStorage.getItem(SWEPT) === '1') return

  await db.transaction('rw', db.books, db.entries, db.sittings, async () => {
    const ids = (await db.books.bulkGet(Object.keys(DEMO).map(Number)))
      .filter((book) => book !== undefined && book.addedAt === DEMO[book.id])
      .map((book) => book!.id)

    if (ids.length === 0) return

    await db.books.bulkDelete(ids)
    await db.entries.where('bookId').anyOf(ids).delete()
    await db.sittings.where('bookId').anyOf(ids).delete()

    try {
      const running = JSON.parse(localStorage.getItem(RUNNING) ?? 'null')
      if (running && ids.includes(running.bookId)) localStorage.removeItem(RUNNING)
    } catch {
      /* Unparseable, which `readRunning` already treats as no clock at all. */
    }
  })

  localStorage.removeItem(SEED_V)
  localStorage.setItem(SWEPT, '1')
}
