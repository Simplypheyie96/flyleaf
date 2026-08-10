/* The whole journey, in one file, for free.

   This is 09's zero-account safety net and the only migration path that costs
   the builder nothing: everything a reader has kept — every book, every quote,
   note, recording and picture — written into a single file they can put on a
   USB stick, mail to themselves, or drop into any other device running Flyleaf.

   FORMAT. One JSON document with a version number, not a zip. A zip would be
   smaller for pictures and would need a dependency, a worker to build it
   without freezing the page, and a second code path to read it back. JSON is
   readable by the reader themselves — you can open your own journey in a text
   editor and see your own words, which for a keepsake app is worth more than
   the bytes it costs. Media rides along base64-encoded, which inflates it by a
   third; that is the price, and it is stated in the UI rather than hidden.

   HONESTY. An export is a snapshot. Nothing written after it is in it, so the
   settings card shows the date of the last one rather than a green tick that
   would imply otherwise.

   IMPORT IS A MERGE, NOT A REPLACE. Restoring onto a device that already has
   books must never be the thing that loses the reader work. Books key on the
   cover seed, so the same book from two devices is one book. Keeps key on
   their content rather than their id — ids are per-device autoincrements and
   collide meaninglessly — so importing the same file twice adds nothing the
   second time. */

import { IMPRINT } from '../brand/imprint'
import db, { type Book, type Entry, type Grave, type Sitting } from './db'
import {
  bookGrave,
  bookMadeAt,
  buriedWhen,
  fingerprint,
  isBuried,
  keepGrave,
  keepMadeAt,
  sittingGrave,
} from './graves'
import { SEED_GRAVES } from './seed'
import { adopt } from './adopt'
import { lockOff, packLock, unpackLock } from './lock'
import { getFace, setFace } from './reader'

/** Bumped only when a reader's older file would otherwise be misread.

    Sittings did NOT bump it, on purpose. The number is a floor, not a
    changelog: `importJourney` refuses any file whose number is higher than the
    one it knows, so bumping it would make every older install reject a whole
    journey — books, keeps, recordings and all — over a table it has no use
    for. An optional array is invisible to a reader on version 1: they get
    their entire library and lose only a stopwatch's minutes. Bump this when a
    field CHANGES MEANING, never when one is added. */
const FORMAT = 1

const LAST_EXPORT_KEY = 'flyleaf-exported-at'

interface PackedEntry extends Omit<Entry, 'id' | 'media'> {
  media?: { type: string; data: string }
}

interface Journey {
  /** Written first so it is the first thing a reader sees on opening the file
      in a text editor, which the header above promises they can do. It is a
      label, never a test: `importJourney` reads `flyleaf` to decide whether a
      file is one of ours, and every journey written before this line existed
      must still restore. */
  keptIn: string
  flyleaf: number
  exportedAt: number
  handle?: string
  /** The avatar seed, travelling with the name for the same reason the name
      travels: a reader who signs in on a second device and finds no face has
      arrived at somebody else's copy of their journal. Not a picture — see
      reader.ts/getFace. */
  face?: string
  books: Book[]
  entries: PackedEntry[]
  /** Absent in every file written before the clock existed. */
  sittings?: Omit<Sitting, 'id'>[]
  /** The deletions. Absent in every file written before they were recorded,
      which reads as "this device has never deleted anything" — the behaviour
      the format had all along, so an old file still restores exactly as it
      did. See data/graves.ts for why a merge needs them at all. */
  graves?: Grave[]
  /** The door, never the key: a salt and a PBKDF2 hash, which cannot be turned
      back into the reader's code. Absent when the journal has no lock, and
      taken on the way in only by a device that has none of its own. See
      data/lock.ts for why arriving is one-way. */
  lock?: { salt: string; hash: string; hint?: string; setAt?: number }
  /** When this device last took its lock OFF, if it ever did. Carried for one
      reason: without it a code lives forever. The reader removes it here, the
      Drive copy still holds the hash somebody's other device wrote last week,
      and the next sync hands it straight back — "i removed the code, but it
      just keeps showing up, both on mac and iphone". A removal is a fact about
      the journal exactly as a deletion is, so it travels like one. */
  lockOff?: number
}

