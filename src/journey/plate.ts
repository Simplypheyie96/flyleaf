/* One keep, drawn as a picture you can send.

   `keepsake.ts` prints the whole reading; this prints a single thing out of
   it — the line, the note, the person, the photograph. Same plate, same one
   family, same four papers, same speckle. That is the point of it: a reader
   who sends one quote today and their whole journey in December should be
   sending two pictures that came off the same press, and the only way to
   guarantee that is for the second one to be drawn with the first one's tools.
   Everything shared here is imported from there rather than copied.

   What is new is the subject, and the object. A reading is a set of facts and
   a picture of it is a colophon; one keep is a thing somebody wrote down, and
   the picture has to be about the words. So the axis is not "what is it
   reduced to" but "how loud" — the same keep set large as an epigraph, or set
   quietly at reading size, or, when the keep is a photograph, mounted with the
   words underneath it.

   AND IT IS MOUNTED. A field of colour, a sheet of the palette's own paper
   laid on it with a shadow under its edge, the book's cover and title across
   the head of that sheet, and the words printed under a rule. The whole
   reading fills its plate edge to edge because a reading is the size of a
   page; one sentence set edge to edge on 1080×1350 is a poster, and the first
   version of this file was exactly that — words on stock, no cover, no mount,
   nothing to say which book they came out of until the foot. Mounted, at the
   same size, the same sentence is a keepsake. It is the move a framer makes
   with a small print, and it is why the mat is deeper at the foot than at the
   head.

   Still the same press: same paper, same tooth, same two faces, same four
   palettes, same helpers. What changed is that the paper is now an object on
   the plate instead of the plate itself.

   Nothing here says "Flyleaf" either. The head names the reader's book and the
   foot dates the reader's keep; there is no room left on it for us, which is
   the point. */

import type { Book, Entry } from '../data/db'
import { groundHue } from '../books/CoverArt'
import { seedFrom } from '../books/seed'
import { KIND, STANCE } from './kinds'
import { dayPhrase } from './lexicon'
import {
  FACE,
  FACE_READ,
  H,
  W,
  onField,
  read,
  speckle,
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
  /** The book's own cover, when one could be fetched without tainting the
      canvas — see `coverOf`. Null is ordinary, not a failure: a board is drawn
      in its place and the plate never has a hole in it. */
  cover: ImageBitmap | null
  title: string
  author: string
  /** The hue the book's own cloth is dyed, when the board has to be drawn.
      Carried on the plate rather than looked up in `board` so the picture
      stays a pure function of what it was handed. */
  hue: number
}

export function plateOf(
  keep: Entry,
  book: Book,
  picture: ImageBitmap | null,
  cover: ImageBitmap | null,
): Plate {
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
    cover,
    title: book.title,
    author: book.author,
    /* Recomputed from the title and author rather than read off `book.id`,
       even though for every book the shelf added itself those are the same
       number. A book that arrived by import carries whatever id it came with,
       and a plate whose cloth does not match the cover in the reader's own
       library is exactly the kind of small disconnect nobody can name and
       everybody notices. */
    hue: groundHue(seedFrom(book.title, book.author)),
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

/* ── The mount ─────────────────────────────────────────────────────────── */

/* The mat, and the sheet on it. Every number below is a margin on a mounted
   print, which is why they are not all the same: 76 at the sides, 108 at the
   head, and 168 at the foot. A frame with equal margins reads as slightly
   bottom-light to the eye, and the extra at the foot is the correction every
   framer makes for it. */
const MAT = 76
const CARD_X = MAT
const CARD_W = W - MAT * 2
const CARD_TOP = 108
const CARD_BOT = H - 168
const CARD_H = CARD_BOT - CARD_TOP
const CARD_R = 34

/* The sheet's own margin, inside the mount's. Wide, because a printed page's
   margin is wide and because what is inside it is one sentence. */
const INSET = 68
const IN_X = CARD_X + INSET
const IN_W = CARD_W - INSET * 2
const IN_TOP = CARD_TOP + INSET
const IN_BOT = CARD_BOT - INSET

function frame(ctx: CanvasRenderingContext2D) {
  ctx.beginPath()
  ctx.roundRect(CARD_X, CARD_TOP, CARD_W, CARD_H, CARD_R)
}

/** The field, and the sheet laid on it. */
function mount(ctx: CanvasRenderingContext2D, palette: Palette) {
  ctx.fillStyle = palette.field
  ctx.fillRect(0, 0, W, H)
  /* The mat has tooth too, in whichever ink the field can carry. A sheet with
     grain on a flat mat looks like a sheet pasted onto a screenshot. */
  speckle(ctx, onField(palette), 0.05, 0, 0, W, H, 4400, 5147)

  /* The only real shadow anywhere in this app, and it is allowed here for the
     one reason the interface's paper is not: on screen the cards ARE the
     surface, and a surface does not cast onto itself. This sheet is an object
     lying on something else, and an object with no shadow is a rectangle of a
     different colour. Still soft — 26% at a 46px blur, dropped 18 — because
     the sheet is resting on the mat, not hovering over it. */
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.26)'
  ctx.shadowBlur = 46
  ctx.shadowOffsetY = 18
  ctx.fillStyle = palette.paper
  frame(ctx)
  ctx.fill()
  ctx.restore()

  ctx.save()
  frame(ctx)
  ctx.clip()
  speckle(ctx, palette.ink, 0.045, CARD_X, CARD_TOP, CARD_W, CARD_H, 3600, 9973)
  ctx.restore()
}

