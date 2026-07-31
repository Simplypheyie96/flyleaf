/* The drawn cover.

   Every book gets one, whether or not a photograph of the real cover exists
   anywhere. It is generated from the book's own seed, so a title is the same
   cover on every device and after every reinstall, and nothing about it is
   stored.

   What it draws is a piece of needlework: two contrasting threads worked into
   one of four arrangements on a pale pastel ground, with a reserved band at
   the foot where the title and byline are set. The whole 2:3 field is the
   drawing surface — an earlier version drew on a square field capped at 78%
   width, which is why every cover used to read as "small logo on a card".

   The arrangement and the thread pair are indexed by `seed % n` rather than
   drawn from the random stream, so adding a fifth arrangement later will not
   reshuffle the art on every book already on a shelf. */

import type { ReactNode } from 'react'
import { between, intBetween, rngFrom, round, type Rng } from './seed'

const W = 100
const H = 150
const MID = W / 2
/** Everything above this is cloth; below it belongs to the type. */
const TYPE_TOP = 100

interface Props {
  seed: number
  /** No type is being set on this board, so give the motif the whole field.
      True only at thumbnail size, where a title would be a grey smudge. */
  bare?: boolean
  className?: string
}

function CoverArt({ seed, bare = false, className }: Props) {
  const rng = rngFrom(seed)
  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {emblem(rng, seed, bare)}
    </svg>
  )
}

/* ---- Stitches ----
   Four marks, and everything on every cover is made of them. Real needlework
   has a small vocabulary too; the variety comes from how they are arranged,
   not from inventing a new stitch per book. */

/* Floss hues.

   These are new, and deliberately so. The app's five entry hues include honey
   (85) and mustard (95), and that band is the yellow-olive part of the wheel:
   at any lightness with enough chroma to read as thread, both come out brown.
   No amount of tuning L fixes a hue. So the flowers get their own set — five
   angles chosen to have no brown anywhere in them — while sage stays the
   foliage and the board keeps being tinted from the app's own tokens. */
const HUE = {
  periwinkle: 265,
  coral: 40,
  rose: 350,
  teal: 200,
  lilac: 305,
  sage: 145,
} as const

/** Running stitch: a dashed line, which is literally what it is. */
function running(key: string, d: string, w = 1.1, dash = '3.4 2.6') {
  return <path key={key} d={d} strokeWidth={w} strokeDasharray={dash} />
}

/** A thread at a given hue angle. */
export function floss(h: number) {
  return `oklch(var(--floss-l) var(--floss-c) ${h})`
}

const GREEN = `oklch(var(--floss-green-l) var(--floss-green-c) ${HUE.sage})`
const CREAM = 'var(--floss-cream)'

/* Always one cool thread against one warm one, and never two neighbours on the
   wheel — a pair less than about 90° apart reads as one colour badly printed.
   The order decides which of the two is the dominant bloom. */
const PAIRS = [
  [HUE.periwinkle, HUE.coral],
  [HUE.coral, HUE.periwinkle],
  [HUE.teal, HUE.rose],
  [HUE.rose, HUE.teal],
  [HUE.lilac, HUE.coral],
  [HUE.periwinkle, HUE.rose],
  [HUE.teal, HUE.coral],
  [HUE.lilac, HUE.teal],
  [HUE.teal, HUE.lilac],
] as const

const EMBLEMS = ['garland', 'sprig', 'wreath', 'rosette'] as const

/* Candidate tints for the board, spread round the wheel. At the pastel
   lightness the stock is printed at, even 85 comes out as pale butter rather
   than as brown — it is only the saturated thread weight that band ruins. */
const GROUNDS = [35, 85, 145, 200, 265, 320] as const

/** Degrees between two hue angles, the short way round the wheel. */
function apart(x: number, y: number) {
  const d = Math.abs(x - y) % 360
  return d > 180 ? 360 - d : d
}

