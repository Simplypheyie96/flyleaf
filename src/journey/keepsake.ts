/* The keepsake — a reading, drawn as a picture you can send.

   Everything here is drawn on a canvas in the browser, from the reader's own
   keeps, with no network and no key behind it. That is not a limitation worked
   around; it is the reason this exists at all. A share that costs a request per
   tap is a share that eventually stops working, and the archive has to outlive
   whatever this app's bill looks like next year.

   Three axes, because one picture is a template and thirty-six is a choice:
   the SHAPE decides what the reading is reduced to, the PALETTE decides what
   it is set in, and the GRAIN decides what it is set on. They are independent
   on purpose — a reader who wants the tally on night-blue ruled paper should
   not have to accept somebody else's idea of which of those go together.

   Nothing in here says "Flyleaf". A keepsake with an app's name across the
   foot is an advertisement wearing the reader's reading as a costume, and
   share.ts already made that promise for the plain-text side. */

import type { Book, Entry } from '../data/db'
import { KIND, KINDS } from './kinds'
import { colophon } from './lexicon'

/* ── The three axes ────────────────────────────────────────────────────── */

export type Shape = 'colophon' | 'line' | 'tally'
export type Grain = 'plain' | 'grain' | 'ruled'

export const SHAPES: { id: Shape; label: string; hint: string }[] = [
  { id: 'colophon', label: 'The colophon', hint: 'dates, counts, names — the whole reading set small' },
  { id: 'line', label: 'One line', hint: 'a single thing the book said, set large' },
  { id: 'tally', label: 'The tally', hint: 'what you kept, counted' },
]