/* ── The book, at the head ─────────────────────────────────────────────── */

const COVER_W = 76
const COVER_H = 114
const COVER_GAP = 28

/** One oklch colour, resolved here rather than handed to the canvas as a
    string.

    Canvas takes CSS colours, and every browser this app supports parses
    `oklch()` in a stylesheet — but a colour a canvas cannot parse is not an
    error, it is a no-op: `fillStyle` keeps whatever it held before and the
    board comes out the colour of the last thing drawn. That failure is
    invisible until somebody shares a book on an older phone, which is the one
    place nobody is looking. Twenty lines of matrix beats that trade. */
function oklchHex(l: number, c: number, h: number) {
  const rad = (h * Math.PI) / 180
  const a = c * Math.cos(rad)
  const b = c * Math.sin(rad)

  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3

  const rgb = [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ]

  return `#${rgb
    .map((v) => {
      const s = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
      return Math.round(Math.min(1, Math.max(0, s)) * 255)
        .toString(16)
        .padStart(2, '0')
    })
    .join('')}`
}

/** The letter a drawn board is stamped with: the title's first real word.
    "The" and "A" are on a third of the shelf and would put the same letter on
    a third of the boards. */
function initial(title: string) {
  const words = title.trim().split(/\s+/)
  const word = (/^(the|a|an)$/i.test(words[0]) ? words[1] : words[0]) ?? title
  return (word.match(/[a-z0-9]/i)?.[0] ?? title.charAt(0) ?? '·').toUpperCase()
}

/** The cover, at the size a mounted print can spare for one — small enough
    that it names the book rather than competing with what was kept out of it.

    A board is drawn first and the photograph laid over it, which is what
    BookCover does on screen for the same reason: there is no frame in which
    this plate has a hole where a cover should be. The board is not a
    placeholder waiting for a network — most of the time the fetch has already
    failed, quietly, on CORS, and the board is the cover. */