/* The board tint and the two threads worked on it.

   The board is chosen FIRST and the threads second. Doing it the other way
   round looks equivalent and is not: sage (145) is the only angle far enough
   from every floss hue to survive every filter, so it was clearing on all nine
   pairs while peach cleared on two — and about a third of every shelf came out
   green. Picking the ground uniformly and then asking which pairs are clear of
   it evens out the one thing you actually see from across a room.

   Both indices come from the seed rather than from the random stream, so
   adding a tint or a pair later will not reshuffle the books already on a
   shelf. The second index is taken from the part of the seed the first one did
   not use, so the threads are not a function of the board. */
export function palette(seed: number) {
  const ground = GROUNDS[seed % GROUNDS.length]
  // Clear of the ground in both directions, or the dominant bloom sinks into
  // its own cloth.
  const clear = PAIRS.filter(([a, b]) => apart(a, ground) >= 55 && apart(b, ground) >= 55)
  const [a, b] = clear[Math.floor(seed / GROUNDS.length) % clear.length]
  return { ground, a, b }
}

/** The hue angle the board is tinted — all the board itself needs to know. */
export function groundHue(seed: number): number {
  return palette(seed).ground
}

/** One petal: a teardrop, wide at the tip and drawn back to a point at the
    centre. An ellipse gives a daisy that looks stamped; a teardrop overlaps
    its neighbours the way real petals do and the flower reads as grown. */
function petalPath(r: number) {
  const w = round(r * 0.40)
  const tip = round(-r)
  const sh = round(-r * 0.42)
  return `M 0 0 C ${-w} ${sh} ${-w} ${tip} 0 ${tip} C ${w} ${tip} ${w} ${sh} 0 0 Z`
}

/** A bloom. Above r=9 it gets an inner ring of short petals and a crown of
    cream knots around the eye — the two things that separate a pretty piece
    of needlework from a flat clip-art daisy. */
export function flower(key: string, cx: number, cy: number, r: number, petals: number, color: string, spin = 0) {
  const outer: ReactNode[] = []
  for (let i = 0; i < petals; i += 1) {
    outer.push(<path key={i} d={petalPath(r)} transform={`rotate(${round((360 / petals) * i)})`} />)
  }
  const big = r >= 9
  const inner: ReactNode[] = []
  const crown: ReactNode[] = []
  if (big) {
    // Offset by half a step so the short petals sit in the outer gaps.
    for (let i = 0; i < petals; i += 1) {
      inner.push(
        <path
          key={i}
          d={petalPath(r * 0.56)}
          transform={`rotate(${round((360 / petals) * i + 180 / petals)})`}
        />,
      )
    }
    for (let i = 0; i < petals; i += 1) {
      const rad = ((360 / petals) * i + 180 / petals) * (Math.PI / 180)
      crown.push(
        <circle
          key={i}
          cx={round(Math.cos(rad) * r * 0.3)}
          cy={round(Math.sin(rad) * r * 0.3)}
          r={round(r * 0.075)}
        />,
      )
    }
  }
  return (
    <g key={key} transform={`translate(${round(cx)} ${round(cy)}) rotate(${round(spin)})`}>
      <g fill={color}>{outer}</g>
      {big && <g fill={color} opacity="0.55">{inner}</g>}
      <circle r={round(r * (big ? 0.2 : 0.26))} fill={CREAM} />
      {big && <g fill={CREAM}>{crown}</g>}
    </g>
  )
}

/** A closed bud: the same teardrop, on its side, with a green calyx. Buds are
    what fill the awkward gaps between blooms without adding another flower. */
export function bud(key: string, cx: number, cy: number, deg: number, r: number, color: string) {
  return (
    <g key={key} transform={`translate(${round(cx)} ${round(cy)}) rotate(${round(deg)})`}>
      <path d={petalPath(r)} fill={color} />
      <path d={petalPath(r * 0.45)} transform="rotate(180)" fill={GREEN} />
    </g>
  )
}

/** A pointed oval, filled. The leaves are all this shape. */
export function leaf(key: string, cx: number, cy: number, deg: number, len: number, wid = len * 0.42) {
  const h = round(wid / 2)
  return (
    <path
      key={key}
      transform={`translate(${round(cx)} ${round(cy)}) rotate(${round(deg)})`}
      d={`M 0 0 C ${round(len * 0.34)} ${-h} ${round(len * 0.74)} ${-h} ${round(len)} 0 C ${round(len * 0.74)} ${h} ${round(len * 0.34)} ${h} 0 0 Z`}
      fill={GREEN}
    />
  )
}

