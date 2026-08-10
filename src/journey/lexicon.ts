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

/** What a journey is made of, in the app's own two words: "8 whispers · 4 in
    ink". The line under a book's title on its journey page.

    THIS IS WHERE WHISPERS AND INK BECOME REAL. The pair was defined in
    kinds.ts and then printed in exactly two places: the empty state, which by
    definition only a reader with nothing sees, and one faint italic on a
    keep's meta line that hides itself whenever every keep is the same
    substance — so a reader whose journey is all quotes never met the words at
    all. Everywhere else the count said "12 keeps", which is a number and not
    an idea. A private vocabulary nobody is taught is not a voice, it is an
    in-joke with yourself.

    The header is the right place for it because it is the one line every
    reader passes on the way into every book, and because it is where the
    distinction is actually useful: how much of this came out of the book, and
    how much you put down yourself.

    DIGITS, NOT WORDS, unlike the prose surfaces — see the note on `spell`.
    It is a data line, and data lines take figures.

    "in ink" rather than "ink" because ink is a mass noun and "4 ink" is not
    English. Each side disappears at zero rather than printing "0 whispers",
    which is a fact nobody asked for — and an empty journey returns nothing at
    all rather than "nothing kept yet", because the page below is already an
    empty state saying exactly that, at length, with something to do about it. */