function board(ctx: CanvasRenderingContext2D, p: Plate, palette: Palette, x: number, y: number) {
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, COVER_W, COVER_H, 5)
  ctx.clip()

  if (p.cover) {
    /* Cropped to fill, never letterboxed. A cover is somebody's design and a
       band of paper down either side of it reads as a broken image, not as a
       considered margin. */
    const scale = Math.max(COVER_W / p.cover.width, COVER_H / p.cover.height)
    const w = p.cover.width * scale
    const h = p.cover.height * scale
    ctx.drawImage(p.cover, x + (COVER_W - w) / 2, y + (COVER_H - h) / 2, w, h)
  } else {
    /* The board is dyed the book's OWN cloth, not the plate's accent — the
       same hue, at the same pale lightness, that the cover in the reader's
       library is drawn at. Four palettes times one accent would have given
       every book on a Bloom plate the same clay binding; this way the plate
       changes paper and the book stays the book. It is not the embroidered
       cover — a garland is not a thing to port to a canvas for 76px — but it
       is that cover's cloth, which is the part you recognise at this size.

       Both tones come off the one hue, so the letter clears 4.5:1 on its
       board whatever the seed picked. */
    const cloth = oklchHex(0.945, 0.05, p.hue)
    const thread = oklchHex(0.44, 0.075, p.hue)
    ctx.fillStyle = cloth
    ctx.fillRect(x, y, COVER_W, COVER_H)
    speckle(ctx, thread, 0.14, x, y, COVER_W, COVER_H, 300, 4801)

    /* A sewn spine two hairlines in from the edge, and the letter set on the
       board it leaves. Cloth binding, at 76px. */
    ctx.strokeStyle = thread
    ctx.globalAlpha = 0.4
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x + 11.5, y)
    ctx.lineTo(x + 11.5, y + COVER_H)
    ctx.stroke()
    ctx.globalAlpha = 1

    ctx.fillStyle = thread
    ctx.font = `600 ${read(32)}px ${FACE_READ}`
    ctx.textAlign = 'center'
    ctx.fillText(initial(p.title), x + 11 + (COVER_W - 11) / 2, y + COVER_H / 2 + 14)
    ctx.textAlign = 'left'
  }
  ctx.restore()

  /* One hairline around it whatever is inside, the same weight as the rule
     under the head. Without it a pale cover bleeds into pale stock and stops
     looking like an object lying on the sheet. */
  ctx.strokeStyle = palette.soft
  ctx.globalAlpha = 0.4
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(x + 1, y + 1, COVER_W - 2, COVER_H - 2, 5)
  ctx.stroke()
  ctx.globalAlpha = 1
}

/** More lines than the plate can hold: keep what fits and say so. A picture
    that silently stops mid-sentence reads as a bug at the far end. */
function clamp(lines: string[], most: number, tail = '…') {
  if (lines.length <= most) return lines
  const kept = lines.slice(0, most)
  kept[most - 1] = kept[most - 1].replace(/[\s,;:.]+$/, '') + tail
  return kept
}

/** How wide a stamped line actually is. `stamp` draws with tracking on it and
    puts the tracking back afterwards, so measuring in its wake measures the
    wrong string — 2.6px per character narrower than what was printed. */
