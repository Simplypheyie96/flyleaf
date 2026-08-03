/* Flyleaf's own words.

   Four of them, and they are all borrowed from bookbinding and printing rather
   than from software, because this app is about books and "entries", "tags"
   and "AI summary" are about databases. A reader who has never seen the words
   before should be able to work out every one of them from where it sits on
   the screen — that is the test each one had to pass:

     Keep       one thing taken out of a book and held on to
     Epigraph   the inscription at the head of the journey, written the day
                the book was opened
     Colophon   the closing facts of the reading, set as a keepsake
     Fair Copy  a clean draft of a review, assembled from what you wrote

   The rule that stops this being cute: destructive and legal wording stays
   plain. "Delete" is never "unbind". A reader about to lose something must
   read the sentence in the language they would use to describe the loss.

   The second rule, which matters more: nothing in this file may say anything
   about what is *inside* a book. Every clause below is assembled from a date,
   a count, a format or the reader's own text. Flyleaf does not know what
   happens in the story and must never sound as though it does. */

import type { Book, Entry, EntryType } from '../data/db'
import { formatsOf } from '../data/db'
import { fromISO, longDate, todayISO } from '../components/date/dates'
import { KIND, KINDS } from './kinds'

/** The words for a kind. One source of truth, in `kinds.ts`; this alias is
    kept because "KEEP.quote.many" reads better in a sentence than the config
    object does. */
export const KEEP = KIND

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

   The first notch on the thread, and the only one Flyleaf writes itself: a
   short inscription about the day the book was opened.

   Two things make it feel like a person wrote it. It knows *how* the reader is
   reading — a cracked spine, a screen at one bar, a narrator in your ears are
   three different mornings — and it is different from book to book, because a
   line you have read four times is wallpaper. Both come cheap: the format is
   already on the shelf, and the variation is a number derived from the book's
   own id, which means the same book keeps the same opening for ever instead of
   reshuffling itself every render.

   Every clause is about the reader's own act of opening a book. None of them
   is about the story, and none of them can be, because Flyleaf has not read
   it and would only be guessing in a confident voice. */

const OPENED_ON: Record<string, string[]> = {
  physical: [
    'Cracked the spine on',
    'Opened the paper copy on',
    'Turned the first page on',
    'Broke it open on',
  ],
  digital: [
    'Opened it on the screen on',
    'Loaded it up on',
    'Woke the screen for it on',
    'Started it, backlit, on',
  ],
  audio: [
    'Pressed play on',
    'Put it in your ears on',
    'Started listening on',
    'Let the narrator begin on',
  ],
  none: ['Began on', 'Started this one on', 'Opened it on', 'Set out on'],
}

const THE_MOMENT: Record<string, string[]> = {
  physical: [
    'The paper smells like somebody else’s house.',
    'It refuses to lie flat, and that is half the pleasure.',
    'Somebody has been here before you — there is a pencil mark in the margin.',
    'Deckled edges. Absolutely unnecessary. Absolutely correct.',
  ],
  digital: [
    'Brightness down to one bar, like a proper night reader.',
    'The screen says four hours left. The screen is an optimist.',
    'No dust, no bookmark, no excuse.',
    'Weightless, which feels like cheating.',
  ],
  audio: [
    'Headphones in, world out.',
    'The narrator has a voice you could fall asleep in. That is the risk.',
    'Started it walking, so the first chapter belongs to a particular street.',
    'Playing at a speed you will not admit to.',
  ],
  both: [
    'Paper at home, voice on the way there — the same book, twice over.',
    'Two ways in at once, which is greedy and entirely allowed.',
  ],
  none: [
    'No ceremony. Just the first sentence.',
    'A clean first page and no idea what is coming.',
    'Nothing marked yet. Everything still possible.',
  ],
}

/* Deterministic, not random: the same book must open the same way every time
   the page is drawn. Mixing the id with the pool length only — no clock, no
   counter — is what guarantees it. */
function pick(pool: string[], seed: number, salt: number) {
  const n = Math.abs(Math.round(seed) * 31 + salt * 7)
  return pool[n % pool.length]
}

export interface Epigraph {
  /** The inscription itself, two short sentences. */
  line: string
  /** The day it is dated — the start date if the reader gave one, otherwise
      the day of their earliest keep. Absent means the book has no beginning
      recorded yet, and the journey asks for one. */
  on?: string
  /** Only when there is nothing kept yet: the nudge under the empty thread. */
  hint?: string
}