export const GRAINS: { id: Grain; label: string }[] = [
  { id: 'plain', label: 'Plain' },
  { id: 'grain', label: 'Grain' },
  { id: 'ruled', label: 'Ruled' },
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
  grain: Grain
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
  /** A closing line the reader typed themselves, if they typed one. Carried on
      every surface the keepsake has — the card, the text and the picture — so
      the three are never three different summaries of the same reading. */
  note?: string
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

const SERIF = '"Instrument Serif", Georgia, serif'
const SANS = '"Geist Variable", system-ui, sans-serif'
const MONO = '"Geist Mono Variable", ui-monospace, monospace'

/** Canvas takes no font it has not been told to load, whatever the CSS did. */
export async function readyFonts() {
  await Promise.all([
    document.fonts.load(`400 96px ${SERIF}`),
    document.fonts.load(`400 32px ${SANS}`),
    document.fonts.load(`500 24px ${MONO}`),
  ])
  await document.fonts.ready
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

  if (look.grain === 'grain') {
    const rand = scatter(9973)
    ctx.fillStyle = look.palette.ink
    ctx.globalAlpha = 0.045
    for (let i = 0; i < 5200; i++) {
      ctx.fillRect(rand() * W, rand() * H, 2, 2)
    }
    ctx.globalAlpha = 1
  }

  if (look.grain === 'ruled') {
    ctx.strokeStyle = look.palette.soft
    ctx.globalAlpha = 0.18
    ctx.lineWidth = 1
    for (let y = PAD; y < H - PAD; y += 54) {
      ctx.beginPath()
      ctx.moveTo(PAD, y + 0.5)
      ctx.lineTo(W - PAD, y + 0.5)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

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

/** The note's own lines, measured once so two places can agree on them. */
function noteLines(ctx: CanvasRenderingContext2D, k: Keepsake) {
  if (!k.note) return []
  ctx.font = `italic 400 34px ${SERIF}`
  return wrap(ctx, k.note, W - PAD * 2).slice(0, 3)
}

/* What a shape has to keep clear at the bottom of the plate for the note: one
   blank line of its own leading, then the lines themselves. A whole line rather
   than a half, because the note is set in the accent and in italic and needs to
   arrive as its own thing, not as the last fact wearing a different face. Zero
   when there is no note, so a plate without one still runs its content all the
   way to the floor. */
function noteRoom(ctx: CanvasRenderingContext2D, k: Keepsake) {
  return noteLines(ctx, k).length * 44
}

/* The reader's own closing line. Set in italic and in the accent, because it is
   the one thing on the card that did not come out of the book — which is also
   why it is no longer the thing that gets dropped when the plate runs out of
   room. It used to be drawn last and guarded last: the facts above it ran to
   the bottom margin, `from` landed inside the final 60px, and the one line the
   reader wrote themselves silently failed to appear on a picture they were
   about to send. It was still in the field, still in the card, still in the
   plain text — only the picture lost it.

   Now the shapes reserve `noteRoom` before they lay anything out, and this
   clamps to the place held for it, so it draws in full whether the content
   above finished early or ran right down to it. Returns the baseline it
   finished at. */
function note(ctx: CanvasRenderingContext2D, k: Keepsake, look: Look, from: number) {
  const lines = noteLines(ctx, k)
  if (!lines.length) return from

  let y = Math.min(from + 44, FLOOR - (lines.length - 1) * 44)
  ctx.textAlign = 'left'
  ctx.fillStyle = look.palette.accent
  ctx.font = `italic 400 34px ${SERIF}`
  for (const line of lines) {
    ctx.fillText(line, PAD, y)
    y += 44
  }
  return y
}

/** The book, at the foot of every shape. Attribution is not decoration. */
function foot(ctx: CanvasRenderingContext2D, k: Keepsake, look: Look) {
  const y = H - PAD - 8
  ctx.textAlign = 'left'
  ctx.fillStyle = look.palette.ink
  ctx.font = `400 40px ${SERIF}`
  const title = wrap(ctx, k.title, W - PAD * 2)[0]
  ctx.fillText(title, PAD, y - 34)

  ctx.fillStyle = look.palette.soft
  ctx.font = `500 22px ${MONO}`
  ctx.fillText(k.author.toUpperCase(), PAD, y)
}

function drawColophon(ctx: CanvasRenderingContext2D, k: Keepsake, look: Look) {
  let y = PAD + 84

  ctx.textAlign = 'left'
  ctx.fillStyle = look.palette.soft
  ctx.font = `500 22px ${MONO}`
  ctx.fillText('A READING', PAD, y)
  y += 92

  ctx.fillStyle = look.palette.ink
  ctx.font = `400 76px ${SERIF}`
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
  y += 76

  /* Term above detail rather than beside it. A two-column set breaks the
     moment somebody's "Wondered about" runs to four names, and the whole card
     is built out of the reader's own strings.

     The facts stop short of the note's reserved band rather than filling the
     plate — a colophon has eight or nine facts in it and the last of them is
     "Wondered about", which nobody will miss the way they would miss their own
     closing line. */
  const stop = FLOOR - noteRoom(ctx, k)
  for (const { term, detail } of k.lines) {
    ctx.font = `500 22px ${MONO}`
    if (y + 70 > stop) break
    ctx.fillStyle = look.palette.soft
    ctx.fillText(term.toUpperCase(), PAD, y)
    y += 40

    ctx.fillStyle = look.palette.ink
    ctx.font = `400 36px ${SANS}`
    for (const line of wrap(ctx, detail, W - PAD * 2).slice(0, 2)) {
      if (y > stop) break
      ctx.fillText(line, PAD, y)
      y += 46
    }
    y += 28
  }

  note(ctx, k, look, y)

  ctx.fillStyle = look.palette.soft
  ctx.font = `500 22px ${MONO}`
  ctx.fillText(k.author.toUpperCase(), PAD, H - PAD - 8)
}

function drawLine(ctx: CanvasRenderingContext2D, k: Keepsake, look: Look) {
  if (!k.line) return

  /* Set as large as it can be and still fit the plate. A fixed size would
     either strand a six-word line in the middle of an empty card or push a
     long one off the bottom. */
  const room = H - PAD * 2 - 260 - (k.note ? 160 : 0)
  let size = 88
  let lines: string[] = []
  for (; size >= 40; size -= 4) {
    ctx.font = `400 ${size}px ${SERIF}`
    lines = wrap(ctx, `“${k.line.text}”`, W - PAD * 2)
    if (lines.length * size * 1.24 <= room) break
  }

  const block = lines.length * size * 1.24
  let y = PAD + 120 + (room - block) / 2 + size

  ctx.textAlign = 'left'
  ctx.fillStyle = look.palette.ink
  ctx.font = `400 ${size}px ${SERIF}`
  for (const line of lines) {
    ctx.fillText(line, PAD, y)
    y += size * 1.24
  }

  if (k.line.where) {
    y += 24
    ctx.fillStyle = look.palette.accent
    ctx.font = `500 22px ${MONO}`
    ctx.fillText(k.line.where.toUpperCase(), PAD, y)
  }

  note(ctx, k, look, y + 20)

  foot(ctx, k, look)
}

function drawTally(ctx: CanvasRenderingContext2D, k: Keepsake, look: Look) {
  let y = PAD + 84

  ctx.textAlign = 'left'
  ctx.fillStyle = look.palette.soft
  ctx.font = `500 22px ${MONO}`
  ctx.fillText('WHAT I KEPT', PAD, y)
  y += 100

  ctx.fillStyle = look.palette.ink
  ctx.font = `400 150px ${SERIF}`
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

  const stop = FLOOR - noteRoom(ctx, k)
  for (const { label, count } of k.tally) {
    if (y > stop) break
    ctx.fillStyle = look.palette.ink
    ctx.font = `400 64px ${SERIF}`
    ctx.fillText(String(count), PAD, y)

    ctx.fillStyle = look.palette.soft
    ctx.font = `400 34px ${SANS}`
    ctx.fillText(label, PAD + 110, y)
    y += 84
  }

  note(ctx, k, look, y - 40)

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

/** Straight to the device, no system sheet. The reader asked for the file. */
export async function saveKeepsake(canvas: HTMLCanvasElement, title: string) {
  const file = await fileOf(canvas, title)
  if (file) download(file)
  return file ? 'saved' : 'cancelled'
}
