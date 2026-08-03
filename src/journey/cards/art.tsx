/* Drawn things, seeded from a keep's own id.

   Nothing in here is a placeholder and nothing here is decorative filler. A
   location card that shows a grey box has told the reader that the app does not
   care about their location; a location card that shows a horizon nobody else's
   copy of that place has is the difference between a record and a keepsake.

   Every drawing takes a seed and is pure: the same keep draws the same picture
   for ever, on every device, with no storage and no network. That is the whole
   reason these are generated rather than fetched — a picture that costs nothing
   and works on a plane. */

/** mulberry32. Small, fast, and — the only property that matters here —
    identical for a given seed on every engine. */
export function rng(seed: number) {
  let s = (Math.abs(Math.trunc(seed)) || 1) >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const n2 = (v: number) => Math.round(v * 10) / 10

type Pt = [number, number]

/** A run of straight segments through a list of corners. The map draws with
    this; the survey draws with the pen below. */
function ruled(pts: Pt[]) {
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${n2(x)} ${n2(y)}`).join(' ')
}

/** One pen stroke between two marks, bowed off the straight line by a fraction
    of a unit. Every segment in the drawn scene goes through here, which is the
    entire reason it reads as a drawing: there is not one straight edge in it. */
function nib(r: () => number, a: Pt, b: Pt, bow: number) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  const off = (r() - 0.5) * bow
  const cx = (a[0] + b[0]) / 2 - (dy / len) * off
  const cy = (a[1] + b[1]) / 2 + (dx / len) * off
  return ` Q ${n2(cx)} ${n2(cy)} ${n2(b[0])} ${n2(b[1])}`
}

/** A run of pen strokes through a list of corners, open or closed. */
function drawn(r: () => number, pts: Pt[], close: boolean, bow: number) {
  let d = `M ${n2(pts[0][0])} ${n2(pts[0][1])}`
  const segments = close ? pts.length : pts.length - 1
  for (let i = 0; i < segments; i += 1) d += nib(r, pts[i], pts[(i + 1) % pts.length], bow)
  return close ? `${d} Z` : d
}

/** A closed loop through the given points, Catmull-Rom converted to cubic.
    Used for contours, which have to be closed and smooth or they read as a
    scribble rather than as ground. */
function loop(points: [number, number][]) {
  const n = points.length
  let d = `M ${n2(points[0][0])} ${n2(points[0][1])}`
  for (let i = 0; i < n; i += 1) {
    const p0 = points[(i - 1 + n) % n]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[(i + 2) % n]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${n2(c1x)} ${n2(c1y)}, ${n2(c2x)} ${n2(c2y)}, ${n2(p2[0])} ${n2(p2[1])}`
  }
  return `${d} Z`
}

interface Mark {
  d: string
  w: number
  o: number
}

/* ── A place ──────────────────────────────────────────────────────────────

   A map, from overhead, with a pin in it.

   What this replaces was a hand-drawn scene — a cottage with a lit window, a
   fence, birds, a moon, every segment bowed off the straight so that nothing
   in it was a diagram. It was the better drawing and the worse answer. A keep
   of this kind is a place inside a book: a house, a road, a country that does
   not exist and that the reader has only ever seen in their own head. A
   picture of it has to invent what it looks like, and it invents it wrong —
   our cottage is not their cottage, and putting ours on the card writes over
   theirs. A map is the one picture of a place that cannot contradict the book,
   because it answers *where* and never claims to answer *what*.

   So: a grid of survey dots, three roads, a piece of water, a few blocks, and
   a pin. Not one mark of it is bowed. The scene was hand-drawn on the argument
   that a diagram is cold, and the pin is the answer to that — the whole
   drawing exists to carry one saturated mark meaning "this spot", and every
   other mark on it is deliberately quiet enough to let that one be seen.

   The seed moves the pin first and then lays the map around it, which is the
   only order that works: a map whose subject has to dodge its own scenery is
   drawn backwards. One keep is one map for ever, and no two match.

   200 × 100 against a plate cut to 2:1, so the sheet is the window and there
   is no crop to design around.

   The marks are built apart from the component that draws them, because they
   are wanted in two places that cannot share a React tree: the card draws them
   live in `currentColor`, and a keep that arrives with a map already attached
   needs that map baked into a standalone file with its colours in it. One
   drawing, two renderers — the alternative is a second map written somewhere
   else that drifts away from this one, which is exactly what was here before.

   Which is why the list below carries the opacities and the stroke widths too,
   and not only the path data. Handing back geometry alone would leave the
   painting recipe written out twice, and a recipe written twice is a recipe
   that is about to disagree with itself. Colour is the one thing left to the
   renderer, because it is the one thing the two genuinely differ on. */

export const PLACE_BOX = { w: 200, h: 100 }

export interface PlaceMark {
  d: string
  /** Fill opacity. Present on filled marks only. */
  fill?: number
  /** Stroke opacity, with `w` for its width. Present on drawn marks only. */
  stroke?: number
  w?: number
  evenodd?: boolean
}