/* Blob ↔ base64, in chunks.

   `String.fromCharCode(...bytes)` on a two-megabyte recording spreads two
   million arguments across the call stack and throws. 32k at a time is well
   under every engine's limit and costs one pass over the array. */
function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

function fromBase64(data: string): Uint8Array {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** What makes two keeps the same keep across two devices.

    Two answers, in order. A uid when the keep has one, because it survives an
    edit and the content does not: correcting a typo used to change the
    content, so the other device met the corrected quote as a quote it had
    never seen and kept BOTH — the mistake and the fix, side by side on the
    thread. The content fingerprint for everything written before uids existed,
    which is what this was on its own.

    The fingerprint itself has moved to graves.ts. A headstone names a keep the
    same way a merge does, or it is a headstone over an empty plot. */
function identify(
  entry: Pick<Entry, 'uid' | 'bookId' | 'type' | 'keptOn' | 'createdAt' | 'text' | 'name'>,
) {
  return entry.uid ?? fingerprint(entry)
}

export interface JourneySize {
  books: number
  keeps: number
}

/** Everything on the shelf, packed and handed back as a file. */
export async function exportJourney(handle: string): Promise<{ blob: Blob; name: string; size: JourneySize }> {
  const [books, entries, sittings, graves] = await Promise.all([
    db.books.toArray(),
    db.entries.toArray(),
    db.sittings.toArray(),
    db.graves.toArray(),
  ])

  const packed: PackedEntry[] = await Promise.all(
    entries.map(async ({ id: _id, media, ...rest }) => {
      if (!media) return rest
      const bytes = new Uint8Array(await media.arrayBuffer())
      return { ...rest, media: { type: media.type, data: toBase64(bytes) } }
    }),
  )

  /* Purge any graves that correspond to active books, entries, or sittings.
     An active item cannot also be dead. */
  const activeKeys = new Set([
    ...books.map((b) => bookGrave(b.id)),
    ...entries.map((e) => keepGrave(e)),
    ...sittings.map((s) => sittingGrave(s)),
  ])
  const deadActiveKeys = graves.filter((g) => activeKeys.has(g.key)).map((g) => g.key)
  if (deadActiveKeys.length) {
    await db.graves.bulkDelete(deadActiveKeys)
  }
  const cleanGraves = graves.filter((g) => !activeKeys.has(g.key))

  const journey: Journey = {
    keptIn: IMPRINT,
    flyleaf: FORMAT,
    exportedAt: Date.now(),
    handle: handle || undefined,
    face: getFace() || undefined,
    lock: packLock(),
    lockOff: lockOff() || undefined,
    books,
    entries: packed,
    // Ids dropped here for the same reason they are dropped on the way back
    // in: they are per-device autoincrements and mean nothing anywhere else.
    sittings: sittings.map(({ id: _id, ...rest }) => rest),
    graves: cleanGraves,
  }

  const blob = new Blob([JSON.stringify(journey)], { type: 'application/json' })
  const day = new Date().toISOString().slice(0, 10)
  return {
    blob,
    name: `flyleaf-journey-${day}.json`,
    size: { books: books.length, keeps: entries.length },
  }
}

/** Remember the day, so the settings card can be honest about how old the
    snapshot is rather than saying "backed up" forever. */
export function markExported() {
  try {
    localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()))
  } catch {
    /* Nothing to do — the export still happened, we just cannot date it. */
  }
  window.dispatchEvent(new Event('flyleaf-reader'))
}

export function lastExport(): number | null {
  try {
    const at = Number(localStorage.getItem(LAST_EXPORT_KEY))
    return at > 0 ? at : null
  } catch {
    return null
  }
}

