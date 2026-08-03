/* The keepsake — a reading, drawn as a picture you can send.

   Everything here is drawn on a canvas in the browser, from the reader's own
   keeps, with no network and no key behind it. That is not a limitation worked
   around; it is the reason this exists at all. A share that costs a request per
   tap is a share that eventually stops working, and the archive has to outlive
   whatever this app's bill looks like next year.

   Two axes, because one picture is a template and twelve is a choice: the
   SHAPE decides what the reading is reduced to, and the PALETTE decides what
   it is set in and on. They are independent on purpose — a reader who wants
   the tally on night blue should not have to accept somebody else's idea of
   which of those go together.

   There was a third, GRAIN, and it was the one axis nobody needed: three
   answers to "what paper", of which one was a novelty (ruled), one was the
   absence of another (plain), and only the speckle did any work. The speckle
   is not a choice now, it is what paper is — every palette carries it.

   Nothing in here says "Flyleaf". A keepsake with an app's name across the
   foot is an advertisement wearing the reader's reading as a costume, and
   share.ts already made that promise for the plain-text side. */

import type { Book, Entry } from '../data/db'
import { KIND, KINDS } from './kinds'
import { colophon } from './lexicon'

/* ── The two axes ──────────────────────────────────────────────────────── */

export type Shape = 'colophon' | 'line' | 'tally'

export const SHAPES: { id: Shape; label: string; hint: string }[] = [
  { id: 'colophon', label: 'The colophon', hint: 'the line you kept, and the whole reading under it' },
  { id: 'line', label: 'One line', hint: 'a single thing the book said, set large' },
  { id: 'tally', label: 'The tally', hint: 'what you kept, counted' },
]

export interface Palette {
  id: string
  label: string
  paper: string
  ink: string
  soft: string
  accent: string
}

/* Fixed sRGB rather than the app's live tokens. An exported picture has to look
   the same in a message thread as it did in the sheet, and a reader who picked
   a pale card at midnight must not be sent a dark one because their phone had
   turned the app over. */
export const PALETTES: Palette[] = [
  { id: 'flyleaf', label: 'Flyleaf', paper: '#f4f7fb', ink: '#161d29', soft: '#5c6674', accent: '#2f6f6a' },
  { id: 'dusk', label: 'Dusk', paper: '#1b2230', ink: '#eef1f6', soft: '#96a1b3', accent: '#e0b25f' },
  { id: 'bloom', label: 'Bloom', paper: '#fbf1ec', ink: '#38292a', soft: '#8b736d', accent: '#c1614e' },
  { id: 'fern', label: 'Fern', paper: '#eef3ec', ink: '#1e2c22', soft: '#5c6e5e', accent: '#3d7c53' },
]

export interface Look {
  shape: Shape
  palette: Palette
}

/* ── What there is to draw ─────────────────────────────────────────────── */

export interface Keepsake {
  title: string
  author: string
  /** The colophon's term/detail pairs, already assembled from the keeps. */
  lines: { term: string; detail: string }[]
  /** One thing the book said, if the reader kept one. */
  line: { text: string; where: string } | null
  /** Counts by kind, in the registry's order. */
  tally: { label: string; count: number }[]
  kept: number
}

export function keepsakeOf(book: Book, keeps: Entry[]): Keepsake {
  const counts = new Map<Entry['type'], number>()
  for (const e of keeps) counts.set(e.type, (counts.get(e.type) ?? 0) + 1)

  /* The longest quote rather than the first. A reader who kept six lines
     chose one of them because it was worth the length; the two-word one was
     kept for the page number. */
  const quotes = keeps.filter((e) => e.type === 'quote' && e.text?.trim())
  const pick =
    quotes.sort((a, b) => (b.text?.length ?? 0) - (a.text?.length ?? 0))[0] ??
    keeps.find((e) => e.type === 'note' && e.text?.trim())

  return {
    title: book.title,
    author: book.author,
    lines: colophon(book, keeps),
    line: pick
      ? {
          text: pick.text!.trim(),
          where: [pick.chapter, pick.page !== undefined ? `p. ${pick.page}` : null]
            .filter(Boolean)
            .join(', '),
        }
      : null,
    tally: KINDS.filter((t) => counts.has(t)).map((t) => ({
      label: counts.get(t)! === 1 ? KIND[t].one : KIND[t].many,
      count: counts.get(t)!,
    })),
    kept: keeps.length,
  }
}

/** A shape with nothing to put in it is not offered. */
export function shapeWorks(k: Keepsake, shape: Shape) {
  if (shape === 'line') return Boolean(k.line)
  if (shape === 'tally') return k.tally.length > 0
  return k.lines.length > 0
}

