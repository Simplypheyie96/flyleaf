/* THE READER'S OWN WAY OUT.

   Flyleaf keeps everything on the reader's device and nothing on a server, and
   that promise only means something if they can also take it back. Until this
   existed the only way to leave was browser DevTools, which is not a thing any
   app may reasonably ask of the person using it: "we hold your data and you
   cannot delete it" is the shape of the problem, not a detail of it.

   Deliberately not `reset.ts`. That one runs itself, once, on a device the
   reader never asked it to touch; this one runs only when a reader has read
   what it takes and asked for it by name. They are opposite in every way that
   matters, and keeping them apart means deleting the automatic one — which
   should happen — cannot take the reader's own control with it.

   THIS IS NOT REVERSIBLE AND THERE IS NO COPY ANYWHERE ELSE. Everything about
   how it is offered — the counts, the last-saved date, the export sitting
   beside it, the typed word — exists because there is no undo behind it. */

import db from './db'

/** Everything Flyleaf keeps outside the database shares this prefix, so the
    sweep does not have to list keys by hand and cannot fall behind a new one
    added later. */
const PREFIX = 'flyleaf-'

/* Carried across the wipe rather than removed with everything else.

   TEMPORARY, and it goes when src/data/reset.ts goes. That file wipes the app
   once on first production launch and writes this stamp so it never runs
   again — and the stamp lives under the same prefix this sweep clears. Erase
   without putting it back and the next launch would find no stamp, decide the
   device had never been swept, and wipe again: harmless the moment it happens,
   since the device is already empty, but it would then be armed against
   whatever the reader writes next. Re-stamping keeps the automatic sweep spent.

   The reader's own erase is not diminished by this: the stamp says only that a
   one-time housekeeping job already ran. It holds nothing of theirs. */
const KEEP: readonly string[] = ['flyleaf-reset-1']

/** Take everything off this device: the shelf, the keeps, the sittings, and
    every scrap of local state down to the reader's name. What is left is a
    browser that has never opened Flyleaf. */
export async function eraseEverything() {
  const carried = KEEP.map((key) => {
    try {
      return [key, localStorage.getItem(key)] as const
    } catch {
      return [key, null] as const
    }
  })

  /* The database first. If this throws, the sweep stops here with the reader's
     local state intact — a failed erase that left the name and the theme is
     recoverable and visibly incomplete; one that cleared them and left the
     books behind would look like it had worked. */
  await db.transaction('rw', db.books, db.entries, db.sittings, db.graves, async () => {
    await Promise.all([
      db.books.clear(),
      db.entries.clear(),
      db.sittings.clear(),
      db.graves.clear(),
    ])
  })

  /* Collected before anything is removed: removing while walking `key(i)`
     re-indexes the list underneath the loop and skips every other key. */
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key?.startsWith(PREFIX)) keys.push(key)
  }
  keys.forEach((key) => localStorage.removeItem(key))

  carried.forEach(([key, value]) => {
    if (value !== null) localStorage.setItem(key, value)
  })
}