export interface Restored {
  /** Books actually written to the shelf — not how many the file held.

      Those two were the same number for as long as an import could not be
      refused, and then headstones arrived and they came apart, silently: the
      note said four books came across while the shelf stayed empty, because
      the count was read off the FILE and the rows had been dropped one line
      earlier. A number a reader can check against their own shelf has to be
      counted where the writing happens. */
  books: number
  keeps: number
  /** Already on this device, so nothing was written for them. */
  skipped: number
  handle?: string
  /** Not a journey from this Flyleaf, so the reader has to be told what came
      across. `first` is the older Flyleaf's own export, every kind of which is
      understood; `foreign` is another app's file, which can only ever carry
      books, quotes and notes. */
  adopted?: 'first' | 'foreign'
}

export interface Restoring {
  /** Does this file outrank the headstones?

      A sync says no, and must: a sync is the two devices comparing notes, and
      a deletion is one of the notes. If the arriving copy could raise its own
      dead then nothing could ever be deleted — every book would come straight
      back on the next round trip.

      A reader choosing a file off their own disk says yes. They have gone
      looking for that file, found it, and pressed Restore; refusing them
      their own books because they deleted them here last month is the app
      overruling somebody about their own reading. Worse, it does it in
      silence, and worse again it is permanent — book ids are a hash of the
      title and author, so the same book re-exported next year is refused by
      the same headstone.

      So a hand-picked file exhumes what it carries. Only what it carries, and
      never anything the file ITSELF buries: a file saying "this book is gone"
      is still believed. */
  exhume?: boolean
}

