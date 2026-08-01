/* Flyleaf's own words.

   Six of them, and they are all borrowed from bookbinding and printing rather
   than from software, because this app is about books and "entries", "tags"
   and "AI summary" are about databases. A reader who has never seen the words
   before should be able to work out every one of them from where it sits on
   the screen — that is the test each one had to pass:

     Keep       one thing taken out of a book and held on to
     Epigraph   the line at the top of a journey, written from what you did
     Strand     something you are following through the book
     Motif      what a keep is about, in the reader's own words
     Fair Copy  a clean draft assembled from everything you wrote
     Colophon   the closing facts of the reading, at the foot of the journey

   The rule that stops this being cute: destructive and legal wording stays
   plain. "Delete" is never "unbind". A reader about to lose something must
   read the sentence in the language they would use to describe the loss. */

import type { Book, Entry, EntryType, Strand } from '../data/db'
import { formatsOf } from '../data/db'
import { fromISO, longDate, todayISO } from '../components/date/dates'

export const KEEP: Record<EntryType, { one: string; many: string }> = {
  quote: { one: 'quote', many: 'quotes' },
  note: { one: 'note', many: 'notes' },
  voice: { one: 'voice note', many: 'voice notes' },
  image: { one: 'picture', many: 'pictures' },
  highlight: { one: 'highlight', many: 'highlights' },
  strand: { one: 'strand', many: 'strands' },
}

/* Small numbers read better spelled out in a sentence and worse in a chip, so
   this is only ever used in the epigraph and the colophon prose. */
const WORDS = [
  'no',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
]

export function spell(n: number) {
  return n < WORDS.length ? WORDS[n] : `${n}`
}

export function count(n: number, of: { one: string; many: string }) {
  return `${spell(n)} ${n === 1 ? of.one : of.many}`
}

/** Whole days between two calendar days, inclusive of the first. */
export function daysBetween(a: string, b: string) {
  const ms = fromISO(b).getTime() - fromISO(a).getTime()
  return Math.round(ms / 86_400_000)
}

/** "4 March" — the short form used inside a sentence. The year is left off
    when it is this one, the way a person would say it. */
export function dayPhrase(iso: string) {
  const d = fromISO(iso)
  const thisYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    ...(thisYear ? {} : { year: 'numeric' }),
  })
}

/** The date on a keep, as the journey shows it: "today", "yesterday", then
    the day itself. Never "3d ago" — a journey is not a feed. */
export function keptLabel(iso: string) {
  const gap = daysBetween(iso, todayISO())
  if (gap === 0) return 'today'
  if (gap === 1) return 'yesterday'
  return dayPhrase(iso)
}

export function fullDate(iso: string) {
  return longDate(iso)
}

const FORMAT_VERB: Record<string, string> = {
  physical: 'read',
  digital: 'read',
  audio: 'listened to',
}

/** How the reader is taking the book in, said as a person would: one format
    is "reading", two is "reading and listening". This is what the header
    prints, and it is the reason `formats` is an array. */
export function formatPhrase(book: Book) {
  const set = new Set(formatsOf(book).map((f) => FORMAT_VERB[f]))
  const verbs = [...set]
  if (!verbs.length) return ''
  if (verbs.length === 1) return verbs[0]
  return `${verbs[0]} and ${verbs[1]}`
}

/* ── The epigraph ─────────────────────────────────────────────────────────

   The line at the top of the journey, written from what the reader actually
   did. Nothing here is invented and nothing is a model call: every clause is
   assembled from a date, a count or a type tally, so it costs nothing, works
   with no network, and can never say something about the book that the reader
   did not say first. */

export interface Epigraph {
  line: string
  /** Only when there is nothing yet — the nudge under the empty spine. */
  hint?: string
}