function stampWidth(ctx: CanvasRenderingContext2D, text: string) {
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
function cut(ctx: CanvasRenderingContext2D, text: string, room: number) {
  if (stampWidth(ctx, text) <= room) return text
  let s = text
  while (s.length > 1 && stampWidth(ctx, `${s}…`) > room) s = s.slice(0, -1)
  return `${s.replace(/[\s,;:.·]+$/, '')}…`
}

/* The head is the same on all three cuts, and that is deliberate: three
   pictures that share a masthead are a set, and three that each invent their
   own are three templates. What the cuts differ in is the one thing they are
   for — how the words underneath are set. */
function head(ctx: CanvasRenderingContext2D, p: Plate, palette: Palette) {
  board(ctx, p, palette, IN_X, IN_TOP)

  const x = IN_X + COVER_W + COVER_GAP
  const room = IN_W - COVER_W - COVER_GAP

  const SIZE = read(34)
  const STEP = Math.round(SIZE * 1.16)
  ctx.textAlign = 'left'
  ctx.fillStyle = palette.ink
  ctx.font = `600 ${SIZE}px ${FACE_READ}`
  const lines = clamp(wrap(ctx, p.title, room), 2)

  /* Centred on the board beside it, off the ink rather than off the line box.

     Hanging the first baseline at `IN_TOP + SIZE` — the obvious way, and the
     way this was first written — puts a one-line title's capitals fifteen
     pixels below the top of the cover, which is not enough to name and quite
     enough to make the head look like it slipped. So the block is measured
     from the top of the caps to the author's baseline (a stamped line is all
     capitals, so it has no descender to allow for) and centred against the
     board. Two lines then span the board almost exactly, which is luck, but
     it is the kind of luck worth keeping: the geometry above was chosen
     partly because it lands there. */
  const CAP = SIZE * 0.66
  const AUTHOR_GAP = 40
  const tall = CAP + (lines.length - 1) * STEP + AUTHOR_GAP
  let y = Math.round(IN_TOP + COVER_H / 2 + CAP - tall / 2)
  for (const line of lines) {
    ctx.fillText(line, x, y)
    y += STEP
  }

  const author = y - STEP + AUTHOR_GAP
  ctx.fillStyle = palette.soft
  stamp(ctx, cut(ctx, p.author.toUpperCase(), room), x, author)

  /* Under whichever of the two ran longer. A one-line title clears the board
     by 30px and a two-line one overruns it, and a rule at a fixed height would
     either float above the second case or crowd the first. */
  const rule = Math.max(IN_TOP + COVER_H, author + 14) + 34
  ctx.strokeStyle = palette.soft
  ctx.globalAlpha = 0.34
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(IN_X, rule)
  ctx.lineTo(IN_X + IN_W, rule)
  ctx.stroke()
  ctx.globalAlpha = 1

  return rule
}

/* ── The provenance, at the foot ───────────────────────────────────────── */

/** The provenance, narrowed until it fits the room it was given. The chapter
    goes first because it is the longest and the least load-bearing — a page
    number without a chapter still finds the passage; a chapter name without a
    page still says roughly where. Below that, the page alone, then the day
    alone, then nothing: a stamp that runs into the one beside it is worse than
    a stamp that isn't there. */
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

/* What it is and where it came from, on one line at the sheet's foot. They
   were two stamps in two corners and read as a form; joined by the same middot
   the app uses everywhere else, they read as a caption. */
function mark(ctx: CanvasRenderingContext2D, p: Plate, palette: Palette) {
  /* Without its article. `kind` reads "a quote" because share.ts sets it in a
     sentence, and a sentence needs one; a stamp is a label, and "A QUOTE ·
     JULY 5" reads like a form field where "QUOTE · JULY 5" reads like a
     caption. The article is dropped here rather than at the source so the
     written share keeps its grammar. */
  const kind = p.kind.replace(/^an? /i, '').toUpperCase()
  const where = place(ctx, p.where, IN_W - stampWidth(ctx, kind) - 40)
  ctx.textAlign = 'left'
  ctx.fillStyle = palette.accent
  stamp(ctx, [kind, where.toUpperCase()].filter(Boolean).join(' · '), IN_X, IN_BOT)
}

/* The room between the head's rule and the foot's stamp. Everything a cut
   draws lives inside it, and no cut may add to the plate's height — 4:5 is the
   one aspect every message app shows whole. */
const ROOM_HEAD = 58
const ROOM_FOOT = 58

/* ── Setting the words ─────────────────────────────────────────────────── */

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
    lines = wrap(ctx, text, IN_W)
    if (lines.length * px * leading <= room) {
      ctx.font = face(px)
      return { size: px, lines, step: px * leading }
    }
  }
  ctx.font = face(size)
  lines = clamp(wrap(ctx, text, IN_W), Math.max(1, Math.floor(room / (size * leading))))
  return { size, lines, step: size * leading }
}

/** A heading set as large as two lines will allow. Not `fitted`: that one
    trades size against a height, which is the right question for a paragraph
    and the wrong one for a name. A name wants to be the largest thing on the
    sheet, and the only real constraint on it is that "The long field behind
    the chapel" must not run to four lines and stop being a heading. */
function heading(ctx: CanvasRenderingContext2D, text: string, ladder: number[], most = 2) {
  for (const px of ladder) {
    ctx.font = `600 ${px}px ${FACE_READ}`
    const lines = wrap(ctx, text, IN_W)
    if (lines.length <= most) return { size: px, lines, step: Math.round(px * 1.14) }
  }
  const px = ladder[ladder.length - 1]
  ctx.font = `600 ${px}px ${FACE_READ}`
  return { size: px, lines: clamp(wrap(ctx, text, IN_W), most), step: Math.round(px * 1.14) }
}

