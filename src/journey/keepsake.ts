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

   The press signs it. One stamped line at the foot, opposite the author, in
   the same tracked capitals this plate already sets a term and a page number
   in — see `imprint` below, and `brand/imprint.ts` for the words and why they
   are those words. It shares the foot with the book rather than floating over
   the reading, which is the difference between a colophon and a watermark. */

import type { Book, Entry } from '../data/db'
import { IMPRINT } from '../brand/imprint'
import { MARK } from '../brand/Wordmark'
import { colophon } from './lexicon'

/* ── The two axes ──────────────────────────────────────────────────────── */

export type Shape = 'colophon' | 'arc' | 'line'

export const SHAPES: { id: Shape; label: string; hint: string }[] = [
  { id: 'colophon', label: 'The Reading', hint: 'your reading journey, key reflection, and facts' },
  { id: 'arc', label: "Reader's Arc", hint: 'how you felt and key highlights throughout the book' },
  { id: 'line', label: 'Featured Line', hint: 'a favorite quote or central reflection, set large' },
]

export interface Palette {
  id: string
  label: string
  paper: string
  ink: string
  soft: string
  accent: string
  field: string
}

export const PALETTES: Palette[] = [
  { id: 'flyleaf', label: 'Flyleaf', paper: '#f4f7fb', ink: '#161d29', soft: '#5c6674', accent: '#2f6f6a', field: '#2f6f6a' },
  { id: 'dusk', label: 'Dusk', paper: '#1b2230', ink: '#eef1f6', soft: '#96a1b3', accent: '#e0b25f', field: '#39435c' },
  { id: 'bloom', label: 'Bloom', paper: '#fbf1ec', ink: '#38292a', soft: '#7b625c', accent: '#a84c3b', field: '#a84c3b' },
  { id: 'fern', label: 'Fern', paper: '#eef3ec', ink: '#1e2c22', soft: '#5c6e5e', accent: '#37704b', field: '#2b5a3c' },
]

function lum(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const parts = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2]
}

function ratio(a: string, b: string) {
  const [hi, lo] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (hi + 0.05) / (lo + 0.05)
}

export function onField(p: Palette) {
  return ratio(p.paper, p.field) >= ratio(p.ink, p.field) ? p.paper : p.ink
}

export interface Look {
  shape: Shape
  palette: Palette
}

/* ── What there is to draw ─────────────────────────────────────────────── */

export interface Keepsake {
  title: string
  author: string
  lines: { term: string; detail: string }[]
  line: { text: string; where: string } | null
  impression: string | null
  highlights: { label: string; text: string }[]
  kept: number
}

export function keepsakeOf(book: Book, keeps: Entry[]): Keepsake {
  const quotes = keeps.filter((e) => e.type === 'quote' && e.text?.trim())
  const notes = keeps.filter((e) => e.type === 'note' && e.text?.trim())
  const characters = keeps.filter((e) => e.type === 'character' && (e.name || e.text))
  const places = keeps.filter((e) => e.type === 'place' && (e.name || e.text))
  const threads = keeps.filter((e) => e.type === 'thread' && (e.name || e.text))

  const impressionEntry =
    notes[0] ??
    threads[0] ??
    quotes.sort((a, b) => (b.text?.length ?? 0) - (a.text?.length ?? 0))[0]

  const impression = impressionEntry?.text?.trim() ?? null

  const highlights: { label: string; text: string }[] = []
  if (quotes[0] && quotes[0].id !== impressionEntry?.id) {
    highlights.push({ label: 'Quote', text: `“${quotes[0].text!.trim()}”` })
  }
  if (characters[0] && characters[0].id !== impressionEntry?.id) {
    const name = characters[0].name ? `Character: ${characters[0].name}` : ''
    const body = characters[0].text?.trim() ?? ''
    highlights.push({ label: 'Character', text: [name, body].filter(Boolean).join(' — ') })
  }
  if (places[0] && places[0].id !== impressionEntry?.id) {
    const name = places[0].name ? `Setting: ${places[0].name}` : ''
    const body = places[0].text?.trim() ?? ''
    highlights.push({ label: 'Setting', text: [name, body].filter(Boolean).join(' — ') })
  }
  if (threads[0] && threads[0].id !== impressionEntry?.id) {
    const name = threads[0].name ? `Theory: ${threads[0].name}` : ''
    const body = threads[0].text?.trim() ?? ''
    highlights.push({ label: 'Theory', text: [name, body].filter(Boolean).join(' — ') })
  }
  if (notes[1] && notes[1].id !== impressionEntry?.id && highlights.length < 3) {
    highlights.push({ label: 'Note', text: notes[1].text!.trim() })
  }

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
          where: [
            pick.chapter,
            pick.page !== undefined ? `p. ${pick.page}` : null,
            pick.percent !== undefined ? `${pick.percent}%` : null,
          ]
            .filter(Boolean)
            .join(', '),
        }
      : null,
    impression,
    highlights,
    kept: keeps.length,
  }
}