/** Read a journey file back onto this device, merging rather than replacing. */
export async function importJourney(file: File, how: Restoring = {}): Promise<Restored> {
  const text = await file.text()

  let journey: Journey
  try {
    journey = JSON.parse(text) as Journey
  } catch {
    throw new Error('That file is not readable. It needs to be a .json file.')
  }

  /* NOT OURS, BUT STILL A LIBRARY.

     A file that fails the Flyleaf test is not necessarily rubbish — it is far
     more likely to be another reading app's export, which is the one moment a
     reader is most likely to be carrying one. `adopt` reads it by meaning and
     hands back whatever it could honestly recognise; from there it is an
     ordinary merge, so nothing below has to know where the books came from. */
  const ours = typeof journey?.flyleaf === 'number' && Array.isArray(journey.books) && Array.isArray(journey.entries)
  let adopted: Restored['adopted']
  if (!ours) {
    const foreign = adopt(text)
    if (!foreign) throw new Error('No books found in that file.')
    journey = {
      keptIn: IMPRINT,
      flyleaf: FORMAT,
      exportedAt: Date.now(),
      handle: foreign.handle,
      books: foreign.books,
      entries: foreign.entries,
    }
    adopted = foreign.first ? 'first' : 'foreign'
  } else if (journey.flyleaf > FORMAT) {
    throw new Error('That journey was saved by a newer Flyleaf. Update this device first.')
  }

  /* THE HEADSTONES, BEFORE ANYTHING ELSE, and from both sides.

     Deletions are facts about the journey, not about a device, so the two
     sides' headstones are unioned exactly like the rows are — a book deleted
     on the phone stays deleted when the laptop's copy of the file arrives, and
     a book deleted on the laptop is taken off the phone by the same union
     coming back the other way. Everything below then checks against this set
     rather than trying to remember which side each key came from. */
  const graves = await buriedWhen()
  /* SEED HEADSTONES NEVER ARRIVE. `unseed` stopped writing them and takes down
     the ones this device holds, but Drive copies written before that fix still
     carry them, and two of the five ids they name — `seedFrom(title, author)`
     for The Salt Path and for Quiet — are exactly the ids a reader's OWN copies
     of those books have. Letting them in deletes her books on the way past. */
  const arriving = (journey.graves ?? []).filter(
    (grave) => !graves.has(grave.key) && !SEED_GRAVES.has(grave.key),
  )
  for (const grave of arriving) graves.set(grave.key, grave.at)

  /* AND THEN, FOR A HAND-PICKED FILE, THE OTHER DIRECTION. See `Restoring`.
     The stones come down before anything below consults them, so the ordinary
     merge underneath needs no idea this happened. */
  const raised: string[] = []
  if (how.exhume) {
    const itsOwn = new Set((journey.graves ?? []).map((grave) => grave.key))
    const carried = [
      ...journey.books.map((book) => bookGrave(book.id)),
      ...journey.entries.map((entry) => `e:${identify(entry as Entry)}`),
      ...(journey.sittings ?? []).map((sit) => sittingGrave(sit)),
    ]
    for (const key of carried) {
      if (itsOwn.has(key) || !graves.has(key)) continue
      graves.delete(key)
      raised.push(key)
    }

    /* Restoring/exhuming a file is an explicit reader action occurring RIGHT NOW.
       Stamp all imported books & entries with the current timestamp so past deletion
       graves (from Drive or local history) cannot bury these restored items. */
    const now = Date.now()
    for (const book of journey.books) {
      book.addedAt = Math.max(book.addedAt ?? 0, now)
      book.editedAt = Math.max(book.editedAt ?? 0, now)
    }
    for (const entry of journey.entries) {
      const e = entry as Entry
      e.createdAt = Math.max(e.createdAt ?? 0, now)
      e.editedAt = Math.max(e.editedAt ?? 0, now)
    }
  }

  const existing = await db.entries.toArray()
  /* Indexed by identity rather than counted, because an incoming keep now has
     three possible fates rather than two: unknown (add it), known and older
     (skip it), known and NEWER (rewrite the row in place, which is what makes
     an edit on one device an edit on the other rather than a duplicate). */
  const here = new Map<string, Entry>()
  for (const entry of existing) {
    /* Under BOTH names, not just the current one, and that is the bridge over
       the day uids arrived. A keep written before them is on two devices with
       no uid; the first edit on either side mints one, so its file arrives
       naming a keep the other device still knows only by its content. Indexing
       both means the correction lands on the existing row instead of beside
       it. */
    if (entry.uid) here.set(entry.uid, entry)
    here.set(fingerprint(entry), entry)
  }

  const incoming: Entry[] = []
  const edits: Entry[] = []
  let skipped = 0
  for (const { media, ...rest } of journey.entries) {
    const entry = rest as Entry
    const key = identify(entry)

    /* Buried on one side or the other. Not counted as skipped: "already on
       this device" is what that number tells the reader, and a keep they
       deleted is not on this device at all. */
    if (isBuried(graves, `e:${key}`, keepMadeAt(entry))) continue

    const mine = here.get(key) ?? here.get(fingerprint(entry))
    if (mine && (entry.editedAt ?? 0) <= (mine.editedAt ?? 0)) {
      skipped += 1
      continue
    }

    if (media) {
      const bytes = fromBase64(media.data)
      // A fresh ArrayBuffer, so the Blob owns its bytes rather than a view
      // into a buffer this loop is about to move past.
      entry.media = new Blob([bytes.slice().buffer], { type: media.type })
    }

    if (mine) {
      /* This device's row id, the other device's contents. Keeping the id
         matters: it is what every open screen is holding the keep by, and a
         delete-then-add would make an edit look like the keep disappearing and
         a new one arriving in its place. */
      const merged = { ...entry, id: mine.id }
      edits.push(merged)
      here.set(key, merged)
      here.set(fingerprint(merged), merged)
      continue
    }

    here.set(key, entry)
    here.set(fingerprint(entry), entry)
    incoming.push(entry)
  }

  /* Sittings dedupe on the moment they started, which is exact to the
     millisecond and cannot legitimately repeat: one reader cannot begin two
     sittings on the same book in the same millisecond. So re-importing the
     same file adds none of them, the way re-importing keeps adds none. */
  const already = new Set((await db.sittings.toArray()).map((sit) => `${sit.bookId} ${sit.startedAt}`))
  const sittings = (journey.sittings ?? []).filter((sit) => {
    const key = `${sit.bookId} ${sit.startedAt}`
    if (already.has(key) || isBuried(graves, sittingGrave(sit), sit.startedAt)) return false
    already.add(key)
    return true
  })

  /* Books, the same three fates. `bulkPut` alone would hand the row to
     whichever side happened to be read last, so a change made on the phone
     this morning could be undone by a laptop that has been shut since Tuesday.
     The stamp decides instead of the arrival order. */
  const mineByBook = new Map((await db.books.toArray()).map((book) => [book.id, book]))
  const books = journey.books.filter((book) => {
    if (isBuried(graves, bookGrave(book.id), bookMadeAt(book))) return false
    const mine = mineByBook.get(book.id)
    return !mine || (book.editedAt ?? 0) > (mine.editedAt ?? 0)
  })

  await db.transaction('rw', db.books, db.entries, db.sittings, db.graves, async () => {
    if (books.length) await db.books.bulkPut(books)
    if (edits.length) await db.entries.bulkPut(edits)
    if (incoming.length) {
      // Ids are per-device. Dropping them lets Dexie assign fresh ones and
      // keeps two devices' autoincrements from fighting over the same row.
      await db.entries.bulkAdd(incoming.map(({ id: _id, ...rest }) => rest as Entry))
    }
    if (sittings.length) await db.sittings.bulkAdd(sittings as Sitting[])
    const raisedSet = new Set(raised)
    const cleanArriving = arriving.filter((grave) => !raisedSet.has(grave.key))
    if (cleanArriving.length) await db.graves.bulkPut(cleanArriving)
    /* The raised stones leave for good, not just for this import — a headstone
       still standing would take the books back off the shelf on the very next
       sync, which is the same silence in a slower form. */
    if (raised.length) await db.graves.bulkDelete(raised)

    /* AND THEN THE DIGGING, last, over rows that were already here.

       Everything above only declined to ADD what is buried. This is the other
       half: the reader deleted a book on their phone, and this laptop has been
       holding it all along with nothing to prompt it to let go. The file
       arriving is that prompt. Last, so it also takes back out anything a
       stale copy in the same file smuggled in. */
    if (cleanArriving.length) {
      /* AND EVERY ONE OF THESE IS DATED. A headstone can only take down a row
         that was already there when it was raised — see graves.ts/isBuried. The
         set alone deleted a book the reader had deliberately added back after
         deleting it, on every sync, forever, because a book's id is a hash of
         its title and author and so the old grave fits the new row perfectly. */
      const dead = new Map(cleanArriving.map((grave) => [grave.key, grave.at]))
      const goners = (await db.books.toArray()).filter((book) =>
        isBuried(dead, bookGrave(book.id), bookMadeAt(book)),
      )
      if (goners.length) await db.books.bulkDelete(goners.map((book) => book.id))

      const keeps = (await db.entries.toArray()).filter((entry) =>
        isBuried(dead, keepGrave(entry), keepMadeAt(entry)),
      )
      if (keeps.length) await db.entries.bulkDelete(keeps.map((entry) => entry.id))

      const sits = (await db.sittings.toArray()).filter((sit) =>
        isBuried(dead, sittingGrave(sit), sit.startedAt),
      )
      if (sits.length) await db.sittings.bulkDelete(sits.map((sit) => sit.id))
    }
  })

  /* After the rows, not before: a device that took the lock and then failed to
     write the reading would be a door in front of an empty room. */
  unpackLock(journey.lock, journey.lockOff ?? 0)

  /* Only when this device has none. A reader who deliberately picked a
     different face on the phone keeps it; a fresh device gets the one they
     already chose, instead of a blank where their avatar should be. */
  if (journey.face && !getFace()) setFace(journey.face)

  return {
    books: books.length,
    keeps: incoming.length,
    skipped,
    handle: journey.handle,
    adopted,
  }
}

/** Hand the file to the browser. Kept here so both Settings and any future
    caller download it the same way, including the object-URL cleanup that is
    easy to forget and leaks the whole journey's worth of memory. */
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  // A tick, not immediately: Safari has not started reading the blob when
  // click() returns, and revoking synchronously gives it an empty file.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