/** The words, with the quotation marks the kind earns. */
function body(p: Plate) {
  return p.quoted && p.said ? `“${p.said}”` : p.said
}

/* The words are set in the BOOK'S face, not the app's.

   They were set in Quicksand — the interface family, the one that labels
   buttons — at 88px, which is the single thing that made the old picture look
   like a slide out of a deck. A geometric sans at poster size says *notice
   this*; a sentence somebody copied out of a novel is not an announcement, it
   is reading matter, and reading matter is what the serif is here for. Every
   other surface in this app already keeps that split. The picture was the one
   place that had forgotten it. */
function words(ctx: CanvasRenderingContext2D, p: Plate, palette: Palette, ladder: number[], leading: number, weight: number, top: number, room: number) {
  const name = p.name ? heading(ctx, p.name, [86, 76, 68, 60]) : null
  const nameBlock = name ? name.lines.length * name.step + 44 : 0

  const said = body(p)
  const set = said
    ? fitted(ctx, said, (px) => `${weight} ${px}px ${FACE_READ}`, ladder, leading, room - nameBlock)
    : null

  /* Centred in the room rather than hung from the top of it. A four-word quote
     pinned under the rule with 600px of blank stock beneath it reads as a
     sheet that failed to finish printing; centred, the same four words read as
     the reason the sheet exists. */
  const block = nameBlock + (set ? set.lines.length * set.step : 0)
  const from = top + Math.max(0, (room - block) / 2)

  ctx.textAlign = 'left'
  ctx.fillStyle = palette.ink
  if (name) {
    ctx.font = `600 ${name.size}px ${FACE_READ}`
    name.lines.forEach((line, i) => {
      ctx.fillText(line, IN_X, from + name.size + i * name.step)
    })
  }
  if (set) {
    const under = from + nameBlock
    ctx.font = `${weight} ${set.size}px ${FACE_READ}`
    set.lines.forEach((line, i) => {
      ctx.fillText(line, IN_X, under + set.size + i * set.step)
    })
  }
}

/* ── Loud ──────────────────────────────────────────────────────────────── */

/* The epigraph. As large as the sheet will take it, which on a short line is
   very large indeed — that is the whole offer of this cut, and the reason it
   is the one a quote opens on. */
function drawSaid(ctx: CanvasRenderingContext2D, p: Plate, palette: Palette) {
  const rule = head(ctx, p, palette)
  const top = rule + ROOM_HEAD
  words(
    ctx,
    p,
    palette,
    p.name ? [58, 52, 46, 42] : [104, 92, 82, 74, 66, 58, 52, 46],
    1.24,
    500,
    top,
    IN_BOT - ROOM_FOOT - top,
  )
  mark(ctx, p, palette)
}

/* ── Quiet ─────────────────────────────────────────────────────────────── */

/* The same sheet, the same head, the same foot, and the words at reading size
   on a reading leading. This is the cut for the note that runs to eighty
   words — the one the loud cut has to shrink to 46px and still clamp. It is
   also, deliberately, the plainer of the two: not everything a reader keeps
   wants to be an epigraph. */
function drawCard(ctx: CanvasRenderingContext2D, p: Plate, palette: Palette) {
  const rule = head(ctx, p, palette)
  const top = rule + ROOM_HEAD
  words(ctx, p, palette, [56, 50, 46, 42, 38], 1.5, 400, top, IN_BOT - ROOM_FOOT - top)
  mark(ctx, p, palette)
}

/* ── The photograph, mounted ───────────────────────────────────────────── */

/* A caption, not body copy. The other two cuts set the reader's words at 28
   because there the words ARE the picture; here they are the line printed
   under a plate, and a plate's caption has always been smaller than the text
   it sits in. Set at the same size, the note competed with the photograph for
   the eye and lost anyway — and, being wide, took so much of the sheet's
   height that the photograph had to shrink to pay for it, which is the wrong
   thing to shrink on the cut whose subject is a photograph.

   Five lines at this size hold most notes anybody writes under a photograph;
   a fifth of the sheet buys the picture back. The step is 1.43× the size,
   because a caption that runs to four or five lines needs the leading of
   something meant to be read, not the leading of a label. */