/** A stem. Solid, not dashed — a dashed one at this weight reads as a seam
    rather than as growth. */
function stem(key: string, d: string, w = 2) {
  return <path key={key} d={d} stroke={GREEN} strokeWidth={w} />
}

/** Seed stitch: single knots strewn over the bare cloth, worked in both
    threads. They have to be at close to full strength — a scatter of faint
    grey dots does not read as stitching, it reads as dust on the board, which
    is the one thing a pastel cover cannot afford. */
function scatter(rng: Rng, a: string, b: string, foot: number): ReactNode {
  const dots: ReactNode[] = []
  for (let i = 0; i < 16; i += 1) {
    const x = between(rng, 13, W - 13)
    const y = between(rng, 13, foot - 9)
    dots.push(
      <circle
        key={i}
        cx={round(x)}
        cy={round(y)}
        r={round(between(rng, 0.7, 1.1))}
        fill={i % 2 ? a : b}
      />,
    )
  }
  return (
    <g key="seed" opacity="0.7">
      {dots}
    </g>
  )
}

function emblem(rng: Rng, seed: number, bare: boolean): ReactNode {
  // Indexed by the seed rather than drawn from the stream, the way the shipped
  // families are: adding a fifth arrangement later must not reshuffle the art
  // on every book already on a shelf.
  const kind = EMBLEMS[seed % EMBLEMS.length]
  const { a: hueA, b: hueB } = palette(seed)
  const A = floss(hueA)
  const B = floss(hueB)
  // Where the cloth ends. Normally the type band takes the foot; on a board
  // with no type on it the motif gets the whole field.
  const foot = bare ? H : TYPE_TOP

  // No woven ground: a texture under the threads is what makes cloth read as
  // old, and the board is pale pastel stock now, not linen.
  const ground: ReactNode[] = [
    <g key="frame" stroke={A} opacity="0.4">
      {running('border', `M 7 7 L 93 7 L 93 143 L 7 143 Z`, 0.9, '2.4 2.6')}
    </g>,
    scatter(rng, A, B, foot),
  ]

  // Every arrangement below is drawn against the type-band field, so on a bare
  // board the whole motif is shifted down as one rather than each arrangement
  // carrying a second set of coordinates that could drift out of step.
  const marks: ReactNode[] = []

  if (kind === 'garland') {
    // A quadratic arch with the flowers sitting on it, biggest at the crown.
    const p0 = [17, 84] as const
    // A quadratic only reaches a quarter of the way to its control point, so
    // this sits off the top of the field to put the crown at y≈26.
    const p1 = [MID, -34] as const
    const p2 = [83, 84] as const
    const at = (t: number) => [
      (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0],
      (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1],
    ]
    marks.push(stem('arch', `M ${p0[0]} ${p0[1]} Q ${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`, 2.2))
    // Leaves first so the flowers sit on top of them.
    for (const t of [0.17, 0.38, 0.62, 0.83]) {
      const [x, y] = at(t)
      const [x2, y2] = at(t + 0.02)
      const deg = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI
      marks.push(leaf(`gl${t}`, x, y, deg + (t < 0.5 ? 62 : -62), 13))
    }
    const spots = [
      { t: 0.05, r: 6.6, c: B },
      { t: 0.26, r: 9.6, c: A },
      { t: 0.5, r: 12, c: B },
      { t: 0.74, r: 9.6, c: A },
      { t: 0.95, r: 6.6, c: B },
    ]
    // Buds sit in the gaps between blooms, angled off the arch.
    for (const t of [0.15, 0.4, 0.6, 0.85]) {
      const [x, y] = at(t)
      const [x2, y2] = at(t + 0.02)
      const deg = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI
      marks.push(bud(`gb${t}`, x, y, deg + (t < 0.5 ? -74 : 74), 4.4, t < 0.5 ? A : B))
    }
    for (const { t, r, c } of spots) {
      const [x, y] = at(t)
      marks.push(flower(`gf${t}`, x, y, r, r > 9 ? 6 : 5, c, between(rng, 0, 60)))
    }
  } else if (kind === 'sprig') {
    const foot = 90
    const top = 26
    const bend = round(between(rng, -5, 5))
    marks.push(stem('stalk', `M ${MID} ${foot} Q ${MID + bend} 56 ${MID} ${top}`, 2.2))
    const pairs = intBetween(rng, 3, 4)
    for (let i = 0; i < pairs; i += 1) {
      const t = i / (pairs - 1)
      const y = foot - 8 - t * (foot - top - 22)
      const len = 15 * (1 - t * 0.28)
      for (const side of [-1, 1] as const) {
        marks.push(leaf(`sl${i}${side}`, MID + side * 1.5, y, side === 1 ? -34 : 180 + 34, len))
      }
    }
    // Three heads at the tip, the middle one raised — a stem carries its
    // biggest flower highest.
    marks.push(flower('f0', MID, top - 4, 10, 6, A, between(rng, 0, 60)))
    marks.push(flower('f1', MID - 15, top + 12, 6.6, 5, B, between(rng, 0, 60)))
    marks.push(flower('f2', MID + 15, top + 12, 6.6, 5, B, between(rng, 0, 60)))
    marks.push(bud('b0', MID - 10, top + 26, -38, 4.6, B))
    marks.push(bud('b1', MID + 10, top + 26, 38, 4.6, A))
  } else if (kind === 'wreath') {
    const r = 26
    const cy = 52
    const n = 8
    for (let i = 0; i < n; i += 1) {
      const deg = (360 / n) * i + 22.5
      const rad = (deg * Math.PI) / 180
      marks.push(leaf(`wl${i}`, MID + Math.cos(rad) * (r - 5), cy + Math.sin(rad) * (r - 5), deg, 10))
    }
    for (let i = 0; i < n; i += 1) {
      const deg = (360 / n) * i + 22.5
      const rad = (deg * Math.PI) / 180
      marks.push(bud(`wb${i}`, MID + Math.cos(rad) * (r + 6), cy + Math.sin(rad) * (r + 6), deg + 90, 4, i % 2 ? A : B))
    }
    for (let i = 0; i < n; i += 1) {
      const rad = ((360 / n) * i * Math.PI) / 180
      marks.push(
        flower(`wf${i}`, MID + Math.cos(rad) * r, cy + Math.sin(rad) * r, i % 2 ? 6.4 : 9.4, i % 2 ? 5 : 6, i % 2 ? B : A, between(rng, 0, 60)),
      )
    }
  } else {
    // One large bloom, four small, and leaves in the gaps.
    const cy = 50
    for (let i = 0; i < 6; i += 1) {
      const deg = 60 * i + 30
      const rad = (deg * Math.PI) / 180
      marks.push(leaf(`rl${i}`, MID + Math.cos(rad) * 12, cy + Math.sin(rad) * 12, deg, 15))
    }
    for (let i = 0; i < 4; i += 1) {
      const rad = ((90 * i + 45) * Math.PI) / 180
      marks.push(flower(`rs${i}`, MID + Math.cos(rad) * 25, cy + Math.sin(rad) * 25, 6, 5, B, between(rng, 0, 60)))
    }
    for (let i = 0; i < 4; i += 1) {
      const deg = 90 * i
      const rad = (deg * Math.PI) / 180
      marks.push(bud(`rb${i}`, MID + Math.cos(rad) * 27, cy + Math.sin(rad) * 27, deg + 90, 4.6, B))
    }
    marks.push(flower('rbig', MID, cy, 16, intBetween(rng, 6, 8), A, between(rng, 0, 60)))
  }

  return (
    <>
      {ground}
      <g transform={bare ? `translate(0 ${round((H - TYPE_TOP) / 2)})` : undefined}>{marks}</g>
      {/* The rule the title sits under, worked in the same thread as the
          border. Nothing to divide when there is no title. */}
      {!bare && (
        <g stroke={A} opacity="0.5">
          {running('rule', `M 36 ${TYPE_TOP - 6} L 64 ${TYPE_TOP - 6}`, 0.9, '2.2 2.2')}
        </g>
      )}
    </>
  )
}
export default CoverArt