export function placeMarks(seed: number): PlaceMark[] {
  const r = rng(seed)

  /* The pin. Its tip is the point being named, so the tip is what gets placed
     and the head hangs above it — 15 up, which is where a pin's weight sits.
     Kept near the middle of the sheet: a pin in a corner reads as a thing the
     map happened to include rather than as the thing the map is about. */
  const px = 84 + r() * 32
  const tip = 60 + r() * 8
  const head = tip - 15
  const R = 8.2
  const EYE = 3.2
  /* Tangents from the tip to the head, so the shoulders meet the circle
     instead of crossing it. cos of the touch angle is R over the drop, which
     puts the two touch points at ±6.87, 4.48 off the centre. */
  const cos = R / (tip - head)
  const sin = Math.sqrt(1 - cos * cos)
  const pin =
    `M ${n2(px)} ${n2(tip)}` +
    ` L ${n2(px - R * sin)} ${n2(head + R * cos)}` +
    ` A ${R} ${R} 0 1 1 ${n2(px + R * sin)} ${n2(head + R * cos)} Z` +
    /* The eye, as a second subpath under evenodd, so it is a real hole and
       the plate shows through it rather than a disc painted in a colour this
       drawing has no way of knowing. */
    ` M ${n2(px - EYE)} ${n2(head)}` +
    ` A ${EYE} ${EYE} 0 1 0 ${n2(px + EYE)} ${n2(head)}` +
    ` A ${EYE} ${EYE} 0 1 0 ${n2(px - EYE)} ${n2(head)} Z`

  /* The ground: dots on a 12.5 grid, one path rather than a hundred and
     twenty circles. Zero-length subpaths with a round cap are the cheapest
     dot SVG has. The ones that would land inside the eye are dropped — a grid
     dot showing through the hole reads as dirt on the screen, and the dots
     behind the solid part of the pin cost nothing to leave in. */
  let grid = ''
  for (let x = 6.25; x < PLACE_BOX.w; x += 12.5) {
    for (let y = 6.25; y < PLACE_BOX.h; y += 12.5) {
      if (Math.hypot(x - px, y - head) < EYE + 1.6) continue
      grid += `M ${x} ${y} l 0.01 0 `
    }
  }

  /* Roads. One that crosses the whole sheet with a dogleg, one running down
     to meet it, one cutting up from the foot — three is where a set of lines
     stops reading as lines and starts reading as a road network.

     Each is drawn twice: a wide pale band for the road itself and a hairline
     down its middle. The band alone is a smear and the hairline alone is a
     scratch; a map road is both, and it is the one place in this drawing
     where two passes are worth the marks. */
  const hA = 20 + r() * 8
  const dropA = 16 + r() * 8
  const vB = px + 32 + r() * 14
  const roads = [
    ruled([
      [-8, hA],
      [px - 52, hA],
      [px - 28, hA + dropA],
      [208, hA + dropA],
    ]),
    ruled([
      [vB, -8],
      [vB, hA + dropA],
      [px + 22, 108],
    ]),
    ruled([
      [-8, 86 + r() * 8],
      [px - 40, 80],
      [px + 6, 108],
    ]),
  ]

  /* Water, in whichever half the pin left alone. Splined rather than penned:
     a lake with corners is a polygon, and a lake bowed by hand would put the
     one wobbling line on a sheet where nothing else wobbles. */
  const wx = px > 100 ? 30 : 168
  const wy = 22 + r() * 12
  const shore: Pt[] = []
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2
    const rr = 1 + (r() - 0.5) * 0.36
    shore.push([wx + Math.cos(a) * 21 * rr, wy + Math.sin(a) * 12 * rr])
  }
  const water = loop(shore)

  /* Blocks — built ground, the thing that makes the rest of it a town rather
     than open country. Any that would sit under the pin are dropped instead
     of nudged: a map with a hole in exactly the shape of its own subject is
     worse than a map with three blocks in it instead of five. */
  const blocks: string[] = []
  for (let i = 0; i < 6; i += 1) {
    const bw = 11 + r() * 15
    const bh = 7 + r() * 8
    const bx = px - 66 + r() * 128
    const by = 26 + r() * 50
    if (Math.abs(bx + bw / 2 - px) < 26 && Math.abs(by + bh / 2 - head) < 28) continue
    if (Math.hypot(bx + bw / 2 - wx, by + bh / 2 - wy) < 26) continue
    blocks.push(`M ${n2(bx)} ${n2(by)} h ${n2(bw)} v ${n2(bh)} h ${n2(-bw)} Z`)
  }

  /* What stops the pin looking pasted on: something under it that agrees it is
     standing on the map rather than lying on the glass. Two arcs rather than an
     <ellipse>, so every mark in this drawing is the same kind of thing and both
     renderers only ever need to know how to paint a path. */
  const shadow =
    `M ${n2(px - 5)} ${n2(tip)}` +
    ` A 5 1.6 0 1 0 ${n2(px + 5)} ${n2(tip)}` +
    ` A 5 1.6 0 1 0 ${n2(px - 5)} ${n2(tip)} Z`

  /* Back to front. The grid is the ground, the water and the built blocks lie
     on it, the roads run over both, and the pin stands on all of it. */
  return [
    { d: grid, stroke: 0.3, w: 1 },
    { d: water, fill: 0.16 },
    ...blocks.map((d) => ({ d, fill: 0.17 })),
    ...roads.map((d, i) => ({ d, stroke: 0.1, w: i ? 5 : 7 })),
    ...roads.map((d, i) => ({ d, stroke: i ? 0.24 : 0.3, w: i ? 0.9 : 1.1 })),
    { d: shadow, fill: 0.2 },
    { d: pin, fill: 1, evenodd: true },
  ]
}