const CAP_SIZE = read(22)
const CAP_STEP = 40
const CAP_GAP = 44

function drawMount(ctx: CanvasRenderingContext2D, p: Plate, palette: Palette) {
  const shot = p.picture
  if (!shot) return

  const rule = head(ctx, p, palette)
  const top = rule + ROOM_HEAD
  const avail = IN_BOT - ROOM_FOOT - top

  const said = body(p)
  ctx.font = `400 ${CAP_SIZE}px ${FACE_READ}`

  /* Contained, never cropped. A reader who photographed a whole page is
     sending the whole page; cropping it to a tidy rectangle would cut off the
     margin they were pointing at.

     Which means the plate has to cope with a shape it did not choose, and the
     two shapes want opposite pages. A photograph held sideways fills the
     sheet's width and leaves a band under it, and its sentence goes in the
     band. A photograph held upright — the common one, because it came off a
     phone — is bound by the height it is given, comes out a third of the
     sheet wide, and leaves a tall empty column down the right. Setting its
     caption under it anyway is what the first version of this did: the words
     ran three times wider than the photograph they belonged to, and the column
     stayed empty.

     So the upright one is tipped in at the left and its note is written beside
     it, which is both the obvious use of that column and what somebody with a
     photograph and a glue stick actually does. It also gets the whole height
     back, since nothing is waiting underneath: a third again taller and half
     again wider than it was. */
  const UPRIGHT = 0.62
  const GUTTER = 44
  const full = Math.min(IN_W / shot.width, avail / shot.height)
  const beside = Boolean(said) && shot.width * full < IN_W * UPRIGHT

  /* Under the picture, the caption's lines are paid for out of the picture's
     height, and the two measurements chase each other: how many lines there
     are depends on how wide they may be, which is the picture's width, which
     depends on how much height the lines have already taken. There is no
     formula for that, but there are only five answers, so the five are tried
     in order and the first honest one is kept — the smallest reservation the
     caption actually fits inside at the width it buys. Widening the picture
     can only ever REDUCE the lines it needs, so a reservation the caption fits
     in is stable: nothing later in the function can make it wrong.

     Trying small first matters. It is the same picture either way, but the
     three-line answer draws it a sixth larger than the five-line one, and a
     photograph is the subject of this cut — so the reservation grows only when
     the reader's own sentence forces it. A note too long even for five is
     elided: the mount cut is a picture with a caption, and a reader whose
     words need more room than that has a cut whose subject is the words. */
  const CAP_MOST = 5

  /* What a caption of n lines costs the picture, measured to the ink and not
     to the line box: the gap, then n-1 whole steps, then the depth the last
     line's descenders actually reach.

     Charging a whole step for the last line is the obvious way to write this
     and it is wrong by thirty pixels — thirty pixels of nothing, reserved
     under the final sentence. It does not show as a gap, because there is
     nothing there to see. It shows at the OTHER end: the picture is centred
     against what was reserved, so the sheet comes out with a foot margin half
     again its head margin, on a plate whose two margins were set equal on
     purpose. Measured on the real canvas it was 58 above and 73 below. */
  const DROP = Math.round(CAP_SIZE * 0.24)
  const reserve = (lines: number) => (lines ? CAP_GAP + (lines - 1) * CAP_STEP + DROP : 0)
  const fit = (lines: number) =>
    Math.min(IN_W / shot.width, (avail - reserve(lines)) / shot.height)

  let held = CAP_MOST
  if (said && !beside) {
    for (let n = 1; n <= CAP_MOST; n++) {
      if (wrap(ctx, said, shot.width * fit(n)).length <= n) {
        held = n
        break
      }
    }
  }

  const scale = beside || !said ? full : fit(held)
  const drawW = Math.round(shot.width * scale)
  const drawH = Math.round(shot.height * scale)

  /* Beside: as many lines as the picture is tall enough to stand next to.
     Under: the picture's own width, so the caption ends where the photograph
     ends and the two read as one mounted thing rather than two objects that
     happen to be stacked. */
  const measure = beside ? IN_W - drawW - GUTTER : drawW
  const caption = said
    ? clamp(wrap(ctx, said, measure), beside ? Math.max(3, Math.floor(drawH / CAP_STEP)) : held)
    : []
  const capBlock = beside ? 0 : reserve(caption.length)

  const from = top + Math.max(0, (avail - (drawH + capBlock)) / 2)

  /* The photograph and its caption are one object, and the object is centred
     on the sheet — the title, the rule and the stamp are the sheet's furniture
     and stay where they always are. Left-setting the picture too was the first
     instinct, on the theory that a sheet wants one left edge; but a picture
     that has given up a fifth of its width to a caption then sits against the
     left margin with a hand's width of blank paper beside it, and reads as
     having slid. A plate centred inside a text block is the ordinary way a
     printed book does this, and it is ordinary because it looks right.

     Under a caption the two share the offset, so their own edges still agree.
     Beside one, the pair spans the full measure and the offset is zero, which
     is why this needs no second case. */
  const left = Math.round(IN_X + (IN_W - (beside ? IN_W : drawW)) / 2)

  ctx.drawImage(shot, left, from, drawW, drawH)

  ctx.strokeStyle = palette.soft
  ctx.globalAlpha = 0.45
  ctx.lineWidth = 2
  ctx.strokeRect(left + 1, from + 1, drawW - 2, drawH - 2)
  ctx.globalAlpha = 1

  /* Beside, the note is centred against the photograph rather than hung from
     its top. A note that runs the height of the column lands in the same place
     either way, so this costs nothing there; it is the short one that needs
     it. "Chapter nine, the fold." set level with the top of a photograph two
     thirds the height of the sheet reads as a line that fell out of the
     paragraph above it, with a hand's depth of blank column underneath. The
     same line at the photograph's middle reads as a caption, because that is
     where a caption beside a plate goes.

     Measured off the capitals rather than the baseline in both directions —
     the block runs from the top of the first line's caps to the last line's
     baseline, which is what the eye centres on. */
  ctx.textAlign = 'left'
  ctx.fillStyle = palette.ink
  const CAP_CAP = Math.round(CAP_SIZE * 0.72)
  let y = beside
    ? from + Math.round((drawH - (CAP_CAP + (caption.length - 1) * CAP_STEP)) / 2) + CAP_CAP
    : from + drawH + CAP_GAP
  const x = beside ? left + drawW + GUTTER : left
  for (const line of caption) {
    ctx.fillText(line, x, y)
    y += CAP_STEP
  }

  mark(ctx, p, palette)
}