/* ── Drawing ───────────────────────────────────────────────────────────── */

/* 4:5. The one aspect every message app and every feed shows whole, so the
   reader never finds out at the far end that the last line was cropped off. */
export const W = 1080
export const H = 1350
const PAD = 96

/* The same two families the app is set in. These names have to match a face
   the page actually loaded: document.fonts.load() resolves with an empty list
   and no error when the family is unknown, so a wrong name here does not throw
   — it just draws the whole picture in the system fallback and says nothing.
   These read "Geist" until now, which is a face this app has never shipped. */
const SERIF = '"EB Garamond Variable", Georgia, serif'
const SANS = '"Source Sans 3 Variable", system-ui, sans-serif'

/** Canvas takes no font it has not been told to load, whatever the CSS did.
    Both families are variable, so every weight the picture draws has to be
    asked for by name: loading 400 does not bring 500 with it. */
export async function readyFonts() {
  await Promise.all([
    document.fonts.load(`500 96px ${SERIF}`),
    document.fonts.load(`italic 500 44px ${SERIF}`),
    document.fonts.load(`400 32px ${SANS}`),
    document.fonts.load(`600 22px ${SANS}`),
  ])
  await document.fonts.ready
}

/* The stamped labels — a term, an author, a page, never a sentence. On screen
   these are the sans in capitals with tracking on it, and the tracking is what
   makes them read as stamped rather than shouted; the canvas has to be told
   both. ctx.letterSpacing sticks to the context once set, so it is put back
   here rather than left for the next fillText to inherit it. */
function stamp(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  const was = ctx.letterSpacing
  ctx.font = `600 22px ${SANS}`
  ctx.letterSpacing = '2.6px'
  ctx.fillText(text, x, y)
  ctx.letterSpacing = was
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const out: string[] = []
  for (const para of text.split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word
      if (line && ctx.measureText(next).width > max) {
        out.push(line)
        line = word
      } else {
        line = next
      }
    }
    out.push(line)
  }
  return out
}

/* A deterministic speckle. Math.random would give a different picture every
   repaint, and the preview the reader approved has to be the file they get. */