/** A shape with nothing to put in it is not offered. */
export function shapeWorks(k: Keepsake, shape: Shape) {
  if (shape === 'line') return Boolean(k.line)
  if (shape === 'arc') return Boolean(k.impression || k.highlights.length > 0 || k.line)
  return k.lines.length > 0
}

/* ── Drawing ───────────────────────────────────────────────────────────── */

/* 4:5. The one aspect every message app and every feed shows whole, so the
   reader never finds out at the far end that the last line was cropped off. */
export const W = 1080
export const H = 1350
export const PAD = 96

/* The two families the app is set in, and the picture keeps the same split the
   screens do: FACE is the app labelling, FACE_READ is the book speaking.

   These names have to match faces the page actually loaded. document.fonts
   .load() resolves with an empty list and no error when the family is unknown,
   so a wrong name here does not throw — it just draws the picture in the
   system fallback and says nothing. It has been wrong three times: once naming
   "Geist", a face this app has never shipped; once naming EB Garamond after
   the app moved off it; and once holding a stale second constant for Nunito
   Sans. That history is why the previous note argued for ONE constant, and the
   argument was right for an app with one family. This one has two, so the
   defence has to be somewhere else: every size the picture draws is loaded
   explicitly in readyFonts() below, and anything missing from that list draws
   in the fallback. Add a weight here, add it there. */
export const FACE = '"Quicksand Variable", system-ui, sans-serif'
export const FACE_READ = '"EB Garamond Variable", Palatino, Georgia, serif'

/* Canvas has no font-size-adjust, so the correction the CSS gets for free has
   to be applied by hand: Garamond's x-height is 0.405 of its em against
   Quicksand's 0.5162, so a serif size is multiplied to stand level with a sans
   one. Without it every title and quote on the plate sets a step small next to
   the stamped labels around them, which on a picture somebody is about to
   share is the difference between typeset and mismatched. */
const READ_SCALE = 0.5162 / 0.405
export const read = (px: number) => Math.round(px * READ_SCALE)

/** Canvas takes no font it has not been told to load, whatever the CSS did.
    Both families are variable, so every weight the picture draws has to be
    asked for by name: loading 400 does not bring 500 with it. */
export async function readyFonts() {
  await Promise.all([
    document.fonts.load(`600 22px ${FACE}`),
    document.fonts.load(`700 150px ${FACE}`),
    document.fonts.load(`400 36px ${FACE}`),
    document.fonts.load(`600 96px ${FACE_READ}`),
    document.fonts.load(`500 56px ${FACE_READ}`),
    document.fonts.load(`400 46px ${FACE_READ}`),
  ])
  await document.fonts.ready
}

/* The stamped labels — a term, an author, a page, never a sentence. On screen
   these are capitals with tracking on them, and the tracking is what
   makes them read as stamped rather than shouted; the canvas has to be told
   both. ctx.letterSpacing sticks to the context once set, so it is put back
   here rather than left for the next fillText to inherit it. */
export function stamp(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  const was = ctx.letterSpacing
  ctx.font = `600 22px ${FACE}`
  ctx.letterSpacing = '2.6px'
  ctx.fillText(text, x, y)
  ctx.letterSpacing = was
}

/** How wide a stamped line actually is. `stamp` draws with tracking on it and
    puts the tracking back afterwards, so measuring in its wake measures the
    wrong string — 2.6px per character narrower than what was printed. */
export function stampWidth(ctx: CanvasRenderingContext2D, text: string) {
  const was = ctx.letterSpacing
  ctx.font = `600 22px ${FACE}`
  ctx.letterSpacing = '2.6px'
  const w = ctx.measureText(text).width
  ctx.letterSpacing = was
  return w
}