export function epigraph(
  book: Book,
  keeps: Entry[],
  strands: Strand[],
): Epigraph {
  const started = book.startedOn
  const finished = book.finishedOn

  if (!keeps.length) {
    return {
      line: started
        ? `Opened on ${dayPhrase(started)}. Nothing kept yet.`
        : 'Nothing kept from this one yet.',
      hint: 'A line worth copying out, a thought, thirty seconds of your own voice — whatever you would want back.',
    }
  }

  /* When it happened. Finished books get a span, live ones get an anchor. */
  let when: string
  if (started && finished) {
    const days = Math.max(1, daysBetween(started, finished))
    when =
      days > 1
        ? `Read across ${spell(days)} days, and finished on ${dayPhrase(finished)}.`
        : `Read in a day, on ${dayPhrase(finished)}.`
  } else if (finished) {
    when = `Finished on ${dayPhrase(finished)}.`
  } else if (started) {
    const days = Math.max(1, daysBetween(started, todayISO()))
    when = `Opened on ${dayPhrase(started)}, ${spell(days)} days ago.`
  } else {
    const first = keeps.reduce((a, e) => (e.keptOn < a ? e.keptOn : a), keeps[0].keptOn)
    when = `First kept on ${dayPhrase(first)}.`
  }

  /* What was kept. The commonest type is named, because "twelve keeps" tells
     a reader less about their own reading than "mostly quotes" does. */
  const marks = keeps.filter((e) => e.type !== 'strand')
  const tally = new Map<EntryType, number>()
  for (const e of marks) tally.set(e.type, (tally.get(e.type) ?? 0) + 1)
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]

  let what = ''
  if (marks.length) {
    /* Capitalised on its own before the space is put back in front of it.
       Uppercasing character 0 of a string that starts with a space raises the
       space and eats the letter after it — "seven keeps" became "even keeps". */
    let phrase = count(marks.length, { one: 'keep', many: 'keeps' })
    phrase = phrase.charAt(0).toUpperCase() + phrase.slice(1)
    if (top && tally.size > 1 && top[1] / marks.length > 0.4) {
      phrase += `, mostly ${KEEP[top[0]].many}`
    }
    what = ` ${phrase}.`
  }

  const live = strands.filter((s) => !s.closedAt).length
  const tied = strands.length - live
  /* Its own sentence, whatever ran before it, so it starts with a capital
     the same way the one above does. */
  const sentence = (s: string) => ` ${s.charAt(0).toUpperCase()}${s.slice(1)}`
  let threads = ''
  if (live) threads = sentence(`${count(live, KEEP.strand)} still running.`)
  else if (tied) threads = sentence(`${count(tied, KEEP.strand)}, tied off.`)

  return { line: `${when} ${what}${threads}`.replace(/\s+/g, ' ').trim() }
}

/* ── The colophon ─────────────────────────────────────────────────────────

   The block at the foot of a journey: the plain facts of the reading, set the
   way a printer sets them at the end of a book. Deliberately not a dashboard —
   no charts, no streaks, no percentages the reader never asked for. */

export interface ColophonLine {
  term: string
  detail: string
}

export function colophon(
  book: Book,
  keeps: Entry[],
  strands: Strand[],
): ColophonLine[] {
  const lines: ColophonLine[] = []

  if (book.startedOn) lines.push({ term: 'Opened', detail: fullDate(book.startedOn) })
  if (book.finishedOn) lines.push({ term: 'Closed', detail: fullDate(book.finishedOn) })
  if (book.startedOn && book.finishedOn) {
    const days = Math.max(1, daysBetween(book.startedOn, book.finishedOn))
    lines.push({ term: 'Over', detail: days === 1 ? 'a single day' : `${days} days` })
  }

  const formats = formatsOf(book)
  if (formats.length) {
    lines.push({
      term: 'Read as',
      detail: formats
        .map((f) => (f === 'physical' ? 'print' : f === 'digital' ? 'screen' : 'audio'))
        .join(' and '),
    })
  }

  const marks = keeps.filter((e) => e.type !== 'strand')
  if (marks.length) {
    const tally = new Map<EntryType, number>()
    for (const e of marks) tally.set(e.type, (tally.get(e.type) ?? 0) + 1)
    lines.push({
      term: 'Kept',
      detail: [...tally.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([t, n]) => `${n} ${n === 1 ? KEEP[t].one : KEEP[t].many}`)
        .join(', '),
    })
  }

  if (strands.length) {
    lines.push({
      term: 'Followed',
      detail: strands.map((s) => s.name).join(', '),
    })
  }

  const motifs = [...new Set(keeps.flatMap((e) => e.motifs ?? []))]
  if (motifs.length) lines.push({ term: 'On', detail: motifs.join(', ') })

  const pages = book.pages
  if (pages && book.pagesRead && !book.finishedOn) {
    lines.push({ term: 'Reached', detail: `page ${book.pagesRead} of ${pages}` })
  }

  return lines
}

