/* One keep, drawn as a picture you can send.

   `keepsake.ts` prints the whole reading; this prints a single thing out of
   it — the line, the note, the person, the photograph. Same plate, same two
   families, same four papers, same speckle. That is the point of it: a reader
   who sends one quote today and their whole journey in December should be
   sending two pictures that came off the same press, and the only way to
   guarantee that is for the second one to be drawn with the first one's tools.
   Everything shared here is imported from there rather than copied.

   What is new is the subject. A reading is a set of facts and a picture of it
   is a colophon; one keep is a thing somebody wrote down, and the picture has
   to be about the words. So the axis is not "what is it reduced to" but "how
   loud" — the same keep set large as an epigraph, or set quietly on a ruled
   card with the day and the page across the head, or, when the keep is a
   photograph, mounted with the words underneath it.

   Nothing here says "Flyleaf" either. */

import type { Book, Entry } from '../data/db'
import { KIND, STANCE } from './kinds'
import { dayPhrase } from './lexicon'
import {
  FLOOR,
  H,
  PAD,
  SANS,
  SERIF,
  W,
  foot,
  ground,
  stamp,
  wrap,
} from './keepsake'
import type { Palette } from './keepsake'

/* ── The axis ──────────────────────────────────────────────────────────── */

export type Cut = 'said' | 'card' | 'mount'

export const CUTS: { id: Cut; label: string; hint: string }[] = [
  { id: 'said', label: 'The words', hint: 'what you kept, set as large as the page will take' },
  { id: 'card', label: 'The card', hint: 'the same words set quietly, dated and placed' },
  { id: 'mount', label: 'The picture', hint: 'your picture, mounted, with the words under it' },
]

export interface Cast {
  cut: Cut
  palette: Palette
}

/* ── What there is to draw ─────────────────────────────────────────────── */

export interface Plate {
  /** Stamped at the head: what kind of keep this is, and — for a plot thread
      — how sure the reader was. A hunch printed as a claim is a different
      sentence, which is why share.ts carries the stance too. */
  kind: string
  /** A character's name, a place's name. The heading, where there is one. */
  name: string | null
  /** The words themselves. */
  said: string
  /** Quotation marks, for the one kind that is somebody else's sentence. */
  quoted: boolean
  /** The day, the chapter and the page, in that order and already joined. */
  where: string
  /** The photograph or the map, already decoded. Null for everything else. */
  picture: ImageBitmap | null
  title: string
  author: string
}