/** A stamped line cut to the room it was given. Only names reach this — a
    fourteen-word pen name is rare and a stamp that runs out through the
    sheet's margin is not. */
export function elide(ctx: CanvasRenderingContext2D, text: string, room: number) {
  if (stampWidth(ctx, text) <= room) return text
  let s = text
  while (s.length > 1 && stampWidth(ctx, `${s}…`) > room) s = s.slice(0, -1)
  return `${s.replace(/[\s,;:.·]+$/, '')}…`
}

export function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
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

/** The tooth, over any rectangle. At about 4.5% alpha over 1.4% of the area it
    is not visible as dots at any size anyone will see this at — it just stops
    a fill reading as a fill, which is the whole of what a stock does.

    It takes a rectangle rather than assuming the plate because the mounted
    picture has three of them: the field, the sheet laid on it, and the little
    board a drawn cover is printed on. Same tooth on all three, from here,
    because a mount whose sheet has grain and whose mat does not looks like a
    sheet pasted onto a screenshot. */
export function speckle(
  ctx: CanvasRenderingContext2D,
  color: string,
  alpha: number,
  x: number,
  y: number,
  w: number,
  h: number,
  count: number,
  seed: number,
) {
  const rand = scatter(seed)
  ctx.fillStyle = color
  ctx.globalAlpha = alpha
  for (let i = 0; i < count; i++) {
    ctx.fillRect(x + rand() * w, y + rand() * h, 2, 2)
  }
  ctx.globalAlpha = 1
}

export function ground(ctx: CanvasRenderingContext2D, palette: Palette) {
  ctx.fillStyle = palette.paper
  ctx.fillRect(0, 0, W, H)

  speckle(ctx, palette.ink, 0.045, 0, 0, W, H, 5200, 9973)

  /* Embossed into the corner the type runs away from, and clipped to the
     plate's own edge so it stops where the paper does rather than bleeding
     past the hairline. See `blindStamp`. */
  ctx.save()
  ctx.beginPath()
  ctx.rect(41, 41, W - 82, H - 82)
  ctx.clip()
  blindStamp(ctx, palette.accent, W - 210, H - 230, 520)
  ctx.restore()

  /* The plate's edge. One hairline inside the bleed, which is what makes a
     picture read as a printed thing rather than as a screenshot. */
  ctx.strokeStyle = palette.soft
  ctx.globalAlpha = 0.35
  ctx.lineWidth = 2
  ctx.strokeRect(40.5, 40.5, W - 81, H - 81)
  ctx.globalAlpha = 1
}

/* The lowest baseline anything but the foot may use. */
export const FLOOR = H - PAD - 130

/* The foot's own line. The book signs one end of it and the press the other,
   which is where a title page's verso puts them both — so neither assumes the
   width, and both are measured against it. */
const FOOT_Y = H - PAD - 8

/* What the press holds open beside the author. Two stamped lines meeting in
   the middle read as one run-on line; 48 is the same air the single-keep plate
   already keeps between its kind and its provenance. */
const IMPRINT_GAP = 48

/** The press, stamped wherever a picture leaves the app.

    Small caps in the app's labelling face — the same treatment a term, an
    author and a page number already get here — because a colophon is set at
    the size of the smallest fact on the page and never at the size of a title.
    The two pictures put it in different places for the reason a printer would:
    the whole reading is a printed page, so this signs the foot of it; one keep
    is a print laid on a mat, and the label under a mounted print goes on the
    mat. Same words, same face, same size, so they read as one press.

    The colour is the caller's, because the two surfaces are not the same
    surface — the reading's own paper under one, the mount's field under the
    other — and each has its own ink that clears 4.5:1 on it. */
export function imprint(
  ctx: CanvasRenderingContext2D,
  colour: string,
  x: number,
  y: number,
  align: CanvasTextAlign = 'left',
) {
  const was = ctx.textAlign
  ctx.textAlign = align
  ctx.fillStyle = colour
  stamp(ctx, IMPRINT.toUpperCase(), x, y)
  ctx.textAlign = was
}

/* ── The mark ──────────────────────────────────────────────────────────── */

