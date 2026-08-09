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
import db, { type Book, type Entry, type Sitting } from './db'
import { packLock, unpackLock } from './lock'
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
  /** The door, never the key: a salt and a PBKDF2 hash, which cannot be turned
      back into the reader's code. Absent when the journal has no lock, and
      taken on the way in only by a device that has none of its own. See
      data/lock.ts for why arriving is one-way. */
  lock?: { salt: string; hash: string; hint?: string }
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

/** What makes two keeps the same keep across two devices. Deliberately not the
    id: the day it was kept, what kind of thing it is, and what it says. Two
    genuinely different notes written on one day about one book would have to
    say exactly the same words to collide. */
function fingerprint(entry: Pick<Entry, 'bookId' | 'type' | 'keptOn' | 'createdAt' | 'text' | 'name'>) {
  return [entry.bookId, entry.type, entry.keptOn, entry.createdAt, entry.text ?? '', entry.name ?? ''].join('\u0000')
}

export interface JourneySize {
  books: number
  keeps: number
}

/** Everything on the shelf, packed and handed back as a file. */
export async function exportJourney(handle: string): Promise<{ blob: Blob; name: string; size: JourneySize }> {
  const [books, entries, sittings] = await Promise.all([
    db.books.toArray(),
    db.entries.toArray(),
    db.sittings.toArray(),
  ])

  const packed: PackedEntry[] = await Promise.all(
    entries.map(async ({ id: _id, media, ...rest }) => {
      if (!media) return rest
      const bytes = new Uint8Array(await media.arrayBuffer())
      return { ...rest, media: { type: media.type, data: toBase64(bytes) } }
    }),
  )

  const journey: Journey = {
    keptIn: IMPRINT,
    flyleaf: FORMAT,
    exportedAt: Date.now(),
    handle: handle || undefined,
    face: getFace() || undefined,
    lock: packLock(),
    books,
    entries: packed,
    // Ids dropped here for the same reason they are dropped on the way back
    // in: they are per-device autoincrements and mean nothing anywhere else.
    sittings: sittings.map(({ id: _id, ...rest }) => rest),
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
  books: number
  keeps: number
  /** Already on this device, so nothing was written for them. */
  skipped: number
  handle?: string
}

/** Read a journey file back onto this device, merging rather than replacing. */
export async function importJourney(file: File): Promise<Restored> {
  const text = await file.text()

  let journey: Journey
  try {
    journey = JSON.parse(text) as Journey
  } catch {
    throw new Error('That file is not a Flyleaf journey.')
  }

  if (typeof journey?.flyleaf !== 'number' || !Array.isArray(journey.books) || !Array.isArray(journey.entries)) {
    throw new Error('That file is not a Flyleaf journey.')
  }
  if (journey.flyleaf > FORMAT) {
    throw new Error('That journey was saved by a newer Flyleaf. Update this device first.')
  }

  const existing = await db.entries.toArray()
  const seen = new Set(existing.map(fingerprint))

  const incoming: Entry[] = []
  let skipped = 0
  for (const { media, ...rest } of journey.entries) {
    const entry = rest as Entry
    if (seen.has(fingerprint(entry))) {
      skipped += 1
      continue
    }
    seen.add(fingerprint(entry))
    if (media) {
      const bytes = fromBase64(media.data)
      // A fresh ArrayBuffer, so the Blob owns its bytes rather than a view
      // into a buffer this loop is about to move past.
      entry.media = new Blob([bytes.slice().buffer], { type: media.type })
    }
    incoming.push(entry)
  }

  /* Sittings dedupe on the moment they started, which is exact to the
     millisecond and cannot legitimately repeat: one reader cannot begin two
     sittings on the same book in the same millisecond. So re-importing the
     same file adds none of them, the way re-importing keeps adds none. */
  const already = new Set((await db.sittings.toArray()).map((sit) => `${sit.bookId} ${sit.startedAt}`))
  const sittings = (journey.sittings ?? []).filter((sit) => {
    const key = `${sit.bookId} ${sit.startedAt}`
    if (already.has(key)) return false
    already.add(key)
    return true
  })

  await db.transaction('rw', db.books, db.entries, db.sittings, async () => {
    // `bulkPut`, because a book keyed on its cover seed is the same book: a
    // device that already has it gets the imported copy's dates and progress
    // rather than a duplicate row.
    if (journey.books.length) await db.books.bulkPut(journey.books)
    if (incoming.length) {
      // Ids are per-device. Dropping them lets Dexie assign fresh ones and
      // keeps two devices' autoincrements from fighting over the same row.
      await db.entries.bulkAdd(incoming.map(({ id: _id, ...rest }) => rest as Entry))
    }
    if (sittings.length) await db.sittings.bulkAdd(sittings as Sitting[])
  })

  /* After the rows, not before: a device that took the lock and then failed to
     write the reading would be a door in front of an empty room. */
  unpackLock(journey.lock)

  /* Only when this device has none. A reader who deliberately picked a
     different face on the phone keeps it; a fresh device gets the one they
     already chose, instead of a blank where their avatar should be. */
  if (journey.face && !getFace()) setFace(journey.face)

  return {
    books: journey.books.length,
    keeps: incoming.length,
    skipped,
    handle: journey.handle,
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