export function drawPlate(canvas: HTMLCanvasElement, p: Plate, cast: Cast) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  canvas.width = W
  canvas.height = H
  ctx.textBaseline = 'alphabetic'
  mount(ctx, cast.palette)
  if (cast.cut === 'mount' && p.picture) drawMount(ctx, p, cast.palette)
  else if (cast.cut === 'card') drawCard(ctx, p, cast.palette)
  else drawSaid(ctx, p, cast.palette)
}

/* ── The book's own cover ──────────────────────────────────────────────── */

/** One catalogue image, decoded only if it can be decoded SAFELY.

    `crossOrigin = 'anonymous'` is the whole of this function. Drawing a remote
    image onto a canvas without it taints the canvas, and a tainted canvas
    throws on `toBlob` — which is to say the picture would look perfect on
    screen and then fail at the one moment it exists for, when the reader taps
    send. With the attribute set, a host that does not allow us simply fires
    `onerror` and we draw the board instead. The plate is never wrong and the
    file always saves. */
function decode(src: string) {
  return new Promise<ImageBitmap | null>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => {
      createImageBitmap(img).then(resolve, () => resolve(null))
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** The first of the book's covers that comes back clean, or nothing.

    Serially rather than in parallel: the list is in preference order — the
    catalogue that had the real jacket first — and racing them would hand the
    plate whichever host happened to answer fastest. */
export async function coverOf(book: Book): Promise<ImageBitmap | null> {
  for (const src of book.covers ?? []) {
    const bitmap = await decode(src)
    if (bitmap) return bitmap
  }
  return null
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