/* THE ROSETTE, ON THE PICTURE. The owner's report was one clause long and
   entirely fair: "the logo is not there either, flyleaf's logo." Every picture
   that left the app was signed in words and by nothing you could recognise
   from across a room, which for a thing whose whole purpose is to be seen in
   somebody else's message thread is the wrong way round.

   It is the same path the tab bar, the splash and the home-screen icon are
   drawn from — imported, not redrawn, for the reason Wordmark.tsx gives about
   the five files that move together. Canvas takes SVG path data through
   Path2D, arcs and all, so the mark on the picture is the mark on the icon to
   the pixel rather than in spirit. */
const ROSETTE = typeof Path2D === 'function' ? new Path2D(MARK) : null

/** The mark, at any size, centred on a point. `size` is its full width, the
    same number the React component takes, so the two are asked for in the
    same units. */
export function flower(
  ctx: CanvasRenderingContext2D,
  colour: string,
  cx: number,
  cy: number,
  size: number,
  alpha = 1,
) {
  if (!ROSETTE) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = colour
  ctx.translate(cx, cy)
  ctx.scale(size / 512, size / 512)
  ctx.translate(-256, -256)
  ctx.fill(ROSETTE)
  ctx.restore()
}

/** The blind stamp: the mark set enormous and almost invisible, bled off a
    corner, under everything.

    This is the answer to the other half of the same report — "it's currently
    too plain". A plate that is stock, one rule and a column of type is honest
    and it is also flat, and the usual cures are worse: a border makes it a
    certificate, a tint makes it a slide. What a press does instead is emboss
    the paper, and an emboss reads as texture from across the room and as the
    house mark when you actually look. At 4% it cannot compete with a word on
    the page — which is the requirement, because nothing here is allowed to
    make the reader's own sentence harder to read. */
export function blindStamp(
  ctx: CanvasRenderingContext2D,
  colour: string,
  cx: number,
  cy: number,
  size: number,
) {
  flower(ctx, colour, cx, cy, size, 0.045)
}

/** The press's signature: the mark, then the words, as one line.

    Set as a pair rather than a lone stamp because two marks in two corners is
    two logos. `x` is the line's outer edge on the side it is aligned to, so a
    caller centring it needs the pair's width — which is why this returns it. */
export function signature(
  ctx: CanvasRenderingContext2D,
  colour: string,
  x: number,
  y: number,
  align: 'left' | 'right' | 'center' = 'left',
) {
  const MARK_SIZE = 26
  const GAP = 14
  const words = stampWidth(ctx, IMPRINT.toUpperCase())
  const whole = MARK_SIZE + GAP + words
  const left = align === 'left' ? x : align === 'right' ? x - whole : x - whole / 2

  /* Centred on the CAPITALS beside it, not on the baseline. A stamp has no
     descenders, so a mark centred on the baseline sits visibly low. */
  flower(ctx, colour, left + MARK_SIZE / 2, y - 7.5, MARK_SIZE, 0.9)
  imprint(ctx, colour, left + MARK_SIZE + GAP, y, 'left')
  return whole
}

/** The author, stamped at the foot and kept out of the press's way.

    Ours is a fixed fifteen characters and theirs is not, so theirs is the one
    that gets measured. At 1080 wide that still leaves the author about 590px —
    thirty-odd tracked capitals, more than any name on any shelf. When one does
    run past it, an elided name beside a legible press beats a name running out
    through the plate's own margin, which is what an unmeasured author did
    before there was anything at the far end of this line to stop it. */
function byline(ctx: CanvasRenderingContext2D, author: string, palette: Palette) {
  /* The 40 is the rosette and its gap, which the press now carries at the far
     end of this line — see `signature`. Left out, a long name would run into
     the mark instead of into the words, which is the same bug one glyph
     earlier. */
  const room = W - PAD * 2 - stampWidth(ctx, IMPRINT.toUpperCase()) - 40 - IMPRINT_GAP
  ctx.textAlign = 'left'
  ctx.fillStyle = palette.soft
  stamp(ctx, elide(ctx, author.toUpperCase(), room), PAD, FOOT_Y)
}

/** The book, at the foot of every shape. Attribution is not decoration. Takes
    the two strings rather than the whole reading, because a title and a name
    are what every shape has — the facts and the counts are not. */
