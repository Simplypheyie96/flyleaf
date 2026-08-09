/* ---- CLEARING THE LIVE APP, ONCE, BEFORE ANYONE REAL ARRIVES ----

   For a while the preview seed ran in production too, so the live link had a
   demo shelf to look at. It has also been reviewed on real phones, which added
   real books to prove the search worked. None of that belongs to the people
   about to be handed the link, and turning the seed off does not reach a
   device that already has it — those rows are ordinary rows in an ordinary
   table by now.

   So the production build wipes the slate exactly once. Every book, keep and
   sitting, and every scrap of Flyleaf's own local state, so the app opens the
   way it will open for a stranger: no shelf, no name, no theme, the first-run
   introduction. The `SWEPT` stamp is written afterwards and is the only thing
   that survives, so the wipe happens on the next launch after this ships and
   never again — a reader who starts keeping things that same evening still has
   them the next morning.

   THIS IS DESTRUCTIVE AND IT IS NOT REVERSIBLE. It is correct only in the
   narrow window it was written for: nobody is using Flyleaf yet, so the only
   thing it can destroy is test data. The window closes the moment the link
   goes out. Once it has shipped and every device that could still be carrying
   the old data has opened the app, DELETE THIS FILE and its call in main.tsx.
   Leaving it in the codebase is a loaded gun — a later edit to the stamp, or a
   reader clearing their browser's local storage, would take a real journey
   with it.

   Development is exempt. The dev shelf is a working surface and re-seeds
   anyway, and wiping it on every `npm run dev` would delete the thing being
   worked on. */

import db from './db'

declare const __PREVIEW_SEED__: boolean

/** Written after the wipe, never before. If the wipe throws, the stamp is not
    set and the next launch tries again, which is the right way round: a device
    that failed to clear should still clear. */
const SWEPT = 'flyleaf-reset-1'

/** Everything Flyleaf keeps outside the database is under this prefix, so the
    sweep does not have to enumerate keys and cannot fall behind a new one. */
const PREFIX = 'flyleaf-'

export async function clearEverything() {
  /* A build that still seeds must not also wipe, or dev and preview would lay
     the shelf down and take it straight back off. Reading the same flag the
     seed reads, rather than ordering the two calls in main.tsx, means the pair
     cannot be got the wrong way round by a later edit. */
  if (__PREVIEW_SEED__) return
  if (localStorage.getItem(SWEPT) === '1') return

  await db.transaction('rw', db.books, db.entries, db.sittings, async () => {
    await Promise.all([db.books.clear(), db.entries.clear(), db.sittings.clear()])
  })

  /* Collected before anything is removed: removing while iterating `key(i)`
     re-indexes the list underneath the loop and skips every other key. */
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key?.startsWith(PREFIX)) keys.push(key)
  }
  keys.forEach((key) => localStorage.removeItem(key))

  localStorage.setItem(SWEPT, '1')
}