export function Place({ seed, className }: { seed: number; className?: string }) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${PLACE_BOX.w} ${PLACE_BOX.h}`}
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {placeMarks(seed).map((m, i) => (
          <path
            key={i}
            d={m.d}
            fill={m.fill === undefined ? 'none' : 'currentColor'}
            fillOpacity={m.fill}
            fillRule={m.evenodd ? 'evenodd' : undefined}
            strokeWidth={m.w}
            strokeOpacity={m.stroke ?? 0}
          />
        ))}
      </g>
    </svg>
  )
}

/* ── A person ─────────────────────────────────────────────────────────────

   A drawn bust: head, hair, neck, shoulders, a collar, and two closed eyes.

   Three things have stood here. A generic account glyph, which said nothing.
   Twelve cut-paper silhouettes picked from a grid, which were solid black
   shapes that differed only at the crown — the reader was asked to choose
   between drawings they could not tell apart, and the ones they could tell
   apart were not in the app's hand. And then a stamped initial, which was
   nobody's idea but mine: I removed the picture rather than draw a better one
   and wrote a long argument for why a letter was the honest answer. It was not
   asked for and it is not what a character card is for. A row that reads
   "B — Aunt Bel" has said the name twice and shown the person nought times.

   So this is a person, drawn the way everything else in this file is drawn:
   penned, seeded, and bowed off the straight, so it belongs beside the map on
   a location card rather than looking imported. Ink line on the plate, not a
   silhouette filled solid — a filled head at 46px is a shape, and a drawn one
   is a drawing.

   On the face. The old argument was that a picture of a face claims a face,
   and Aunt Bel already has one in the reader's head. That much is true, and it
   is why there is no mouth, no nose and no brow here: those are where an
   expression lives, and an expression is a claim about a person the book has
   already made. What is left is two closed lids — enough that the head reads
   as a person rather than a mannequin, and not enough to say what kind. A
   drawing can be human without being a portrait, and that is the line this
   sits on.

   What varies, all from the name: seven hair shapes, head width and height,
   the tilt of the whole head, shoulder width on each side independently, three
   collars, and whether the ears show. Two characters would have to collide on
   every one of those to look alike, which is why nobody has to pick anything —
   a reader who typed the name has already drawn the picture.

   100 × 122 is the journey card's 46 × 56 mount, so the figure sits at the
   same fraction of its plate wherever it is mounted. */

export const FACE_BOX = { w: 100, h: 122 }

/* The box the figure is *drawn* in and the box it is *shown* in are not the
   same. Drawing wants slack — a bun stands above the crown, shoulders run off
   the foot — while a portrait plate wants the head to fill it. Measured across
   two dozen names the crown lands near y=16 and never above 4, so a view that
   starts at 4 and keeps 107 of the 122 puts the head where a medallion puts a
   head and lets the plate's own edge finish the shoulders. Kept next to the
   drawing box because anything that rasterises these needs both. */
export const FACE_VIEW = { x: 6, y: 4, w: 88, h: 107 }

/* Hair, as seven parameter sets rather than seven hand-built shapes. Every one
   of them is the same closed ring — up one side, over the crown, down the
   other, then back inside the mass and across the brow — and the seven differ
   only in the six numbers below. That is deliberate: seven shapes drawn by
   hand would be seven different draughtsmen, and what makes these read as one
   app's drawing is that they are one drawing with the dials moved.

   Every measure is in head half-widths or half-heights, never pixels, so the
   hair grows with the head it is on rather than sitting on it like a hat.

     stop    how far up the sides the mass ends, as a fraction of the quarter
             turn. 0 carries it past the ear; 0.16 finishes it well above one.
     side    how far the sides hang below the eye line. 0 or less means they do
             not hang at all and the two `out` numbers go unused.
     out     how far the hanging tips stand off the head. Above `grow` the
             silhouette flares toward the jaw, which is what a bob does.
     grow    how far the mass stands off the skull everywhere else.
     lift    extra height at the crown, in px, for volume that is not width.
     fringe  where the hairline crosses the middle of the brow, read upward: a
             big number is a high forehead and a small one is a fringe worn low.
     temple  the same, at the temples. Below `fringe` the hairline arcs the way
             most do; above it, the two corners are cut back and what is left in
             the middle is a widow's peak. That one number is the whole
             difference between a full head of hair and a receding one. It has
             a ceiling near 0.70: the return runs at 0.7 head-widths out, where
             the outside of the mass sits about 0.72 up, and a temple above
             that puts the inside of the shape outside it. The ring then
             crosses itself and the corners render as two spikes. */
const HAIR = [
  /* Cropped   */ { stop: 0.06, side: 0, out: 1, grow: 1.05, lift: 0, fringe: 0.5, temple: 0.42, ears: true },
  /* Bob       */ { stop: 0, side: 0.72, out: 1.08, grow: 1.08, lift: 1, fringe: 0.42, temple: 0.34, ears: false },
  /* Long      */ { stop: 0, side: 1.24, out: 1.06, grow: 1.08, lift: 1, fringe: 0.38, temple: 0.32, ears: false },
  /* Gathered  */ { stop: 0.14, side: 0, out: 1, grow: 1.04, lift: 0, fringe: 0.52, temple: 0.44, ears: true },
  /* Curled    */ { stop: 0, side: 0.34, out: 1.1, grow: 1.16, lift: 3, fringe: 0.44, temple: 0.36, ears: false },
  /* Swept     */ { stop: 0.02, side: 0, out: 1, grow: 1.09, lift: 2, fringe: 0.26, temple: 0.44, ears: true },
  /* Receding  */ { stop: 0.16, side: 0, out: 1, grow: 1.02, lift: 0, fringe: 0.44, temple: 0.66, ears: true },
]

export function faceMarks(seed: number): PlaceMark[] {
  const r = rng(seed)
  const H = FACE_BOX.h

  /* An arch between two marks a fixed amount, rather than a random one. The
     pen above bows every stroke by an amount it makes up, which is right for
     scenery and wrong for a lid: an eye that curves up on one face and down on
     another is not two people, it is one person and one mistake. */
  const arch = (a: Pt, b: Pt, lift: number) =>
    `M ${n2(a[0])} ${n2(a[1])} Q ${n2((a[0] + b[0]) / 2)} ${n2((a[1] + b[1]) / 2 - lift)} ${n2(b[0])} ${n2(b[1])}`

  /* The head. An ellipse would be a balloon, so the lower half narrows into a
     jaw — the taper only applies where sin is positive, which is the half
     below the eye line. Splined, never penned corner to corner: sixteen pen
     strokes round a head is a sixteen-sided polygon, and the seed's small
     jitter on each radius is what keeps it from being a perfect one. */
  const cx = 50 + (r() - 0.5) * 3
  const cy = 50
  const hw = 23 + r() * 7
  const hh = 27 + r() * 7
  /* The jaw is its own number, not a constant. Width and height alone give
     large and small heads of one shape; a separate taper is what separates a
     round face from a narrow one at the same size, and it is the difference
     the eye actually reads at 46px. */
  const jawCut = 0.1 + r() * 0.18
  const headPts: Pt[] = []
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2
    const jaw = 1 - jawCut * Math.max(0, Math.sin(a))
    const j = 0.985 + r() * 0.03
    headPts.push([cx + Math.cos(a) * hw * jaw * j, cy + Math.sin(a) * hh * j])
  }
  const head = loop(headPts)

  /* Neck and shoulders. The garment is closed across the neckline rather than
     under the chin, so its wash never runs over the face — the neck itself is
     two lines and no fill, which is also how it is drawn on paper.

     The two shoulders are drawn from separate numbers. A bust built off one
     half-width mirrored is a symmetrical object, and a symmetrical object is
     the thing that made the twelve silhouettes read as clip art. */
  const jawY = cy + hh * 0.72
  const neck = hw * 0.4
  const top = cy + hh + 9 + r() * 5
  const shL = 40 + r() * 9
  const shR = 40 + r() * 9
  const garment = loop([
    [cx - neck, top - 4],
    [cx - neck - 12, top + 3],
    [cx - shL, top + 15],
    [cx - shL - 8, H + 8],
    [cx + shR + 8, H + 8],
    [cx + shR, top + 15],
    [cx + neck + 12, top + 3],
    [cx + neck, top - 4],
    /* The neckline needs its own middle point. Closing a spline straight from
       one shoulder's inner corner to the other reverses direction against two
       neighbours that both sit lower, and the curve answers by looping — a
       small bow tie under the chin on every figure. Scooping it deliberately
       gives the spline somewhere to go. */
    [cx, top - 1],
  ])
  /* The neck lands exactly on the neckline's own corner. Everything at the
     throat — two neck lines, the neckline, the collar — has to *meet* rather
     than cross: three shapes that each pass through each other draw an X under
     the chin, which is what the first pass did on every high-collared figure. */
  const necks = [
    drawn(
      r,
      [
        [cx - hw * 0.56, jawY],
        [cx - neck, top - 4],
      ],
      false,
      1.2,
    ),
    drawn(
      r,
      [
        [cx + hw * 0.56, jawY],
        [cx + neck, top - 4],
      ],
      false,
      1.2,
    ),
  ]

  /* The collar. Three, because it is the one part of a person that is a
     *choice* rather than a fact about them, and three visibly different
     choices is enough for the row of cards to look like a row of people who
     dressed themselves. */
  const collar: string[] = []
  const kollar = Math.floor(r() * 3)
  if (kollar === 0) {
    collar.push(
      drawn(
        r,
        [
          [cx - 13, top + 1],
          [cx, top + 16],
          [cx + 13, top + 1],
        ],
        false,
        1,
      ),
    )
  } else if (kollar === 1) {
    collar.push(
      drawn(
        r,
        [
          [cx - 14, top - 1],
          [cx - 4, top + 14],
        ],
        false,
        0.8,
      ),
      drawn(
        r,
        [
          [cx + 14, top - 1],
          [cx + 4, top + 14],
        ],
        false,
        0.8,
      ),
    )
  } else {
    /* A collar standing up, as two strokes that start on the neckline's own
       corners and rise. Drawn as one band across the throat it has to cross
       the neckline twice to get there, and two crossings is the X again. */
    collar.push(
      drawn(
        r,
        [
          [cx - neck, top - 4],
          [cx - neck - 4, top - 13],
        ],
        false,
        0.9,
      ),
      drawn(
        r,
        [
          [cx + neck, top - 4],
          [cx + neck + 4, top - 13],
        ],
        false,
        0.9,
      ),
    )
  }

  const kind = Math.floor(r() * HAIR.length)
  const hair = HAIR[kind]
  /* A parting, and for the swept style a deliberate one rather than a wobble.
     It moves the crown's high point and the hairline's low point together,
     which is what a parting actually does to a silhouette. */
  const part = kind === 5 ? (r() < 0.5 ? -1 : 1) * hw * 0.3 : (r() - 0.5) * hw * 0.12
  const curl = kind === 4
  const g = hair.grow
  const hangs = hair.side > 0
  const sideY = cy + hh * hair.side

  /* The outside of the mass, swept from one side of the head to the other
     rather than hit at four fixed points. Sweeping it means `stop` can end the
     arc early — that one number is a crop finishing above the ear instead of
     carrying on past it, and no other style has to know about it.

     Curls are the other thing the sweep buys. Nine steps with alternating
     radii and a spline through them is a scalloped edge; five steps and no
     wobble is a smooth one. Nobody draws a curl here; the ring is just lumpy,
     and lumpy at 46px is unmistakably not straight hair. */
  const start = Math.PI * (1 + hair.stop)
  const span = Math.PI * (1 - hair.stop * 2)
  const steps = curl ? 9 : 5
  const ring: Pt[] = []
  if (hangs) ring.push([cx - hw * hair.out, sideY])
  for (let i = 0; i < steps; i += 1) {
    const t = i / (steps - 1)
    const a = start + t * span
    const wob = curl ? (i % 2 ? -0.08 : 0.1) : 0
    ring.push([
      cx + Math.cos(a) * hw * g * (1 + wob) + part * 0.5 * Math.sin(t * Math.PI),
      cy + Math.sin(a) * hh * g * (1 + wob) - hair.lift * Math.sin(t * Math.PI),
    ])
  }
  if (hangs) ring.push([cx + hw * hair.out, sideY])

  /* And the inside, coming back: up the far side hugging the skull, across the
     brow, down the near side. Without these the ring closed straight from one
     temple to the opposite tip, and on the long styles that shortcut ran
     diagonally across the throat — two hanging curtains and an X under the
     chin where no hair is. The return is also what gives a curtain a
     thickness, so it tapers to a tip instead of ending as a bare line. */
  const outTip = hangs ? sideY : cy + Math.sin(start) * hh * g
  const inTip = outTip - (hangs ? 9 : 5)
  const browY = cy - hh * hair.temple
  const cheek = (inTip + browY) / 2
  ring.push(
    [cx + hw * (hangs ? 0.72 : 0.84), inTip],
    [cx + hw * 0.84, cheek],
    [cx + hw * 0.7, browY],
    [cx + part, cy - hh * hair.fringe],
    [cx - hw * 0.7, browY],
    [cx - hw * 0.84, cheek],
    [cx - hw * (hangs ? 0.72 : 0.84), inTip],
  )
  const mane = loop(ring)

  /* Gathered up: the knot is a second closed shape rather than a bump on the
     ring, because a bump big enough to read as a bun deforms the crown under
     it and the head stops looking like a head. */
  const knotPts: Pt[] = []
  for (let i = 0; i < 9; i += 1) {
    const a = (i / 9) * Math.PI * 2
    knotPts.push([
      cx + hw * 0.26 + Math.cos(a) * 8 * (0.88 + r() * 0.24),
      cy - hh * 1.14 + Math.sin(a) * 7.4 * (0.88 + r() * 0.24),
    ])
  }
  const knot = kind === 3 ? loop(knotPts) : ''

  const ears = hair.ears
    ? `M ${n2(cx - hw * 0.97)} ${n2(cy - 5)} Q ${n2(cx - hw * 0.97 - 5)} ${n2(cy)} ${n2(cx - hw * 0.97)} ${n2(cy + 5)}` +
      ` M ${n2(cx + hw * 0.97)} ${n2(cy - 5)} Q ${n2(cx + hw * 0.97 + 5)} ${n2(cy)} ${n2(cx + hw * 0.97)} ${n2(cy + 5)}`
    : ''

  /* Two closed lids on the eye line, and a nose. No mouth: see the note above,
     a mouth is an expression and an expression is the book's to give. A nose is
     not an expression, it is a fact about a face, and without one the lower two
     thirds of every head is blank — which is what made the first pass read as
     two dozen masks rather than two dozen people.

     Every measure here is seeded. Hair and outline were carrying the whole
     difference between one name and the next while the face itself was a
     constant, and a constant face is the thing the eye actually recognises: set
     wide-apart small eyes beside close-set long ones and the two read as
     different people before either haircut registers. */
  const ex = hw * (0.34 + r() * 0.12)
  const ey = cy + 1 + r() * 4
  const ew = 3.4 + r() * 1.8
  const lid = 1.3 + r() * 1.2
  const eyes =
    `${arch([cx - ex - ew, ey], [cx - ex + ew, ey], lid)} ${arch([cx + ex - ew, ey], [cx + ex + ew, ey], lid)}`
  /* The nose as the one stroke that reads at 46px: down the near side, round
     the tip, out to a nostril. The bridge is invisible at this size and a full
     outline turns into a blob.

     It has to be lopsided. Drawn symmetrically — two ends level, the control
     point below both — the eye reads the curve as a mouth, and twenty-four
     people all smiling politely is worse than twenty-four blanks. Starting high
     on one side and finishing low on the other is the whole difference. */
  const nx = cx + part * 0.2
  const noseY = ey + hh * (0.26 + r() * 0.08)
  const noseW = 2.2 + r() * 1.4
  const nose = `M ${n2(nx)} ${n2(noseY - 4.5)} Q ${n2(nx - noseW)} ${n2(noseY)} ${n2(nx + noseW * 0.9)} ${n2(noseY - 0.4)}`

  /* Back to front, and the hair goes on *after* the head rather than behind
     it: the fringe crosses the forehead, so it has to be able to tint it. */
  return [
    { d: garment, fill: 0.1 },
    { d: garment, stroke: 0.42, w: 1.6 },
    ...collar.map((d) => ({ d, stroke: 0.4, w: 1.3 })),
    ...necks.map((d) => ({ d, stroke: 0.4, w: 1.5 })),
    ...(ears ? [{ d: ears, stroke: 0.36, w: 1.3 }] : []),
    { d: head, stroke: 0.6, w: 1.7 },
    { d: mane, fill: 0.24 },
    { d: mane, stroke: 0.55, w: 1.6 },
    ...(knot ? [{ d: knot, fill: 0.24 }, { d: knot, stroke: 0.55, w: 1.6 }] : []),
    { d: eyes, stroke: 0.72, w: 1.7 },
    { d: nose, stroke: 0.5, w: 1.4 },
  ]
}

export function Portrait({ seed, className }: { seed: number; className?: string }) {
  return (
    <svg
      className={className}
      viewBox={`${FACE_VIEW.x} ${FACE_VIEW.y} ${FACE_VIEW.w} ${FACE_VIEW.h}`}
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {faceMarks(seed).map((m, i) => (
          <path
            key={i}
            d={m.d}
            fill={m.fill === undefined ? 'none' : 'currentColor'}
            fillOpacity={m.fill}
            strokeWidth={m.w}
            strokeOpacity={m.stroke ?? 0}
          />
        ))}
      </g>
    </svg>
  )
}

/* ── A survey ─────────────────────────────────────────────────────────────

   The same instinct as the place scene, from directly overhead: a map made of
   the things a map is made of, not a field of contour rings. A lake with its
   shore shaded, the river feeding it, a lane running in with a hamlet strung
   along it and a church with a spire, a wood of individual little trees, field
   boundaries, and a north point. Every one of those is a symbol a reader has
   seen on a real map, which is what lets a 40mm picture say "somewhere" rather
   than "some data".

   Hand-ruled, like the scene: the grid wavers, the shore does not close
   tidily, and the wash under each shape is drawn a second time so it sits a
   hair off its own outline.

   200×130, and that number is load-bearing. The plate's window is 190px tall
   against roughly 315 wide, so a square drawing sliced into it loses the top
   and bottom fifths — which cost the first version its north point and half
   its lake. The sheet is now cut to the window it goes in, and everything
   worth seeing lives between y 6 and y 124.

   The marks are built apart from the renderer around them because they are
   wanted in two places that cannot share a React tree: the plate draws them as
   live SVG in `currentColor`, and a pinned map has to be baked into a
   standalone file with its colours already in it. There was a second, much
   worse map living in the seed for exactly that reason — five wavy lines and a
   dashed track, no lane, no buildings, nothing a reader could point at — and a
   drawing this app already knows how to make had no business being redrawn
   badly somewhere else. */

export const SURVEY_BOX = { w: 200, h: 130 }

export function surveyMarks(seed: number) {
  const r = rng(seed)
  const ink: Mark[] = []
  const wash: { d: string; o: number }[] = []

  const line = (pts: Pt[], w = 1.1, o = 0.5, bow = 1.4) =>
    ink.push({ d: drawn(r, pts, false, bow), w, o })
  const shape = (pts: Pt[], fill = 0, w = 1.1, o = 0.58, bow = 0.6) => {
    const d = drawn(r, pts, true, bow)
    if (fill) wash.push({ d: drawn(r, pts, true, bow), o: fill })
    ink.push({ d, w, o })
  }
  const ring = (cx: number, cy: number, rad: number, squash = 1) => {
    const pts: Pt[] = []
    for (let i = 0; i < 11; i += 1) {
      const a = (i / 11) * Math.PI * 2
      const rr = rad * (0.82 + r() * 0.36)
      pts.push([cx + Math.cos(a) * rr * squash, cy + Math.sin(a) * rr])
    }
    return pts
  }
  /* Anything round is splined, never penned corner-to-corner: a field or a
     tree crown built from eleven pen strokes is an eleven-sided polygon, and
     polygons are what made the first pass look computed. */
  const round = (
    cx: number,
    cy: number,
    rad: number,
    squash: number,
    fill: number,
    w = 1,
    o = 0.52,
  ) => {
    if (fill) wash.push({ d: loop(ring(cx, cy, rad, squash)), o: fill })
    ink.push({ d: loop(ring(cx, cy, rad, squash)), w, o })
  }

  /* A ruled sheet, by hand. The old grid was mechanically straight, which is
     the one thing that told you no person had drawn any of this. */
  for (let i = 1; i * 29 < 130; i += 1) line([[-6, i * 29], [206, i * 29]], 0.7, 0.09, 2.6)
  for (let i = 1; i < 7; i += 1) line([[i * 29, -6], [i * 29, 136]], 0.7, 0.09, 2.6)

  /* Which side the water takes. Everything else is then placed against it
     rather than scattered, because a map whose features land wherever the
     seed drops them is a texture, and a texture is what this was before. */
  const waterLeft = r() < 0.5

  /* Water: a lake shaded just inside its own shore the way an inked map
     shades water, with the river that feeds it running off the top edge. It
     sits at mid-height, not at the foot: the plate's title scrim darkens the
     bottom third, and the largest feature on the sheet disappearing into a
     gradient is how the first pass lost its lake. */
  const lx = waterLeft ? 40 + r() * 16 : 144 + r() * 16
  const ly = 76 + r() * 10
  const lr = 15 + r() * 6
  const shore = ring(lx, ly, lr, 1.28)
  const lake = loop(shore)
  wash.push({ d: lake, o: 0.12 })
  ink.push({ d: lake, w: 1.5, o: 0.56 })
  for (let k = 1; k <= 2; k += 1) {
    const inset = 1 - k * 0.07
    ink.push({
      d: loop(shore.map(([x, y]) => [lx + (x - lx) * inset, ly + (y - ly) * inset] as Pt)),
      w: 0.8,
      o: 0.2 - k * 0.05,
    })
  }
  const rvX = lx + (r() - 0.5) * 34
  ink.push({
    d: `M ${n2(rvX)} ${n2(ly - lr * 0.85)} C ${n2(rvX - 22)} ${n2(ly - 44)}, ${n2(
      rvX + 26,
    )} ${n2(ly - 76)}, ${n2(rvX - 10)} -8`,
    w: 2.1,
    o: 0.32,
  })

  /* Fields. Two things were wrong with these before. They were splined, so
     three enclosures came out as three soap bubbles floating over the map —
     a hedge is a straightish run with a corner where it meets the next one,
     and rounding it is the one thing that cannot happen. And they were
     scattered by the seed, so nothing on the sheet was near anything else.
     Farmland is not loose shapes; it is a patchwork, cells sharing their
     boundaries, which is why the posts along the top and bottom are drawn
     once and handed to both neighbours. Upper left, where the lane has not
     reached and the compass is not standing. */
  const roadY = 34 + r() * 22
  const bend = r() * 22
  const fieldTop: Pt[] = []
  const fieldFoot: Pt[] = []
  for (let k = 0; k < 4; k += 1) {
    const cx = 16 + k * 20 + (r() - 0.5) * 3
    fieldTop.push([cx, 14 + (r() - 0.5) * 5])
    fieldFoot.push([cx + (r() - 0.5) * 3, 33 + (r() - 0.5) * 5])
  }
  for (let k = 0; k < 3; k += 1) {
    shape(
      [fieldTop[k], fieldTop[k + 1], fieldFoot[k + 1], fieldFoot[k]],
      k === 1 ? 0.05 : 0,
      0.85,
      0.3,
      1.4,
    )
  }

  /* The lane, drawn as a road is drawn: two lines a whisker apart. */
  const lane = (off: number) =>
    `M -8 ${n2(roadY + 30 + off)} C 46 ${n2(roadY + off - 6 + bend)}, 132 ${n2(
      roadY + off + 12 - bend,
    )}, 208 ${n2(roadY + off - 24)}`
  ink.push({ d: lane(0), w: 1.1, o: 0.48 })
  ink.push({ d: lane(5.5), w: 1.1, o: 0.48 })

  /* The wood: individual trees, not a hatched blob. Nine of them, two kinds,
     scattered rather than gridded. */
  const wx = waterLeft ? 130 + r() * 34 : 36 + r() * 34
  const wy = 84 + r() * 14
  for (let i = 0; i < 9; i += 1) {
    const tx = wx + (r() - 0.5) * 54
    const ty = wy + (r() - 0.5) * 30
    const sz = 6 + r() * 3
    if (Math.hypot(tx - lx, (ty - ly) / 1.2) < lr * 1.1) continue
    line([[tx, ty], [tx, ty - sz * 0.45]], 1, 0.46, 0.2)
    if (r() < 0.5) {
      shape(
        [
          [tx - sz * 0.6, ty - sz * 0.35],
          [tx, ty - sz * 1.55],
          [tx + sz * 0.6, ty - sz * 0.35],
        ],
        0.18,
        1,
        0.52,
        0.5,
      )
    } else {
      round(tx, ty - sz, sz * 0.62, 1, 0.18, 1, 0.52)
    }
  }

  /* The hamlet, strung along the lane, with the church at its centre — the
     one building on any map that is drawn rather than blocked in. */
  const hx = 96 + (r() - 0.5) * 46
  const hy = roadY + 14 + (r() - 0.5) * 12
  const house = (px: number, py: number, sz: number) => {
    shape(
      [
        [px - sz, py],
        [px - sz, py - sz * 1.1],
        [px + sz, py - sz * 1.1],
        [px + sz, py],
      ],
      0.2,
      1,
      0.6,
      0.4,
    )
    shape(
      [
        [px - sz * 1.3, py - sz * 1.1],
        [px, py - sz * 2.1],
        [px + sz * 1.3, py - sz * 1.1],
      ],
      0.3,
      1,
      0.62,
      0.4,
    )
  }
  for (let i = 0; i < 4; i += 1) {
    const px = hx - 34 + i * 22 + (r() - 0.5) * 8
    if (Math.abs(px - hx) < 12) continue
    house(px, hy + (r() - 0.5) * 14, 3.6 + r() * 1.4)
  }
  const cs = 4.2
  shape(
    [
      [hx - cs * 1.5, hy],
      [hx - cs * 1.5, hy - cs * 1.2],
      [hx + cs * 0.5, hy - cs * 1.2],
      [hx + cs * 0.5, hy],
    ],
    0.2,
    1,
    0.62,
    0.4,
  )
  shape(
    [
      [hx - cs * 1.8, hy - cs * 1.2],
      [hx - cs * 0.5, hy - cs * 2.1],
      [hx + cs * 0.8, hy - cs * 1.2],
    ],
    0.3,
    1,
    0.64,
    0.4,
  )
  shape(
    [
      [hx + cs * 0.5, hy],
      [hx + cs * 0.5, hy - cs * 2],
      [hx + cs * 1.6, hy - cs * 2],
      [hx + cs * 1.6, hy],
    ],
    0.24,
    1,
    0.64,
    0.4,
  )
  shape(
    [
      [hx + cs * 0.3, hy - cs * 2],
      [hx + cs * 1.05, hy - cs * 3.4],
      [hx + cs * 1.8, hy - cs * 2],
    ],
    0.32,
    1,
    0.66,
    0.4,
  )
  line([[hx + cs * 1.05, hy - cs * 3.4], [hx + cs * 1.05, hy - cs * 4.3]], 1, 0.6, 0.2)
  line([[hx + cs * 0.65, hy - cs * 3.95], [hx + cs * 1.45, hy - cs * 3.95]], 1, 0.6, 0.2)

  /* North, as a point rather than a letter. */
  const np: Pt = [176, 26]
  const ns = 9
  wash.push({
    d: drawn(
      r,
      [
        [np[0], np[1] - ns],
        [np[0] + ns * 0.3, np[1]],
        [np[0] - ns * 0.3, np[1]],
      ],
      true,
      0.3,
    ),
    o: 0.5,
  })
  shape(
    [
      [np[0], np[1] - ns],
      [np[0] + ns * 0.3, np[1]],
      [np[0], np[1] + ns],
      [np[0] - ns * 0.3, np[1]],
    ],
    0,
    1,
    0.5,
    0.3,
  )
  round(np[0], np[1], ns * 1.5, 1, 0, 0.9, 0.28)

  return { ink, wash }
}

export function Survey({ seed, className }: { seed: number; className?: string }) {
  const { ink, wash } = surveyMarks(seed)
  return (
    <svg
      className={className}
      viewBox={`0 0 ${SURVEY_BOX.w} ${SURVEY_BOX.h}`}
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
    >
      {wash.map((m, i) => (
        <path key={`w${i}`} d={m.d} fill="currentColor" fillOpacity={m.o} stroke="none" />
      ))}
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {ink.map((m, i) => (
          <path key={`i${i}`} d={m.d} strokeWidth={m.w} strokeOpacity={m.o} />
        ))}
      </g>
    </svg>
  )
}

/* ── A waveform ───────────────────────────────────────────────────────────
   The one drawing that is not a picture of anything: it is a reading of the
   recording's own shape. Seeded so a memo looks like itself every time it is
   scrolled past — a re-rolled waveform makes the same recording look like a
   different one, which quietly tells the reader nothing here is really theirs. */

export function waveBars(seed: number, count: number) {
  const r = rng(seed)
  return Array.from({ length: count }, (_, i) => {
    /* Enveloped rather than flat noise: speech starts, swells and trails, and
       an even hedge of bars reads as a loading state. */
    const t = i / (count - 1)
    const envelope = 0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, t * 1.15))
    return Math.max(0.12, Math.min(1, envelope * (0.45 + r() * 0.75)))
  })
}