export function foot(
  ctx: CanvasRenderingContext2D,
  of: { title: string; author: string },
  palette: Palette,
) {
  ctx.strokeStyle = palette.soft
  ctx.globalAlpha = 0.25
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, FOOT_Y - 72)
  ctx.lineTo(W - PAD, FOOT_Y - 72)
  ctx.stroke()
  ctx.globalAlpha = 1

  ctx.textAlign = 'left'
  ctx.fillStyle = palette.ink
  ctx.font = `600 ${read(36)}px ${FACE_READ}`
  const title = wrap(ctx, of.title, W - PAD * 2)[0]
  ctx.fillText(title, PAD, FOOT_Y - 32)

  byline(ctx, of.author, palette)
}

/* The colophon's own floor. It ends in a single stamped author line rather
   than the two-line imprint the other shapes carry, so it can run further down
   the plate than they can before anything is crowded. */
const COLOPHON_FLOOR = H - PAD - 140

const TERM_STEP = 42
const DETAIL_STEP = 46
const FACT_GAP = 20

function factLines(ctx: CanvasRenderingContext2D, detail: string) {
  ctx.font = `400 ${read(32)}px ${FACE_READ}`
  return wrap(ctx, detail, W - PAD * 2).slice(0, 2)
}

const EPI_GAP = 48

function epigraph(
  ctx: CanvasRenderingContext2D,
  k: Keepsake,
  look: Look,
  top: number,
  room: number,
) {
  if (!k.line || room < 120) return 0

  const quoted = `“${k.line.text}”`
  const setAt = (px: number) => {
    ctx.font = `500 ${px}px ${FACE_READ}`
    return wrap(ctx, quoted, W - PAD * 2)
  }

  let size = 48
  let lines = setAt(size)
  const fits = () => lines.length <= 3 && lines.length * size * 1.25 + EPI_GAP <= room
  while (!fits() && size > 38) {
    size -= 2
    lines = setAt(size)
  }

  if (!fits()) {
    const keep = Math.min(2, Math.floor((room - EPI_GAP) / (size * 1.25)))
    if (keep < 1) return 0
    lines = lines.slice(0, keep)
    lines[keep - 1] = `${lines[keep - 1]}…”`
  }

  const step = size * 1.25
  let y = top + size
  ctx.fillStyle = look.palette.ink
  ctx.font = `500 ${size}px ${FACE_READ}`
  for (const line of lines) {
    if (y > COLOPHON_FLOOR) break
    ctx.fillText(line, PAD, y)
    y += step
  }
  return lines.length * step + EPI_GAP
}

function drawColophon(ctx: CanvasRenderingContext2D, k: Keepsake, look: Look) {
  let y = PAD + 70

  ctx.textAlign = 'left'
  ctx.fillStyle = look.palette.soft
  stamp(ctx, 'A READING SUMMARY', PAD, y)
  y += 74

  ctx.fillStyle = look.palette.ink
  ctx.font = `600 ${read(52)}px ${FACE_READ}`
  const titleLines = wrap(ctx, k.title, W - PAD * 2).slice(0, 2)
  for (const line of titleLines) {
    ctx.fillText(line, PAD, y)
    y += Math.round(read(52) * 1.15)
  }

  y += 10
  ctx.strokeStyle = look.palette.accent
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(PAD + 100, y)
  ctx.stroke()
  y += 46

  for (const { term, detail } of k.lines) {
    const lines = factLines(ctx, detail)
    if (y + TERM_STEP + lines.length * DETAIL_STEP > COLOPHON_FLOOR) break

    ctx.fillStyle = look.palette.soft
    stamp(ctx, term.toUpperCase(), PAD, y)
    y += TERM_STEP

    ctx.fillStyle = look.palette.ink
    ctx.font = `400 ${read(32)}px ${FACE_READ}`
    for (const line of lines) {
      if (y > COLOPHON_FLOOR) break
      ctx.fillText(line, PAD, y)
      y += DETAIL_STEP
    }
    y += FACT_GAP
  }

  if (COLOPHON_FLOOR - y >= 130) {
    y += epigraph(ctx, k, look, y, COLOPHON_FLOOR - y)
  }

  foot(ctx, k, look.palette)
}