/* ── The fair copy ────────────────────────────────────────────────────────

   A clean draft of a review, assembled out of what the reader already wrote.

   This is a collation, not a generation. Every sentence of substance below is
   the reader's own text, copied verbatim; the only words Flyleaf contributes
   are the joins, and they come from the fixed set in this file. Nothing is
   sent anywhere and nothing is inferred — which is what makes it free, what
   makes it work on a plane, and what makes it honest to hand to a reader as
   "your words, gathered" rather than as a review somebody else wrote. */

export interface FairCopy {
  text: string
  words: number
  /** Keeps that cannot be written out — recordings and pictures. Surfaced in
      the sheet so the omission is the reader's to know about, not a silent
      hole in their draft. */
  omitted: number
}

const QUOTE_OPEN = '“'
const QUOTE_CLOSE = '”'

function place(e: Entry) {
  if (e.page && e.chapter) return ` (${e.chapter}, p. ${e.page})`
  if (e.page) return ` (p. ${e.page})`
  if (e.chapter) return ` (${e.chapter})`
  return ''
}

export function fairCopy(
  book: Book,
  keeps: Entry[],
  strands: Strand[],
): FairCopy {
  const parts: string[] = []

  /* Opening: only the facts on the shelf. */
  const verb = formatsOf(book).includes('audio') && formatsOf(book).length === 1
    ? 'listened to'
    : 'read'
  let opening = `I ${verb} ${book.title} by ${book.author}`
  if (book.startedOn && book.finishedOn) {
    const days = Math.max(1, daysBetween(book.startedOn, book.finishedOn))
    opening += days === 1 ? ' in a single day' : ` over ${days} days`
    opening += `, finishing on ${dayPhrase(book.finishedOn)}`
  } else if (book.finishedOn) {
    opening += `, finishing on ${dayPhrase(book.finishedOn)}`
  } else if (book.startedOn) {
    opening += `, starting on ${dayPhrase(book.startedOn)}`
  }
  parts.push(`${opening}.`)

  /* The reader's own prose, in the order it was written. Notes and strand
     reflections are already sentences, so they go in untouched. */
  const said = keeps
    .filter((e) => (e.type === 'note' || e.type === 'strand') && e.text?.trim())
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((e) => e.text!.trim())
  if (said.length) parts.push(said.join('\n\n'))

  /* Then what they marked in the book, in book order where a page says so. */
  const lifted = keeps
    .filter((e) => (e.type === 'quote' || e.type === 'highlight') && e.text?.trim())
    .sort((a, b) => (a.page ?? 1e9) - (b.page ?? 1e9) || a.createdAt - b.createdAt)
  if (lifted.length) {
    parts.push(
      lifted.length === 1 ? 'A line I kept:' : 'Some lines I kept:',
    )
    parts.push(
      lifted
        .map((e) => `${QUOTE_OPEN}${e.text!.trim()}${QUOTE_CLOSE}${place(e)}`)
        .join('\n\n'),
    )
  }

  /* Strands, named — the shape of the reader's attention, in their words. */
  const closed = strands.filter((s) => s.closedAt)
  if (closed.length) {
    parts.push(
      `I spent the book following ${closed.map((s) => s.name).join(', ')}.`,
    )
  }

  const omitted = keeps.filter((e) => e.type === 'voice' || e.type === 'image').length
  const text = parts.join('\n\n')
  return { text, words: countWords(text), omitted }
}

export function countWords(text: string) {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}