export function epigraph(book: Book, keeps: Entry[]): Epigraph {
  const formats = formatsOf(book)
  /* Two formats is its own mood, so it gets its own pool rather than one of
     the single-format pools chosen arbitrarily. */
  const voice = formats.length > 1 ? 'both' : (formats[0] ?? 'none')
  const opener = OPENED_ON[voice === 'both' ? 'physical' : voice] ?? OPENED_ON.none
  const moment = THE_MOMENT[voice] ?? THE_MOMENT.none

  const earliest = keeps.length
    ? keeps.reduce((a, e) => (e.keptOn < a ? e.keptOn : a), keeps[0].keptOn)
    : undefined
  const on = book.startedOn ?? earliest

  const first = on
    ? `${pick(opener, book.id, 1)} ${dayPhrase(on)}.`
    : 'The beginning of this one is not written down yet.'

  const line = `${first} ${pick(moment, book.id, 2)}`

  return {
    line,
    on,
    ...(keeps.length
      ? {}
      : {
          hint: 'A line worth copying out, a thought, thirty seconds of your own voice — whatever you would want back.',
        }),
  }
}

/* ── The colophon ─────────────────────────────────────────────────────────

   The block at the foot of a journey, and the thing the reader shares: the
   plain facts of one reading, set the way a printer sets them at the end of a
   book. Small enough to be a card, complete enough to stand alone.

   Deliberately not a dashboard — no charts, no streaks, no percentages the
   reader never asked for. */

export interface ColophonLine {
  term: string
  detail: string
}

export function colophon(book: Book, keeps: Entry[]): ColophonLine[] {
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

  if (keeps.length) {
    const tally = new Map<EntryType, number>()
    for (const e of keeps) tally.set(e.type, (tally.get(e.type) ?? 0) + 1)
    lines.push({
      term: 'Kept',
      /* In the registry's order rather than by size, so two books' colophons
         list the same kinds in the same places and can be read side by side. */
      detail: KINDS.filter((t) => tally.has(t))
        .map((t) => {
          const n = tally.get(t)!
          return `${n} ${n === 1 ? KIND[t].one : KIND[t].many}`
        })
        .join(', '),
    })
  }

  const named = (type: EntryType) => [
    ...new Set(keeps.filter((e) => e.type === type && e.name).map((e) => e.name!)),
  ]

  const people = named('character')
  if (people.length) lines.push({ term: 'Followed', detail: people.join(', ') })

  const places = named('place')
  if (places.length) lines.push({ term: 'Been to', detail: places.join(', ') })

  const threads = named('thread')
  if (threads.length) lines.push({ term: 'Wondered about', detail: threads.join(', ') })

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
  /** Keeps that cannot be written out — recordings, and pictures with no
      caption. Surfaced in the sheet so the omission is the reader's to know
      about, not a silent hole in their draft. */
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

/** A keep's own words, with its title in front where it has one. */
function said(e: Entry) {
  const body = e.text?.trim() ?? ''
  if (e.name && body) return `${e.name.trim()} — ${body}`
  return e.name?.trim() || body
}

export function fairCopy(book: Book, keeps: Entry[]): FairCopy {
  const parts: string[] = []
  const byTime = (a: Entry, b: Entry) => a.createdAt - b.createdAt

  /* Opening: only the facts on the shelf. */
  const formats = formatsOf(book)
  const verb = formats.length === 1 && formats[0] === 'audio' ? 'listened to' : 'read'
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

  /* The reader's own prose, in the order it was written. Notes are already
     sentences, so they go in untouched. */
  const prose = keeps
    .filter((e) => e.type === 'note' && e.text?.trim())
    .sort(byTime)
    .map((e) => e.text!.trim())
  if (prose.length) parts.push(prose.join('\n\n'))

  /* Then what they marked in the book, in book order where a page says so. */
  const lifted = keeps
    .filter((e) => e.type === 'quote' && e.text?.trim())
    .sort((a, b) => (a.page ?? 1e9) - (b.page ?? 1e9) || a.createdAt - b.createdAt)
  if (lifted.length) {
    parts.push(lifted.length === 1 ? 'A line I kept:' : 'Some lines I kept:')
    parts.push(
      lifted.map((e) => `${QUOTE_OPEN}${e.text!.trim()}${QUOTE_CLOSE}${place(e)}`).join('\n\n'),
    )
  }

  /* The people, the places and the suspicions — the shape of the reader's
     attention, again in their words and never in ours. A heading only when
     there is something under it. */
  const section = (type: EntryType, heading: string) => {
    const rows = keeps.filter((e) => e.type === type && (e.name || e.text?.trim()))
    if (!rows.length) return
    parts.push(heading)
    parts.push(rows.sort(byTime).map(said).join('\n\n'))
  }
  section('character', 'The people I stayed with:')
  section('place', 'Where it took me:')
  section('thread', 'What I kept turning over:')

  const omitted = keeps.filter(
    (e) => e.type === 'voice' || (e.type === 'image' && !e.text?.trim()),
  ).length
  const text = parts.join('\n\n')
  return { text, words: countWords(text), omitted }
}

export function countWords(text: string) {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}