function drawLine(ctx: CanvasRenderingContext2D, k: Keepsake, look: Look) {
  if (!k.line) return

  let y = PAD + 70
  ctx.textAlign = 'left'
  ctx.fillStyle = look.palette.soft
  stamp(ctx, 'FEATURED QUOTE', PAD, y)
  y += 74

  const room = COLOPHON_FLOOR - y - 100
  let size = 96
  let lines: string[] = []
  for (; size >= 44; size -= 4) {
    ctx.font = `600 ${size}px ${FACE_READ}`
    lines = wrap(ctx, `“${k.line.text}”`, W - PAD * 2)
    if (lines.length * size * 1.22 <= room) break
  }

  const most = Math.max(1, Math.floor(room / (size * 1.22)))
  if (lines.length > most) {
    lines = lines.slice(0, most)
    const last = lines[most - 1].replace(/[\s”“]+$/, '')
    lines[most - 1] = `${elide(ctx, last, W - PAD * 2 - ctx.measureText('…”').width)}…”`
  }

  ctx.fillStyle = look.palette.ink
  ctx.font = `600 ${size}px ${FACE_READ}`
  for (const line of lines) {
    if (y + size > COLOPHON_FLOOR - 40) break
    ctx.fillText(line, PAD, y)
    y += size * 1.22
  }

  if (k.line.where && y < COLOPHON_FLOOR - 30) {
    y += 20
    ctx.fillStyle = look.palette.accent
    stamp(ctx, k.line.where.toUpperCase(), PAD, y)
  }

  foot(ctx, k, look.palette)
}

function drawArc(ctx: CanvasRenderingContext2D, k: Keepsake, look: Look) {
  let y = PAD + 70

  ctx.textAlign = 'left'
  ctx.fillStyle = look.palette.soft
  stamp(ctx, "THE READER'S JOURNEY", PAD, y)
  y += 74

  ctx.fillStyle = look.palette.ink
  ctx.font = `600 ${read(52)}px ${FACE_READ}`
  const titleLines = wrap(ctx, k.title, W - PAD * 2).slice(0, 2)
  for (const line of titleLines) {
    ctx.fillText(line, PAD, y)
    y += Math.round(read(52) * 1.15)
  }

  y += 10
  ctx.strokeStyle = look.palette.accent
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(PAD + 100, y)
  ctx.stroke()
  y += 44

  if (k.impression && y + 100 < COLOPHON_FLOOR) {
    ctx.fillStyle = look.palette.soft
    stamp(ctx, 'MY REFLECTION', PAD, y)
    y += 38

    ctx.fillStyle = look.palette.ink
    ctx.font = `500 ${read(36)}px ${FACE_READ}`
    const impLines = wrap(ctx, `“${k.impression}”`, W - PAD * 2).slice(0, 3)
    for (const l of impLines) {
      if (y > COLOPHON_FLOOR) break
      ctx.fillText(l, PAD, y)
      y += Math.round(read(36) * 1.22)
    }
    y += 32
  }

  if (k.highlights.length > 0) {
    for (const h of k.highlights.slice(0, 2)) {
      if (y + 80 > COLOPHON_FLOOR) break
      ctx.fillStyle = look.palette.soft
      stamp(ctx, h.label.toUpperCase(), PAD, y)
      y += 36

      ctx.fillStyle = look.palette.ink
      ctx.font = `400 ${read(32)}px ${FACE_READ}`
      const hLines = wrap(ctx, h.text, W - PAD * 2).slice(0, 2)
      for (const l of hLines) {
        if (y > COLOPHON_FLOOR) break
        ctx.fillText(l, PAD, y)
        y += Math.round(read(32) * 1.22)
      }
      y += 28
    }
  }

  foot(ctx, k, look.palette)
}

export function drawKeepsake(canvas: HTMLCanvasElement, k: Keepsake, look: Look) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  canvas.width = W
  canvas.height = H
  ctx.textBaseline = 'alphabetic'
  ground(ctx, look.palette)
  if (look.shape === 'line') drawLine(ctx, k, look)
  else if (look.shape === 'arc') drawArc(ctx, k, look)
  else drawColophon(ctx, k, look)

  /* Last, and here rather than in each shape, because all three end on the
     same line and a press that signs some of its own pictures is not a press.
     `soft` is the palette's quiet ink — the one the author beside it is
     already set in — so the two ends of the line weigh the same. */
  signature(ctx, look.palette.soft, W - PAD, FOOT_Y, 'right')
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