function scatter(seed: number) {
  let s = seed || 1
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function ground(ctx: CanvasRenderingContext2D, look: Look) {
  ctx.fillStyle = look.palette.paper
  ctx.fillRect(0, 0, W, H)

  /* The tooth. At 4.5% of the ink over about 1.4% of the plate it is not
     visible as dots at any size anyone will see this at — it just stops the
     paper reading as a flat fill, which is the whole of what a stock does. */
  const rand = scatter(9973)
  ctx.fillStyle = look.palette.ink
  ctx.globalAlpha = 0.045
  for (let i = 0; i < 5200; i++) {
    ctx.fillRect(rand() * W, rand() * H, 2, 2)
  }
  ctx.globalAlpha = 1

  /* The plate's edge. One hairline inside the bleed, which is what makes a
     picture read as a printed thing rather than as a screenshot. */
  ctx.strokeStyle = look.palette.soft
  ctx.globalAlpha = 0.35
  ctx.lineWidth = 2
  ctx.strokeRect(40.5, 40.5, W - 81, H - 81)
  ctx.globalAlpha = 1
}

/* The lowest baseline anything but the imprint may use. */
const FLOOR = H - PAD - 130

/** The book, at the foot of every shape. Attribution is not decoration. */
function foot(ctx: CanvasRenderingContext2D, k: Keepsake, look: Look) {
  const y = H - PAD - 8
  ctx.textAlign = 'left'
  ctx.fillStyle = look.palette.ink
  ctx.font = `500 40px ${SERIF}`
  const title = wrap(ctx, k.title, W - PAD * 2)[0]
  ctx.fillText(title, PAD, y - 34)

  ctx.fillStyle = look.palette.soft
  stamp(ctx, k.author.toUpperCase(), PAD, y)
}

/* The colophon's own floor. It ends in a single stamped author line rather
   than the two-line imprint the other shapes carry, so it can run further down
   the plate than they can before anything is crowded. */
const COLOPHON_FLOOR = H - PAD - 60

/* One fact's geometry, in one place. The term is stamped, the detail is set
   under it, and both the measuring pass and the drawing pass read these — a
   colophon whose epigraph was sized against a different set of facts than the
   one printed beneath it would run off the bottom of the plate. */
const TERM_STEP = 36
const DETAIL_STEP = 44
const FACT_GAP = 24

function factLines(ctx: CanvasRenderingContext2D, detail: string) {
  ctx.font = `400 36px ${SANS}`
  return wrap(ctx, detail, W - PAD * 2).slice(0, 2)
}

/** How tall the first `most` facts will set, given where they start. */
function factsHeight(ctx: CanvasRenderingContext2D, k: Keepsake, top: number, most: number) {
  let y = top
  for (const { detail } of k.lines.slice(0, most)) {
    const lines = factLines(ctx, detail)
    if (y + TERM_STEP + lines.length * DETAIL_STEP > COLOPHON_FLOOR) break
    y += TERM_STEP + lines.length * DETAIL_STEP + FACT_GAP
  }
  return y - top
}

/* The epigraph.

   A colophon of dates and counts and nothing else is a receipt, and nobody
   sends anybody a receipt. The line the reader kept goes in under the rule,
   where a title page puts one — set in the book's own voice, above a set of
   facts about reading it.

   It was written first to take only the slack the facts left over, which
   sounded principled and drew nothing: a reading with six facts on it, two of
   them running to a second line, leaves 44px. The priority is the other way
   round. The line is the one thing on this plate that came out of the book;
   the facts are a list of counts, and the last of them is "Wondered about",
   which is the one nobody will miss. So the epigraph is drawn, and the facts
   fill what is under it.

   What protects the facts is the reserve: the room handed here is measured
   against the first THREE facts already standing, so no line, however long,
   can reduce the reading to a quotation with a date under it. Three lines is
   the cap and 36px the floor, and below 150px of room there is no epigraph at
   all — two lines at 30px under a 76px title is not an epigraph, it is a
   caption nobody asked for.

   No citation either: the book is named directly above it, the author is
   stamped at the foot, and "One line" is the shape for when the sentence and
   its page are the whole point. */
/* 72, and it is measured rather than chosen: the gap between one fact's last
   line and the next fact's term is 68px, so anything at or under that made the
   quotation read as the first item in the list instead of the thing the list
   is under. Above it the rule sits 60px away, which keeps it grouped with the
   title where it belongs. */
const EPI_GAP = 72
const EPI_RESERVE = 3

function epigraph(
  ctx: CanvasRenderingContext2D,
  k: Keepsake,
  look: Look,
  top: number,
  room: number,
) {
  if (!k.line || room < 150) return 0

  const quoted = `“${k.line.text}”`
  const setAt = (px: number) => {
    ctx.font = `italic 500 ${px}px ${SERIF}`
    return wrap(ctx, quoted, W - PAD * 2)
  }

  let size = 44
  let lines = setAt(size)
  const fits = () => lines.length <= 3 && lines.length * size * 1.3 + EPI_GAP <= room
  while (!fits() && size > 36) {
    size -= 2
    lines = setAt(size)
  }

  /* Still too long at the smallest size it may take. Keep the lines the room
     honestly holds and end them in an ellipsis; below two, stop — one line of
     a four-line sentence is a fragment, not a quotation. */
  if (!fits()) {
    const keep = Math.min(3, Math.floor((room - EPI_GAP) / (size * 1.3)))
    if (keep < 2) return 0
    lines = lines.slice(0, keep)
    lines[keep - 1] = `${lines[keep - 1]}…”`
  }

  const step = size * 1.3
  let y = top + size
  ctx.fillStyle = look.palette.ink
  ctx.font = `italic 500 ${size}px ${SERIF}`
  for (const line of lines) {
    ctx.fillText(line, PAD, y)
    y += step
  }
  return lines.length * step + EPI_GAP
}

function drawColophon(ctx: CanvasRenderingContext2D, k: Keepsake, look: Look) {
  let y = PAD + 84

  ctx.textAlign = 'left'
  ctx.fillStyle = look.palette.soft
  stamp(ctx, 'A READING', PAD, y)
  y += 76

  ctx.fillStyle = look.palette.ink
  ctx.font = `500 76px ${SERIF}`
  for (const line of wrap(ctx, k.title, W - PAD * 2).slice(0, 3)) {
    ctx.fillText(line, PAD, y)
    y += 84
  }

  y += 12
  ctx.strokeStyle = look.palette.accent
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(PAD + 120, y)
  ctx.stroke()
  y += 60

  /* Measured against the reserve before anything under the rule is drawn: what
     the epigraph may take is whatever is left once the first three facts are
     standing. */
  y += epigraph(ctx, k, look, y, COLOPHON_FLOOR - y - factsHeight(ctx, k, y, EPI_RESERVE))

  /* Term above detail rather than beside it. A two-column set breaks the
     moment somebody's "Wondered about" runs to four names, and the whole card
     is built out of the reader's own strings.

     The last facts fall off the bottom rather than the plate growing to hold
     them — a colophon has eight or nine facts in it and the last of them is
     "Wondered about", which is the one nobody will miss. */
  for (const { term, detail } of k.lines) {
    const lines = factLines(ctx, detail)
    if (y + TERM_STEP + lines.length * DETAIL_STEP > COLOPHON_FLOOR) break

    ctx.fillStyle = look.palette.soft
    stamp(ctx, term.toUpperCase(), PAD, y)
    y += TERM_STEP

    ctx.fillStyle = look.palette.ink
    ctx.font = `400 36px ${SANS}`
    for (const line of lines) {
      ctx.fillText(line, PAD, y)
      y += DETAIL_STEP
    }
    y += FACT_GAP
  }

  ctx.fillStyle = look.palette.soft
  stamp(ctx, k.author.toUpperCase(), PAD, H - PAD - 8)
}

function drawLine(ctx: CanvasRenderingContext2D, k: Keepsake, look: Look) {
  if (!k.line) return

  /* Set as large as it can be and still fit the plate. A fixed size would
     either strand a six-word line in the middle of an empty card or push a
     long one off the bottom. */
  const room = H - PAD * 2 - 260
  let size = 88
  let lines: string[] = []
  for (; size >= 40; size -= 4) {
    ctx.font = `500 ${size}px ${SERIF}`
    lines = wrap(ctx, `“${k.line.text}”`, W - PAD * 2)
    if (lines.length * size * 1.24 <= room) break
  }

  const block = lines.length * size * 1.24
  let y = PAD + 120 + (room - block) / 2 + size

  ctx.textAlign = 'left'
  ctx.fillStyle = look.palette.ink
  ctx.font = `500 ${size}px ${SERIF}`
  for (const line of lines) {
    ctx.fillText(line, PAD, y)
    y += size * 1.24
  }

  if (k.line.where) {
    y += 24
    ctx.fillStyle = look.palette.accent
    stamp(ctx, k.line.where.toUpperCase(), PAD, y)
  }


  foot(ctx, k, look)
}

function drawTally(ctx: CanvasRenderingContext2D, k: Keepsake, look: Look) {
  let y = PAD + 84

  ctx.textAlign = 'left'
  ctx.fillStyle = look.palette.soft
  stamp(ctx, 'WHAT I KEPT', PAD, y)
  y += 100

  ctx.fillStyle = look.palette.ink
  ctx.font = `500 150px ${SERIF}`
  ctx.fillText(String(k.kept), PAD, y + 40)
  const runOn = ctx.measureText(String(k.kept)).width
  ctx.fillStyle = look.palette.soft
  ctx.font = `400 36px ${SANS}`
  ctx.fillText(k.kept === 1 ? 'thing' : 'things', PAD + runOn + 24, y + 40)
  y += 130

  ctx.strokeStyle = look.palette.accent
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(PAD + 120, y)
  ctx.stroke()
  y += 90

  const stop = FLOOR
  for (const { label, count } of k.tally) {
    if (y > stop) break
    ctx.fillStyle = look.palette.ink
    ctx.font = `500 64px ${SERIF}`
    ctx.fillText(String(count), PAD, y)

    ctx.fillStyle = look.palette.soft
    ctx.font = `400 34px ${SANS}`
    ctx.fillText(label, PAD + 110, y)
    y += 84
  }


  foot(ctx, k, look)
}

export function drawKeepsake(canvas: HTMLCanvasElement, k: Keepsake, look: Look) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  canvas.width = W
  canvas.height = H
  ctx.textBaseline = 'alphabetic'
  ground(ctx, look)
  if (look.shape === 'line') drawLine(ctx, k, look)
  else if (look.shape === 'tally') drawTally(ctx, k, look)
  else drawColophon(ctx, k, look)
}

/* ── Getting it off the device ─────────────────────────────────────────── */

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'reading'
}

async function fileOf(canvas: HTMLCanvasElement, title: string) {
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
  return blob ? new File([blob], `${slug(title)}.png`, { type: 'image/png' }) : null
}

function download(file: File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  /* The click is synchronous but the fetch of the object URL is not, so the
     revoke waits a turn. */
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Hand the picture to the system share sheet. Where there isn't one — most
    desktop browsers — it saves instead, and says so, because a button that
    silently does the other thing is a button the reader stops trusting. */
export async function sendKeepsake(
  canvas: HTMLCanvasElement,
  title: string,
): Promise<'shared' | 'saved' | 'cancelled'> {
  const file = await fileOf(canvas, title)
  if (!file) return 'cancelled'

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch {
      /* Cancelled at the system sheet, or refused. Falling through to a save
         would hand the reader a file they just declined to send. */
      return 'cancelled'
    }
  }

  download(file)
  return 'saved'
}