export function tally(keeps: Entry[]) {
  let whispers = 0
  for (const keep of keeps) if (KIND[keep.type].side === 'whisper') whispers += 1
  const ink = keeps.length - whispers

  const parts: string[] = []
  if (whispers > 0) parts.push(`${whispers} ${whispers === 1 ? 'whisper' : 'whispers'}`)
  if (ink > 0) parts.push(`${ink} in ink`)
  return parts.join(' · ')
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

   TWO RULES, and the first draft of these pools broke both.

   ONE: never state a fact about a book Flyleaf has not seen. The old set said
   there was a pencil mark in the margin, that the edges were deckled, that the
   screen read four hours, that the first chapter belonged to a street you were
   walking down. Each of those is a small confident lie roughly three-quarters
   of the time, and being told something untrue about your own morning is worse
   than being told nothing — it is the moment a reader stops believing the rest
   of the page. What is left is only what is true of every copy of that format:
   paper weighs something, a screen does not, a recording plays while your hands
   are busy. Feeling is allowed. Detail is not.

   TWO: vary the register, not just the words. The old set was wry the whole way
   through, so a reader with ten books got the same joke ten times in ten
   costumes. These run plain, warm, quiet and dry in roughly equal measure, and
   only one line per pool is allowed to be funny.

   Six per pool, and the number matters: `pick` separates the opening from the
   closing by exactly 14, so a pool of 7 or 14 would hand both ends the same
   index. Six never does. */

const OPENED_ON: Record<string, string[]> = {
  physical: [
    'Cracked the spine on',
    'Opened the paper copy on',
    'Turned the first page on',
    'Started it in print on',
    'First opened it on',
    'Began the paper copy on',
  ],
  digital: [
    'Opened it on the screen on',
    'Loaded it up on',
    'Woke the screen for it on',
    'Started it, backlit, on',
    'Opened the file on',
    'Started the ebook on',
  ],
  audio: [
    'Pressed play on',
    'Put it in your ears on',
    'Started listening on',
    'Let the narrator begin on',
    'Queued it up on',
    'Started the recording on',
  ],
  none: [
    'Began on',
    'Started this one on',
    'Opened it on',
    'Set out on',
    'Picked this one up on',
    'Started reading on',
  ],
}

const THE_MOMENT: Record<string, string[]> = {
  physical: [
    'The paper smells like somebody else’s house.',
    'A weight in the hand, which is most of the argument for paper.',
    'You can tell how much is left just by holding it.',
    'Nothing to charge, nothing to update, nothing in the way.',
    'Somewhere in here is a line you will want to copy out.',
    'A bookmark to find, eventually. For now, page one.',
  ],
  digital: [
    'Weightless, which still feels like cheating.',
    'No dust, no bookmark, no excuse.',
    'The whole thing in one hand, weighing nothing at all.',
    'It will keep your place. Keeping the good parts is yours.',
    'Set the size, set the brightness, begin.',
    'Backlit, so the hour hardly matters.',
  ],
  audio: [
    'Headphones in, world out.',
    'Someone else’s voice, and your own hours.',
    'It goes where you go, which is the point of it.',
    'A book you can start with your hands full.',
    'The narrator sets the pace now. Mostly.',
    'Listening is reading. This is not up for debate.',
  ],
  both: [
    'Paper at home, a voice on the way there — the same book, twice over.',
    'Two ways in at once, which is greedy and entirely allowed.',
    'Print when you can sit down, a voice when you cannot.',
    'Whichever hand is free, the book carries on.',
    'Read it, hear it, lose no time either way.',
    'One book, two doors.',
  ],
  none: [
    'No ceremony. Just the first sentence.',
    'A clean first page and no idea what is coming.',
    'Nothing marked yet. Everything still possible.',
    'This is the blank flyleaf. The rest is yours.',
    'Day one, and nothing written down yet.',
    'You will know by page fifty. You always do.',
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

  /* No nudge under the inscription when the thread is empty. It used to carry
     one — "a line worth copying out, a thought, thirty seconds of your own
     voice" — and it was the second of three things on that screen all saying
     nothing is here yet, above the dashed leaf that says it properly and the
     tail marker that said the opposite. The leaf is the empty state; the
     inscription is the day the book was opened, and that is all it is. */
  return { line, on }
}

/* ── The finis ────────────────────────────────────────────────────────────

   The mirror of the epigraph, and the pair is the point: a thread that is tied
   on at one end and simply stops at the other has no ending, only a last item.
   So the closing gets the same three parts the opening has — a pennant, a
   dated meta line, an inscription of two sentences — drawn from pools built
   the same way and picked with the same seed, so one book always closes the
   same way it always opened.

   IT IS A MARK, NOT A LOCK. Nothing about a finished book is read-only: the
   reader can still write in it, edit what is there, and change the date that
   put this here. The second sentence in the `none` pool says so out loud, and
   the note under the colophon says it in plain words on every closing. That is
   the owner's own framing — "they can still edit things and add more things at
   a later date too" — and it is the whole difference between an ending and a
   deadline. */

/* Revised alongside the opening pools, under the same two rules. The old
   closings guessed as freely as the old openings did — a crease at one corner
   you will remember, a fortnight it took, a street it ended on — and a book
   Flyleaf never opened cannot have creases. Six per pool here too. */

const CLOSED_ON: Record<string, string[]> = {
  physical: [
    'Shut it for the last time on',
    'Closed the back board on',
    'Turned the final page on',
    'Set it back on the shelf on',
    'Read the last page on',
    'Finished the paper copy on',
  ],
  digital: [
    'Reached the last screen on',
    'Watched the bar run out on',
    'Closed the file for good on',
    'Swiped the final page away on',
    'Reached the end of the file on',
    'Finished the ebook on',
  ],
  audio: [
    'Heard the narrator sign off on',
    'Let the last track run out on',
    'Took the headphones out on',
    'Reached the end of the recording on',
    'Heard the last of it on',
    'Finished listening on',
  ],
  none: [
    'Finished it on',
    'Came to the end on',
    'Closed this one on',
    'Ended it on',
    'Read the last of it on',
    'Got to the end on',
  ],
}

const THE_END: Record<string, string[]> = {
  physical: [
    'The spine is broken in now, in the good way.',
    'It goes back on the shelf heavier than it came off.',
    'It smells of wherever you read it.',
    'Paper and ink, and it got where it was going.',
    'Somebody will find it on that shelf one day and wonder.',
    'Read once, and kept here for good.',
  ],
  digital: [
    'No spine to crack, and it still took as long as it took.',
    'The device has already forgotten. You have not.',
    'Nothing to shelve, so it is shelved here.',
    'The screen went dark and stayed dark.',
    'It leaves no crease. That is what this page is for.',
    'Closed, and nothing to put away.',
  ],
  audio: [
    'The room is very quiet now.',
    'You will hear that voice for a few days yet.',
    'Someone read you the whole of it, and now they have stopped.',
    'Headphones out. Everything sounds a little different.',
    'The last of it played out, and that was that.',
    'Nothing left in the queue.',
  ],
  both: [
    'Paper and voice, both run out, one book.',
    'Two ways through it, and both of them ended.',
    'Heard the half of it and read the rest. It counts.',
    'Whichever way you came at it, you got to the end.',
    'Print and voice, finished together.',
    'Two doors, one ending.',
  ],
  none: [
    'That is the whole of it.',
    'Finished — and still yours to write in.',
    'The end of the reading, not the end of the page.',
    'Done, and nothing here is closed to you.',
    'That is the last of it. The margins stay open.',
    'Read. What you make of it is still being written.',
  ],
}

export interface Finis {
  /** The inscription itself, two short sentences. */
  line: string
  /** The day the reader closed it. */
  on: string
}

/** Only ever called for a book with `finishedOn` set — the caller renders
    nothing at all otherwise, because a book still being read has no ending to
    describe and inventing one would be the app deciding the reader was done.

    Salted 3 and 4 rather than 1 and 2 so the closing never lands on the same
    index of its pool as the opening did. Same seed, different sentence. */
export function finis(book: Book, on: string): Finis {
  const formats = formatsOf(book)
  const voice = formats.length > 1 ? 'both' : (formats[0] ?? 'none')
  const closer = CLOSED_ON[voice === 'both' ? 'physical' : voice] ?? CLOSED_ON.none
  const after = THE_END[voice] ?? THE_END.none

  return {
    on,
    line: `${pick(closer, book.id, 3)} ${dayPhrase(on)}. ${pick(after, book.id, 4)}`,
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

  /* How long it is, not how far in — the "how far in" number was never
     written by anything in the app. See routes/Library.tsx. */
  if (book.pages) lines.push({ term: 'Length', detail: `${book.pages} pages` })

  return lines
}

/* What the closing seal prints under its inscription: the SHAPE of a reading,
   not its contents.

   Two cuts from the full colophon, each for its own reason. Opened and Closed
   go because the two seals already print those dates in words, inches apart —
   a date repeated on the same screen reads as a bug, not as emphasis. And the
   named things go (Followed, Been to, Wondered about) because every one of
   those names is already written out above, on the keep the reader made it on;
   listing them again at the foot of the page they are standing on is an index
   for a page you can see. The keepsake still carries the whole colophon,
   because a picture leaves the page and has to stand alone. This does not. */
const TAIL = new Set(['Over', 'Read as', 'Kept'])

export function colophonTail(book: Book, keeps: Entry[]): ColophonLine[] {
  return colophon(book, keeps).filter((line) => TAIL.has(line.term))
}

/* ── The fair copy ────────────────────────────────────────────────────────

   A REVIEW, not a transcript.

   This used to be a collation: the notes in the order they were written, then
   every quote under a heading, then the people under another, then the places,
   then the threads. That is a printout of the journey the reader has just
   scrolled past, and it is not what the button says. The owner's words for
   what a review actually is: "solid paragraphs that explain how the user felt
   while reading a book" — so this infers, and writes paragraphs.

   FOUR THINGS CAN HONESTLY BE INFERRED from a journey, and nothing else can:

     THE SHAPE    How long it took, and how often the reader stopped to write
                  something down. Thirty keeps in eight days and two keeps in
                  three months are different readings, and the difference is
                  arithmetic rather than opinion.
     THE PULL     Which KIND of keep dominates. A journey that is mostly
                  characters was a book read for its people; mostly quotes, for
                  its language; mostly threads, for what was coming next.
     THE FEELING  A shallow count of plainly evaluative words in the reader's
                  OWN writing. See FELT below, including what was cut from it.
     THE ARC      A plot thread that hardened from hunch to certain is a real
                  story about a reading, and it is already in the data.

   All four come from dates, counts, types and stances. Not one of them is a
   claim about what happens in the book, because Flyleaf still has not read it.

   The substance is still the reader's own sentences, verbatim, never re-cased
   and never paraphrased. What changed is that they now sit INSIDE paragraphs
   that say what they are doing there, instead of under a heading that leaves
   the reader to do the writing they pressed a button to avoid.

   And what has not changed is the reason the feature can exist at all: no
   model runs, nothing leaves the device, and the same journey drafts the same
   review on a plane as it does at a desk. */

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

/* FELT — words a reader uses about a book, never words a book uses about
   itself.

   The whole of the feeling inference, and it is deliberately shallow. It reads
   only the reader's own writing; the quotes are somebody else's sentences and
   would wreck the count the first time a novel had a miserable narrator.

   EVERY AMBIGUOUS WORD WAS CUT, and always for the same reason: `wept`, `cried`
   and `laughed` nearly always describe a character, `flat`, `thin` and `dark`
   nearly always describe a plot, and `hated` is usually one person in the story
   hating another. Telling a reader they loved a book they did not is a worse
   failure than saying nothing about feeling at all — so what is left is only
   words that appear when somebody is grading. */
const FELT = {
  warm: [
    'love', 'loved', 'loving', 'adored', 'beautiful', 'beautifully', 'brilliant',
    'wonderful', 'gorgeous', 'stunning', 'favourite', 'favorite', 'perfect',
    'exquisite', 'superb', 'incredible', 'glorious', 'delightful', 'masterful',
    'gripping', 'gripped', 'hooked', 'obsessed', 'unputdownable', 'devastating',
    'heartbreaking', 'moving', 'luminous', 'astonishing', 'magnificent',
  ],
  cool: [
    'boring', 'bored', 'dull', 'slog', 'tedious', 'tiresome', 'dragged',
    'disappointing', 'disappointed', 'annoying', 'irritating', 'frustrating',
    'contrived', 'clumsy', 'clunky', 'predictable', 'overwrought', 'overwritten',
    'unconvincing', 'implausible', 'skimmed', 'meh', 'pointless', 'repetitive',
    'laboured', 'labored', 'exhausting', 'forgettable',
  ],
}

/* "not boring" is not a complaint. A one-word lookbehind catches the common
   English negations and is the right depth for something this shallow —
   anything cleverer would be a parser, and a parser would be a promise this
   feature cannot keep. */
const NOT = new Set([
  'not', 'never', 'no', 'nor', 'hardly', 'barely', 'without', 'nothing',
  'isnt', 'wasnt', 'arent', 'werent', 'didnt', 'dont', 'doesnt', 'wouldnt',
  'couldnt', 'shouldnt', 'cant', 'wont', 'hadnt', 'hasnt', 'havent',
])

function feeling(texts: string[]) {
  let warm = 0
  let cool = 0
  for (const text of texts) {
    const words = text.toLowerCase().replace(/['’]/g, '').split(/[^a-z]+/).filter(Boolean)
    for (let i = 0; i < words.length; i += 1) {
      if (i > 0 && NOT.has(words[i - 1])) continue
      if (FELT.warm.includes(words[i])) warm += 1
      else if (FELT.cool.includes(words[i])) cool += 1
    }
  }
  return { warm, cool }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** The reader's words as a sentence: trimmed, whitespace collapsed, closed
    with a full stop if they did not close it themselves. Never re-cased and
    never re-worded — a line goes in exactly as it was typed, which is why
    their sentences always START one here rather than being spliced into the
    middle of ours where the grammar would have to be guessed at. */
function asSentence(text: string) {
  const t = text.trim().replace(/\s+/g, ' ')
  if (!t) return ''
  return /[.!?…”"')\]]$/.test(t) ? t : `${t}.`
}

/** "a", "a and b", "a, b and c", and past three "a, b and two others".

    The remainder eats the third name rather than following it. Four characters
    used to come out as "Marguerite, Oren and the harbourmaster and one other",
    which puts two ands in one clause and reads like a sentence that changed its
    mind halfway. Two names then the count is the ordinary English of it. */
function listOf(all: string[]) {
  const full = all.length <= 3
  const shown = all.slice(0, full ? 3 : 2)
  const rest = all.length - shown.length
  let phrase = shown[0] ?? ''
  if (shown.length === 2) phrase = `${shown[0]} and ${shown[1]}`
  if (shown.length === 3) phrase = `${shown[0]}, ${shown[1]} and ${shown[2]}`
  if (rest > 0) phrase = `${shown[0]}, ${shown[1]} and ${count(rest, { one: 'other', many: 'others' })}`
  return phrase
}

export function fairCopy(book: Book, keeps: Entry[]): FairCopy {
  const omitted = keeps.filter(
    (e) => e.type === 'voice' || (e.type === 'image' && !e.text?.trim()),
  ).length

  /* Only keeps with words in them. A journey of eight recordings has nothing
     to draft from, and the sheet's own empty state says so better than four
     paragraphs of dates would. */
  const written = keeps
    .filter((e) => e.text?.trim() || e.name?.trim())
    .sort((a, b) => a.createdAt - b.createdAt)
  if (!written.length) return { text: '', words: 0, omitted }

  const of = (type: EntryType) => written.filter((e) => e.type === type)
  const spent = new Set<number>()

  const spend = (e: Entry | undefined) => {
    if (!e) return ''
    spent.add(e.id)
    return asSentence(e.text?.trim() ?? '')
  }

  const paragraphs: string[] = []
  const say = (...lines: string[]) => {
    const kept = lines.filter(Boolean)
    if (kept.length) paragraphs.push(kept.join(' '))
  }

  /* ── 1. Opening & Reading Context ───────────────────────────────────── */
  const formats = formatsOf(book)
  const verb = formats.length === 1 && formats[0] === 'audio' ? 'listened to' : 'read'
  let opening = `I ${verb} ${book.title}${book.author ? ` by ${book.author}` : ''}`
  let days = 0
  if (book.startedOn && book.finishedOn) {
    days = Math.max(1, daysBetween(book.startedOn, book.finishedOn))
    opening += days === 1 ? ' in a single day' : ` over ${days} days`
    opening += `, finishing on ${dayPhrase(book.finishedOn)}`
  } else if (book.finishedOn) {
    opening += `, finishing on ${dayPhrase(book.finishedOn)}`
  } else if (book.startedOn) {
    opening += `, starting on ${dayPhrase(book.startedOn)}`
  }

  const marks = written.length
  const pace =
    days > 1 && marks / days >= 1.5
      ? 'That is not a book I was getting through. That is one I was living in.'
      : days >= 14 && marks / days <= 0.15
        ? 'Spread thinly across all those weeks, which says something about the pace I read it at.'
        : ''

  say(
    `${opening}.`,
    marks === 1
      ? 'One thing in it was worth stopping for, and I wrote it down.'
      : marks === 2
        ? 'Twice I stopped to write something down.'
        : marks < WORDS.length
          ? `${cap(count(marks, { one: 'time', many: 'times' }))} I stopped to write something down.`
          : `I stopped to write something down ${marks} times.`,
    pace,
  )

  /* ── 2. Emotional Arc & Overall Impression ───────────────────────────── */
  const mood = feeling(
    written.filter((e) => e.type !== 'quote').map((e) => `${e.name ?? ''} ${e.text ?? ''}`),
  )
  let verdict =
    mood.warm >= 2 && mood.warm > mood.cool * 2
      ? 'Reading my own notes back, they are warm nearly the whole way through.'
      : mood.cool >= 2 && mood.cool > mood.warm * 2
        ? 'Reading my own notes back, there are more complaints in them than compliments, and that is its own kind of verdict.'
        : mood.warm >= 1 && mood.cool >= 1
          ? 'My notes run hot and cold in about equal measure, which is usually the mark of a book worth arguing with.'
          : ''

  const notesList = [...of('note'), ...of('thread'), ...of('character')]
  const unspentNotes = notesList.filter((e) => !spent.has(e.id) && e.text?.trim())

  if (!verdict && unspentNotes.length) {
    verdict = 'Reflecting on my reading notes throughout the book, here is the impression it left on me:'
  }

  const firstNote = unspentNotes[0]
  say(verdict, spend(firstNote))

  /* ── 3. Characters, Setting & Key Focus ─────────────────────────────── */
  const chars = of('character').map((e) => e.name?.trim()).filter(Boolean) as string[]
  const places = of('place').map((e) => e.name?.trim()).filter(Boolean) as string[]
  const threads = of('thread').map((e) => e.name?.trim()).filter(Boolean) as string[]

  const charNames = [...new Set(chars)]
  const placeNames = [...new Set(places)]
  const threadNames = [...new Set(threads)]

  if (charNames.length || placeNames.length || threadNames.length) {
    const focusParts: string[] = []
    if (charNames.length) focusParts.push(`I kept coming back to ${listOf(charNames)}`)
    if (placeNames.length) focusParts.push(`${placeNames.length === 1 ? 'the setting that stayed with me was' : 'the settings that stayed with me were'} ${listOf(placeNames)}`)
    if (threadNames.length) focusParts.push(`the main plot threads I circled were ${listOf(threadNames)}`)

    const leadNote = unspentNotes.find((e) => !spent.has(e.id) && e.text?.trim())
    say(`${cap(focusParts.join('; '))}.`, spend(leadNote))
  }

  /* ── 4. Key Quotes / Standout Lines ──────────────────────────────────── */
  const quotes = of('quote').filter((e) => !spent.has(e.id) && e.text?.trim())
  if (quotes.length) {
    const sized = [...quotes].sort((a, b) => (b.text?.length ?? 0) - (a.text?.length ?? 0))
    const best = sized.find((e) => (e.text?.trim().length ?? 0) <= 240) ?? sized[0]
    spent.add(best.id)
    const body = best.text!.trim().replace(/^[“"']+/, '').replace(/[”"']+$/, '')
    const where = best.page ? ` (page ${best.page})` : best.chapter ? ` (${best.chapter})` : ''
    say(
      quotes.length === 1
        ? `There is one line I copied out word for word${where}:`
        : `Of the ${quotes.length} lines I copied out word for word, this is the one that captured the book's essence${where}:`,
      `${QUOTE_OPEN}${body}${QUOTE_CLOSE}`,
    )
  }

  /* ── 5. Unspent Reader Notes / Reactions ─────────────────────────────── */
  const remaining = written.filter((e) => !spent.has(e.id) && e.text?.trim())
  if (remaining.length) {
    const extraSentences = remaining.slice(0, 2).map((e) => spend(e)).filter(Boolean)
    if (extraSentences.length) {
      say('Other thoughts I noted along the way:', ...extraSentences)
    }
  }

  /* ── 6. Conclusion & Verdict ─────────────────────────────────────────── */
  const threadList = of('thread')
  const settled = threadList.filter((e) => e.stance === 'certain').length
  say(
    settled
      ? 'Some of what I only suspected early on I was sure of by the end.'
      : threadList.length >= 2
        ? 'I never did settle most of what I kept circling.'
        : '',
    book.finishedOn
      ? ''
      : 'I am not finished with it yet, so take this as a report from partway through.',
  )

  const text = paragraphs.join('\n\n')
  return { text, words: countWords(text), omitted }
}

export function countWords(text: string) {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}