export function plateOf(keep: Entry, book: Book, picture: ImageBitmap | null): Plate {
  const one = KIND[keep.type].one
  const article = /^[aeiou]/i.test(one) ? 'an' : 'a'
  const stance = keep.stance ? STANCE[keep.stance].label : null

  return {
    kind: [`${article} ${one}`, stance].filter(Boolean).join(' · '),
    name: keep.name?.trim() || null,
    said: keep.text?.trim() ?? '',
    quoted: keep.type === 'quote',
    /* The day as a date, never as "today". The keep on screen says "today"
       because the reader is standing in it; a picture is opened by somebody
       else, next week, and a keepsake that says "today" is a keepsake that
       quietly stops being true the morning after it was sent. */
    where: [
      dayPhrase(keep.keptOn),
      keep.chapter?.trim() || null,
      keep.page !== undefined ? `p. ${keep.page}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    picture,
    title: book.title,
    author: book.author,
  }
}

/** A cut with nothing to put in it is not offered. */
export function cutWorks(p: Plate, cut: Cut) {
  if (cut === 'mount') return Boolean(p.picture)
  return Boolean(p.said || p.name)
}

/** Which cut a keep opens on: its picture if it has one, its words if not. */
export function firstCut(p: Plate): Cut {
  return p.picture ? 'mount' : 'said'
}

/* ── Drawing ───────────────────────────────────────────────────────────── */

const MEASURE = W - PAD * 2

/* The head's baseline, matched to the reading's so the two pictures start at
   the same height. */
const HEAD = PAD + 84

/** More lines than the plate can hold: keep what fits and say so. A picture
    that silently stops mid-sentence reads as a bug at the far end. */
function clamp(lines: string[], most: number, tail = '…') {
  if (lines.length <= most) return lines
  const kept = lines.slice(0, most)
  kept[most - 1] = kept[most - 1].replace(/[\s,;:.]+$/, '') + tail
  return kept
}

/** The largest size on the ladder at which the words fit the room, and the
    lines they set into. The smallest size is not a floor to fall through —
    if the words are still too long there, they are clamped rather than
    shrunk further, because there is a size below which a quotation stops
    being legible in a message thread and starts being a texture. */
function fitted(
  ctx: CanvasRenderingContext2D,
  text: string,
  face: (px: number) => string,
  ladder: number[],
  leading: number,
  room: number,
) {
  let size = ladder[ladder.length - 1]
  let lines: string[] = []
  for (const px of ladder) {
    ctx.font = face(px)
    lines = wrap(ctx, text, MEASURE)
    if (lines.length * px * leading <= room) {
      size = px
      ctx.font = face(px)
      return { size, lines, step: px * leading }
    }
  }
  ctx.font = face(size)
  lines = clamp(wrap(ctx, text, MEASURE), Math.max(1, Math.floor(room / (size * leading))))
  return { size, lines, step: size * leading }
}

/** A heading set as large as two lines will allow. Not `fitted`: that one
    trades size against a height, which is the right question for a paragraph
    and the wrong one for a name. A name wants to be the largest thing on the
    plate, and the only real constraint on it is that "The long field behind
    the chapel" must not run to four lines and stop being a heading. */
function heading(ctx: CanvasRenderingContext2D, text: string, ladder: number[], most = 2) {
  for (const px of ladder) {
    ctx.font = `500 ${px}px ${SERIF}`
    const lines = wrap(ctx, text, MEASURE)
    if (lines.length <= most) return { size: px, lines, step: Math.round(px * 1.16) }
  }
  const px = ladder[ladder.length - 1]
  ctx.font = `500 ${px}px ${SERIF}`
  return { size: px, lines: clamp(wrap(ctx, text, MEASURE), most), step: Math.round(px * 1.16) }
}

/** The words, with the quotation marks the kind earns. */
function body(p: Plate) {
  return p.quoted && p.said ? `“${p.said}”` : p.said
}

/** How wide a stamped line actually is. `stamp` draws with tracking on it and
    puts the tracking back afterwards, so measuring in its wake measures the
    wrong string — 2.6px per character narrower than what was printed. */
function stampWidth(ctx: CanvasRenderingContext2D, text: string) {
  const was = ctx.letterSpacing
  ctx.font = `600 22px ${SANS}`
  ctx.letterSpacing = '2.6px'
  const w = ctx.measureText(text).width
  ctx.letterSpacing = was
  return w
}

/** The provenance, narrowed until it fits the room it was given. The chapter
    goes first because it is the longest and the least load-bearing — a page
    number without a chapter still finds the passage; a chapter name without a
    page still says roughly where. Below that, the page alone, then the day
    alone, then nothing: a stamp that runs into the one beside it is worse
    than a stamp that isn't there. */
function place(ctx: CanvasRenderingContext2D, where: string, room: number) {
  const parts = where.split(' · ').filter(Boolean)
  if (!parts.length) return ''
  const last = parts[parts.length - 1]
  for (const t of [parts, [parts[0], last], [last], [parts[0]]]) {
    const line = [...new Set(t)].join(' · ')
    if (stampWidth(ctx, line.toUpperCase()) <= room) return line
  }
  return ''
}

/* ── The words, set large ──────────────────────────────────────────────── */

/* The room the words are set into. It stops short of the imprint's floor by a
   line, because the page reference is stamped under the last of them and a
   stamp that lands on the book's own title is not a citation, it is a
   collision. */
const SAID_TOP = HEAD + 76
const SAID_END = FLOOR - 46
/* Under the name, and under the last line of the words. Both are gaps between
   two different sizes of type, so neither can be a multiple of a line. */
const NAME_GAP = 52
const WHERE_GAP = 58

function drawSaid(ctx: CanvasRenderingContext2D, p: Plate, palette: Palette) {
  ctx.textAlign = 'left'
  ctx.fillStyle = palette.soft
  stamp(ctx, p.kind.toUpperCase(), PAD, HEAD)

  const room = SAID_END - SAID_TOP

  /* The name takes its own measure first and the words get what is left. A
     character card is the person's name; the sentence under it is the reader
     saying who they are, and it must not push the name off the plate.

     It is set much larger than the sentence under it — nearly twice — because
     at the sizes this started out with, 68 over 52, the two read as one grey
     block with a slightly bigger first line. On a plate whose whole subject is
     one name, the name has to be the picture. */
  const head = p.name ? heading(ctx, p.name, [96, 84, 74, 64]) : null
  const nameBlock = head ? head.lines.length * head.step + NAME_GAP : 0

  const words = body(p)
  const set = words
    ? fitted(
        ctx,
        words,
        (px) => `${p.quoted ? 'italic ' : ''}500 ${px}px ${SERIF}`,
        p.name ? [50, 46, 42, 38] : [88, 80, 72, 64, 56, 48, 44, 40],
        1.32,
        room - nameBlock,
      )
    : null

  /* Centred in the room rather than hung from the top of it. A four-word
     quote pinned under the head with 700px of blank stock beneath it reads as
     a page that failed to finish printing; centred, the same four words read
     as the point of the plate.

     The provenance counts towards the block even though it is stamped after
     it. Leaving it out centred the words and then hung a line underneath them,
     which put ~60px more white above the block than below it — the whole set
     sitting visibly low on the page for a reason no reader could name. */
  const where = place(ctx, p.where, MEASURE)
  const block =
    nameBlock + (set ? set.lines.length * set.step : 0) + (where ? WHERE_GAP : 0)
  const top = SAID_TOP + (room - block) / 2
  let last = top

  ctx.fillStyle = palette.ink
  if (head) {
    ctx.font = `500 ${head.size}px ${SERIF}`
    head.lines.forEach((line, i) => {
      last = top + head.size + i * head.step
      ctx.fillText(line, PAD, last)
    })
  }

  if (set) {
    const from = top + nameBlock
    ctx.font = `${p.quoted ? 'italic ' : ''}500 ${set.size}px ${SERIF}`
    set.lines.forEach((line, i) => {
      last = from + set.size + i * set.step
      ctx.fillText(line, PAD, last)
    })
  }

  if (where) {
    ctx.fillStyle = palette.accent
    stamp(ctx, where.toUpperCase(), PAD, last + WHERE_GAP)
  }

  foot(ctx, p, palette)
}

/* ── The same words, set quietly ───────────────────────────────────────── */

/* A ruled head with the kind at one end and the day at the other, and the
   words underneath at reading size rather than poster size. This is the cut
   for the note that runs to eighty words — the one the other cut has to shrink
   to 40px and still clamp. It is also, deliberately, the plainer of the two:
   not everything a reader keeps wants to be an epigraph. */
function drawCard(ctx: CanvasRenderingContext2D, p: Plate, palette: Palette) {
  ctx.textAlign = 'left'
  ctx.fillStyle = palette.soft
  stamp(ctx, p.kind.toUpperCase(), PAD, HEAD)

  const kindWidth = stampWidth(ctx, p.kind.toUpperCase())
  const where = place(ctx, p.where, MEASURE - kindWidth - 60)
  if (where) {
    ctx.textAlign = 'right'
    stamp(ctx, where.toUpperCase(), W - PAD, HEAD)
    ctx.textAlign = 'left'
  }

  const rule = HEAD + 34
  ctx.strokeStyle = palette.accent
  ctx.globalAlpha = 0.55
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(PAD, rule)
  ctx.lineTo(W - PAD, rule)
  ctx.stroke()
  ctx.globalAlpha = 1

  /* Centred between the rule and the imprint, not hung under the rule. Hung,
     a three-line quote set 709px of empty stock between its last word and the
     book's title — over half the plate, on the cut whose whole argument is
     that it is the composed one. Quiet is not the same as unfinished. */
  const top = rule + 66
  const room = FLOOR - 40 - top

  const NAME_SIZE = 56
  const NAME_STEP = 66
  let nameLines: string[] = []
  if (p.name) {
    ctx.font = `500 ${NAME_SIZE}px ${SERIF}`
    nameLines = clamp(wrap(ctx, p.name, MEASURE), 2)
  }
  const nameBlock = nameLines.length ? nameLines.length * NAME_STEP + 22 : 0

  const words = body(p)
  const set = words
    ? fitted(ctx, words, (px) => `400 ${px}px ${SANS}`, [54, 48, 42, 38], 1.5, room - nameBlock)
    : null

  const block = nameBlock + (set ? set.lines.length * set.step : 0)
  const from = top + (room - block) / 2

  ctx.fillStyle = palette.ink
  if (nameLines.length) {
    ctx.font = `500 ${NAME_SIZE}px ${SERIF}`
    nameLines.forEach((line, i) => {
      ctx.fillText(line, PAD, from + NAME_SIZE + i * NAME_STEP)
    })
  }

  if (set) {
    const under = from + nameBlock
    ctx.font = `400 ${set.size}px ${SANS}`
    set.lines.forEach((line, i) => {
      ctx.fillText(line, PAD, under + set.size + i * set.step)
    })
  }

  foot(ctx, p, palette)
}

/* ── The photograph, mounted ───────────────────────────────────────────── */

const MOUNT_TOP = HEAD + 44
const CAP_STEP = 47 // 36px italic serif at 1.3
const CAP_GAP = 56

function drawMount(ctx: CanvasRenderingContext2D, p: Plate, palette: Palette) {
  if (!p.picture) return

  ctx.textAlign = 'left'
  ctx.fillStyle = palette.soft
  stamp(ctx, p.kind.toUpperCase(), PAD, HEAD)

  const kindWidth = stampWidth(ctx, p.kind.toUpperCase())
  const where = place(ctx, p.where, MEASURE - kindWidth - 60)
  if (where) {
    ctx.textAlign = 'right'
    stamp(ctx, where.toUpperCase(), W - PAD, HEAD)
    ctx.textAlign = 'left'
  }

  const avail = FLOOR - MOUNT_TOP

  /* The caption is measured before the picture is sized, because the picture
     takes what is left rather than the other way round: a photograph is
     allowed to be large, but not at the price of the sentence the reader
     wrote under it. Three lines is the cap — past that it stops being a
     caption. */
  const words = body(p)
  let caption: string[] = []
  if (words) {
    ctx.font = `italic 500 36px ${SERIF}`
    caption = clamp(wrap(ctx, words, MEASURE), 3)
  }
  const capBlock = caption.length ? CAP_GAP + caption.length * CAP_STEP : 0

  /* Contained, never cropped. A reader who photographed a whole page is
     sending the whole page; cropping it to a tidy rectangle would cut off the
     margin they were pointing at. */
  const scale = Math.min(MEASURE / p.picture.width, (avail - capBlock) / p.picture.height)
  const drawW = p.picture.width * scale
  const drawH = p.picture.height * scale

  const top = MOUNT_TOP + (avail - (drawH + capBlock)) / 2
  const left = PAD + (MEASURE - drawW) / 2

  ctx.drawImage(p.picture, left, top, drawW, drawH)

  /* One hairline around it, the same weight as the plate's own edge — a
     photograph on paper has a boundary, and without one a pale picture bleeds
     into pale stock and stops looking mounted. */
  ctx.strokeStyle = palette.soft
  ctx.globalAlpha = 0.45
  ctx.lineWidth = 2
  ctx.strokeRect(left + 1, top + 1, drawW - 2, drawH - 2)
  ctx.globalAlpha = 1

  let y = top + drawH + CAP_GAP
  ctx.fillStyle = palette.ink
  ctx.font = `italic 500 36px ${SERIF}`
  for (const line of caption) {
    ctx.fillText(line, PAD, y)
    y += CAP_STEP
  }

  foot(ctx, p, palette)
}

export function drawPlate(canvas: HTMLCanvasElement, p: Plate, cast: Cast) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  canvas.width = W
  canvas.height = H
  ctx.textBaseline = 'alphabetic'
  ground(ctx, cast.palette)
  if (cast.cut === 'mount' && p.picture) drawMount(ctx, p, cast.palette)
  else if (cast.cut === 'card') drawCard(ctx, p, cast.palette)
  else drawSaid(ctx, p, cast.palette)
}

/* ── The picture on the keep ───────────────────────────────────────────── */

/** Decode the keep's own media, when it is something that can be printed.

    Voice is media too and cannot be: a plate of a recording is a plate of
    nothing. What comes back is an ImageBitmap rather than an Image, so the
    draw itself stays synchronous — the sheet redraws on every tap of a paper
    swatch, and a decode per tap is a flicker per tap. */
export async function pictureOf(keep: Entry): Promise<ImageBitmap | null> {
  if (!keep.media || !keep.media.type.startsWith('image/')) return null
  try {
    return await createImageBitmap(keep.media)
  } catch {
    /* A blob that will not decode — a file saved by a browser that has since
       changed its mind about the format. The other two cuts still work. */
    return null
  }
}
