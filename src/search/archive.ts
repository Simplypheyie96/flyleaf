/* One search over everything the reader has personally kept.

   06 asks for the archive to be findable in seconds and for it to work
   offline. Both fall out of the same decision: the search runs against Dexie
   on the device, never a server, so there is no network path to be slow or
   absent. What it costs is that the matching is ours to write.

   HOW IT MATCHES, in two passes.
   1. Every word of the query must appear somewhere in the record. Not a
      prefix — a reader hunting a half-remembered line types the middle of it.
   2. Only if that finds nothing, the same terms are tried as subsequences:
      the letters in order, gaps allowed. That catches a dropped letter, a
      doubled one, and most one-handed typing, and it costs one pass over a
      string the reader can already see. It is deliberately the fallback and
      not the rule, because a subsequence match on short words matches almost
      everything and would bury the exact hits it was meant to rescue.

   WHAT IT READS. `db.entries.each` rather than `toArray`: an entry carries its
   recording or its picture, and a library with a year of voice notes would
   otherwise hold every megabyte of them in memory to build a list of lines.
   Each row is copied down to the six fields that can be searched or shown and
   the blob is dropped on the floor for the collector. */

import { useEffect, useState } from 'react'
import db, { type Book, type Entry, type EntryType } from '../data/db'

/** A keep, minus the megabytes. */
export interface Found {
  id: number
  bookId: number
  type: EntryType
  text?: string
  name?: string
  keptOn: string
  page?: number
  chapter?: string
  hasMedia: boolean
}

export interface Archive {
  books: Book[]
  keeps: Found[]
  /** True when nothing matched the words exactly and these are near misses. */
  loose: boolean
}

const NOTHING: Archive = { books: [], keeps: [], loose: false }

/* Fold accents and case together, so `Brontë` is found by `bronte` and a
   reader who types their quotes with smart apostrophes can find them with a
   straight one. */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
}

export function terms(query: string): string[] {
  return fold(query).split(/\s+/).filter(Boolean)
}

/** The letters of `term`, in order, somewhere in `hay`. */
function loosely(hay: string, term: string): boolean {
  // Two letters as a subsequence matches nearly every sentence in the book.
  if (term.length < 4) return hay.includes(term)
  let at = 0
  for (const letter of term) {
    at = hay.indexOf(letter, at)
    if (at < 0) return false
    at += 1
  }
  return true
}

function hits(hay: string, words: string[], loose: boolean): boolean {
  return words.every((word) => (loose ? loosely(hay, word) : hay.includes(word)))
}

/** The words shown under a result: a window around the first match, so the
    reader sees the part of their own note that answered the search. */
export function excerptAround(text: string, words: string[], span = 120): string {
  const folded = fold(text)
  const at = words.map((word) => folded.indexOf(word)).filter((i) => i >= 0)
  const first = at.length ? Math.min(...at) : 0
  if (text.length <= span) return text
  // Back up to a word boundary so the snippet never opens mid-word.
  const start = Math.max(0, first - span / 3)
  const cut = start > 0 ? text.indexOf(' ', start) + 1 || start : 0
  const end = Math.min(text.length, cut + span)
  return `${cut > 0 ? '…' : ''}${text.slice(cut, end).trim()}${end < text.length ? '…' : ''}`
}

async function run(query: string): Promise<Archive> {
  const words = terms(query)
  if (!words.length) return NOTHING

  const books = await db.books.toArray()

  const keeps: Found[] = []
  const near: Found[] = []
  await db.entries.each((entry: Entry) => {
    const hay = fold([entry.name ?? '', entry.text ?? '', entry.chapter ?? ''].join(' '))
    const exact = hits(hay, words, false)
    if (!exact && !hits(hay, words, true)) return
    const found: Found = {
      id: entry.id,
      bookId: entry.bookId,
      type: entry.type,
      text: entry.text,
      name: entry.name,
      keptOn: entry.keptOn,
      page: entry.page,
      chapter: entry.chapter,
      hasMedia: Boolean(entry.media),
    }
    ;(exact ? keeps : near).push(found)
  })

  const shelf = books.filter((book) => hits(fold(`${book.title} ${book.author}`), words, false))
  const shelfNear = books.filter(
    (book) => !shelf.includes(book) && hits(fold(`${book.title} ${book.author}`), words, true),
  )

  if (shelf.length || keeps.length) {
    // Newest first, the same order the shelf and the feed use.
    return { books: shelf, keeps: keeps.sort(byNewest), loose: false }
  }
  return { books: shelfNear, keeps: near.sort(byNewest), loose: shelfNear.length + near.length > 0 }
}

function byNewest(a: Found, b: Found) {
  return b.keptOn.localeCompare(a.keptOn)
}

export type ArchiveState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'done'; archive: Archive; query: string }

/** Debounced search over the device's own archive. */
export function useArchive(query: string): ArchiveState {
  const [state, setState] = useState<ArchiveState>({ status: 'idle' })

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setState({ status: 'idle' })
      return
    }
    setState({ status: 'searching' })

    // Short, because this is local: 120ms is under the gap between two typed
    // characters and long enough that a held key does not run seven scans.
    let live = true
    const timer = setTimeout(() => {
      run(q)
        .then((archive) => live && setState({ status: 'done', archive, query: q }))
        .catch(() => live && setState({ status: 'done', archive: NOTHING, query: q }))
    }, 120)

    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [query])

  return state
}
