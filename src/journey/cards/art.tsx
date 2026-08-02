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

/** A ridge line across the frame. Cubic with horizontal control handles: hills
    that sit down rather than zig-zag, which is what separates a landscape from
    a chart. */
function crest(points: Pt[]) {
  let d = `M ${n2(points[0][0])} ${n2(points[0][1])}`
  for (let i = 1; i < points.length; i += 1) {
    const [px, py] = points[i - 1]
    const [x, y] = points[i]
    const half = (x - px) / 2
    d += ` C ${n2(px + half)} ${n2(py)}, ${n2(x - half)} ${n2(y)}, ${n2(x)} ${n2(y)}`
  }
  return d
}

/** The same ridge, closed down to its foot so it fills. */
function ridge(points: Pt[], floor: number) {
  const last = points[points.length - 1]
  return `${crest(points)} L ${n2(last[0])} ${floor} L ${n2(points[0][0])} ${floor} Z`
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

/* ── A place ──────────────────────────────────────────────────────────────

   What this replaces was a gradient sky, a soft disc and three filled humps,
   and the only thing it said was "no image available, here is some scenery".
   Nobody looks at somewhere they wrote down and pictures an abstract hill.

   So this is a drawing of a place, built out of things that exist: a cottage
   with a chimney and a lit window, or a tower, a barn, a row of houses, a
   lighthouse, a bridge over water — with trees, a fence, a track coming up to
   the door, birds, and a moon. Nothing in it is a texture or a gradient. Every
   mark is a component of a scene, and the seed picks which components and
   where they stand, so one keep is one place for ever and no two places match.

   It is drawn by hand in the only sense a program can manage: there is not one
   straight edge in it. Every segment is a quadratic bowed off the line by a
   fraction of a unit, and the pale washes are laid in from a second pass that
   does not quite agree with the outline it fills. That disagreement is the
   whole difference between line art and a diagram.

   Landscape, drawn to be cropped: 200×100 on a postcard and shallower in a
   margin, one picture at two heights rather than two drawings. Everything that
   matters lives between y 10 and y 96 so no crop can behead it. */

interface Mark {
  d: string
  w: number
  o: number
}

export function Place({ seed, className }: { seed: number; className?: string }) {
  const r = rng(seed)
  const ink: Mark[] = []
  const wash: { d: string; o: number }[] = []
  const G = 80

  const line = (pts: Pt[], w = 1.3, o = 0.7, bow = 1.1) =>
    ink.push({ d: drawn(r, pts, false, bow), w, o })
  const shape = (pts: Pt[], fill = 0, w = 1.3, o = 0.78, bow = 1) => {
    const d = drawn(r, pts, true, bow)
    if (fill) wash.push({ d: drawn(r, pts, true, bow), o: fill })
    ink.push({ d, w, o })
  }
  const box = (x: number, y: number, bw: number, bh: number, fill = 0, o = 0.78) =>
    shape(
      [
        [x, y + bh],
        [x, y],
        [x + bw, y],
        [x + bw, y + bh],
      ],
      fill,
      1.3,
      o,
      0.8,
    )
  /* Round things go through Catmull-Rom, not through the pen. A ring of
     jittered points joined by pen strokes is a polygon however small the bow
     is, and a nine-sided moon is the one shape on the card that announces it
     was computed. The jitter still supplies the wobble; the spline only stops
     it having corners. The wash re-rolls, so it sits a hair off its outline
     like everything else here. */
  const blob = (cx: number, cy: number, rad: number, sides: number) => {
    const pts: Pt[] = []
    for (let i = 0; i < sides; i += 1) {
      const a = (i / sides) * Math.PI * 2
      const rr = rad * (0.86 + r() * 0.28)
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
    }
    return pts
  }
  const round = (cx: number, cy: number, rad: number, fill: number, w = 1.2, o = 0.7) => {
    wash.push({ d: loop(blob(cx, cy, rad, 9)), o: fill })
    ink.push({ d: loop(blob(cx, cy, rad, 9)), w, o })
  }

  /* Land first, so everything else stands on it. Two ranges at most: a third
     is haze, and haze is what the old drawing was made of. */
  const ranges = 1 + Math.round(r())
  for (let i = 0; i < ranges; i += 1) {
    const base = G - 17 + i * 8
    const pts: Pt[] = []
    for (let x = -16; x <= 216; x += 40 + i * 12) pts.push([x, base - (7 + i * 3) * r()])
    wash.push({ d: ridge(pts, G + 1), o: 0.08 + i * 0.05 })
    ink.push({ d: crest(pts), w: 1, o: 0.26 + i * 0.1 })
  }

  /* The building, and the seed's one real decision. It stands a little off
     centre because a house in the middle of the frame is a diagram of a house. */
  const kind = Math.floor(r() * 6)
  const ax = 76 + r() * 54
  const aw = 30 + r() * 13
  const ah = 24 + r() * 11
  const x0 = ax - aw / 2

  if (kind === 0) {
    /* A cottage. Body, pitched roof, chimney on the near slope, a door and a
       lit window — the five parts a child draws, which is exactly why it is
       readable at thumb size. */
    box(x0, G - ah, aw, ah, 0.1)
    shape(
      [
        [x0 - 5, G - ah],
        [ax, G - ah * 1.6],
        [x0 + aw + 5, G - ah],
      ],
      0.2,
      1.4,
      0.82,
      1.2,
    )
    box(ax + aw * 0.2, G - ah * 1.3, 5, ah * 0.44, 0.2)
    box(ax - 3.5, G - 12, 7, 12, 0.26)
    const wx = x0 + 5
    const wy = G - ah + 6
    box(wx, wy, 8, 8, 0.3)
    line([[wx + 4, wy], [wx + 4, wy + 8]], 0.9, 0.55, 0.4)
    line([[wx, wy + 4], [wx + 8, wy + 4]], 0.9, 0.55, 0.4)
  } else if (kind === 1) {
    /* A tower: tapered, capped, with a pennant. */
    const tw = aw * 0.55
    const th = Math.min(ah * 1.6, 44)
    shape(
      [
        [ax - tw / 2 - 2, G],
        [ax - tw / 2 + 1, G - th],
        [ax + tw / 2 - 1, G - th],
        [ax + tw / 2 + 2, G],
      ],
      0.1,
    )
    shape(
      [
        [ax - tw / 2 - 3.5, G - th],
        [ax, G - th - 13],
        [ax + tw / 2 + 3.5, G - th],
      ],
      0.22,
      1.4,
      0.82,
      1.2,
    )
    line([[ax, G - th - 13], [ax, G - th - 21]], 1, 0.6, 0.3)
    shape(
      [
        [ax, G - th - 21],
        [ax + 9, G - th - 18.5],
        [ax, G - th - 16],
      ],
      0.24,
      1.1,
      0.7,
      0.6,
    )
    box(ax - 3, G - th + 8, 6, 9, 0.28)
    line([[ax - tw / 2 - 1, G - th * 0.45], [ax + tw / 2 + 1, G - th * 0.45]], 1, 0.45)
  } else if (kind === 2) {
    /* A barn: gambrel roof, hayloft door, braced main doors. */
    const bw = aw * 1.15
    const bx = ax - bw / 2
    box(bx, G - ah * 0.8, bw, ah * 0.8, 0.1)
    shape(
      [
        [bx - 4, G - ah * 0.8],
        [bx + bw * 0.22, G - ah * 1.12],
        [ax, G - ah * 1.36],
        [bx + bw * 0.78, G - ah * 1.12],
        [bx + bw + 4, G - ah * 0.8],
      ],
      0.2,
      1.4,
      0.82,
      1.1,
    )
    const dw = bw * 0.34
    box(ax - dw / 2, G - ah * 0.55, dw, ah * 0.55, 0.26)
    line([[ax - dw / 2, G], [ax + dw / 2, G - ah * 0.55]], 0.9, 0.5, 0.4)
    line([[ax + dw / 2, G], [ax - dw / 2, G - ah * 0.55]], 0.9, 0.5, 0.4)
    box(ax - 3, G - ah * 1.08, 6, 6, 0.28)
  } else if (kind === 3) {
    /* A terrace: three narrow houses shoulder to shoulder, uneven heights,
       one front door between them. A row is a different kind of place from a
       house alone, and the difference is worth one branch. */
    let x = ax - aw * 0.78
    ;[0.86, 1.06, 0.72].forEach((f, i) => {
      const bw = aw * 0.46
      const bh = ah * f
      box(x, G - bh, bw, bh, 0.1)
      line([[x - 2, G - bh], [x + bw + 2, G - bh]], 1.2, 0.66, 0.5)
      box(x + bw * 0.26, G - bh + 5, bw * 0.48, 6, 0.3)
      box(x + bw * 0.26, G - bh * 0.5, bw * 0.48, 6, 0.3)
      if (i === 1) box(x + bw * 0.3, G - 11, bw * 0.4, 11, 0.26)
      x += bw + 2.5
    })
  } else if (kind === 4) {
    /* A lighthouse: banded, lantern-topped, two beams, rocks at the foot. */
    const lh = Math.min(ah * 1.65, 46)
    shape(
      [
        [ax - 9, G],
        [ax - 4.5, G - lh],
        [ax + 4.5, G - lh],
        [ax + 9, G],
      ],
      0.1,
    )
    line([[ax - 7, G - lh * 0.4], [ax + 7, G - lh * 0.4]], 1.1, 0.5)
    line([[ax - 5.6, G - lh * 0.7], [ax + 5.6, G - lh * 0.7]], 1.1, 0.5)
    box(ax - 5, G - lh - 8, 10, 8, 0.26)
    shape(
      [
        [ax - 6.5, G - lh - 8],
        [ax, G - lh - 14],
        [ax + 6.5, G - lh - 8],
      ],
      0.22,
      1.3,
      0.8,
      0.9,
    )
    /* Two beams, short and thick. Long thin ones turned the lantern into an
       aerial: three hairlines radiating off a mast is a transmitter, and the
       whole point of this drawing is that it is not a diagram of anything. */
    line([[ax + 7, G - lh - 6], [ax + 17, G - lh - 8.5]], 1.6, 0.3, 0.4)
    line([[ax + 7, G - lh - 3.5], [ax + 18, G - lh - 2]], 1.6, 0.3, 0.4)
    shape(
      [
        [ax - 21, G],
        [ax - 15, G - 6],
        [ax - 9, G - 2],
        [ax - 4, G],
      ],
      0.14,
      1.2,
      0.6,
      0.9,
    )
  } else {
    /* A bridge over water: deck, railing, two arches, and the river running
       out of both sides of the frame. */
    const bw = aw * 1.9
    const bx = ax - bw / 2
    const deck = G - ah * 0.5
    for (let i = 0; i < 4; i += 1) {
      const y = G + 2 + i * 3
      line([[bx - 14 + r() * 8, y], [bx + bw * 0.4, y]], 1, 0.24, 1.8)
      line([[bx + bw * 0.6, y], [bx + bw + 16 - r() * 8, y]], 1, 0.24, 1.8)
    }
    ;[0.28, 0.72].forEach((f) => {
      const cx = bx + bw * f
      ink.push({
        d: `M ${n2(cx - 13)} ${n2(G + 2)} Q ${n2(cx)} ${n2(deck - 16)} ${n2(cx + 13)} ${n2(G + 2)}`,
        w: 1.3,
        o: 0.68,
      })
    })
    box(ax - 3, deck, 6, G + 2 - deck, 0.12)
    line([[bx - 10, deck], [bx + bw + 10, deck]], 1.5, 0.8, 0.8)
    line([[bx - 10, deck - 4.5], [bx + bw + 10, deck - 4.5]], 1.1, 0.5, 0.8)
    for (let x = bx - 8; x < bx + bw + 10; x += 9) {
      line([[x, deck], [x, deck - 4.5]], 0.9, 0.42, 0.25)
    }
  }

  /* Ground line, drawn after the building so it runs behind rather than
     through it — except under the bridge, where the ground is water. */
  if (kind !== 5) line([[-6, G], [206, G]], 1.4, 0.55, 2)

  /* Trees, in slots along the edges the building does not occupy. */
  const slots = [12, 184, 30, 168, 46, 154]
  const trees = 2 + Math.floor(r() * 3)
  for (let i = 0; i < trees; i += 1) {
    const tx = slots[i % slots.length] + (r() - 0.5) * 9
    if (Math.abs(tx - ax) < aw * 0.8 + 8) continue
    const h = 17 + r() * 17
    const form = Math.floor(r() * 3)
    line([[tx, G], [tx - 1 + r() * 2, G - h * 0.5]], 1.6, 0.66, 0.5)
    if (form === 0) {
      for (let t = 0; t < 3; t += 1) {
        const top = G - h * (0.56 + t * 0.2)
        const half = h * (0.3 - t * 0.07)
        shape(
          [
            [tx - half, top + h * 0.26],
            [tx, top],
            [tx + half, top + h * 0.26],
          ],
          0.14,
          1.2,
          0.7,
          0.9,
        )
      }
    } else if (form === 1) {
      round(tx, G - h * 0.72, h * 0.34, 0.14, 1.2, 0.72)
    } else {
      line([[tx, G - h * 0.5], [tx, G - h]], 1.4, 0.66, 0.5)
      for (let b = 0; b < 4; b += 1) {
        const y = G - h * (0.62 + b * 0.11)
        const reach = h * (0.3 - b * 0.05) * (b % 2 ? -1 : 1)
        line([[tx, y], [tx + reach, y - h * 0.16]], 1, 0.6, 0.8)
      }
    }
  }

  /* A track up to the door, converging the way a track does — and closed, with
     a wash in it, rather than left as two loose lines. Two lines meeting at a
     building and nothing between them do not read as ground: under the tower
     they read as legs, and the whole scene turns into a water tower on a
     tripod. The fill is what makes them a surface, and because every wash is
     laid down before any ink, it passes under the ground line and under the
     building instead of over them.

     It also splays much harder than a track really would. The card's window is
     a letterbox and the drawing is sliced into it, so only about a dozen units
     of foreground survive below the ground line — a track drawn at a realistic
     angle shows up as two short verticals under the door and nothing else.
     Fanning it to the frame's full width means the part that does survive is
     already visibly widening, and reads as a path leaving the bottom edge. */
  if (kind !== 5 && r() < 0.75) {
    shape(
      [
        [58, 101],
        [ax - 5, G],
        [ax + 6, G],
        [140, 101],
      ],
      0.15,
      1.1,
      0.34,
      1.4,
    )
  }

  /* A fence along whichever verge is emptier. Its span is remembered so the
     grass can keep out of it: tufts drawn through the palings read as tally
     marks scratched over the drawing rather than as grass. */
  const fw = 62
  let fx = -1
  if (r() < 0.55) {
    fx = ax > 100 ? 6 : 128
    line([[fx, G - 5], [fx + fw, G - 6]], 1, 0.42, 0.8)
    line([[fx, G - 1.5], [fx + fw, G - 2.5]], 1, 0.42, 0.8)
    for (let x = fx; x <= fx + fw; x += 11) line([[x, G + 1], [x, G - 8]], 1, 0.5, 0.3)
  }

  /* A moon, on the side the building left free. */
  if (r() < 0.75) {
    const mx = ax > 100 ? 24 + r() * 24 : 152 + r() * 24
    round(mx, 20 + r() * 7, 5.5 + r() * 3, 0.13, 1.1, 0.45)
  }

  /* Birds: two strokes each, the mark everyone reads as a bird and nothing
     else. Never near the building, where they would read as smoke. */
  if (r() < 0.7) {
    const bx = ax > 100 ? 22 + r() * 34 : 132 + r() * 34
    for (let i = 0; i < 2 + Math.floor(r() * 2); i += 1) {
      const px = bx + i * 13 + r() * 5
      const py = 28 + i * 7 + r() * 8
      const w = 3 + r() * 1.6
      ink.push({
        d: `M ${n2(px - w * 2)} ${n2(py)} Q ${n2(px - w)} ${n2(py - w * 0.9)} ${n2(px)} ${n2(py)} Q ${n2(px + w)} ${n2(py - w * 0.9)} ${n2(px + w * 2)} ${n2(py)}`,
        w: 1,
        o: 0.42,
      })
    }
  }

  /* Grass, last, so it sits in front of the ground line. Three blades, not
     two: two splayed strokes meeting at the ground is a tick, and a row of
     ticks along the horizon reads as something marked off rather than as a
     verge. The middle blade standing straight up is what makes it a tuft. */
  for (let i = 0; i < 6; i += 1) {
    const gx = 4 + r() * 192
    if (Math.abs(gx - ax) < aw * 0.5) continue
    if (fx >= 0 && gx > fx - 4 && gx < fx + fw + 4) continue
    const gh = 4 + r() * 2.5
    line([[gx - 0.6, G + 1], [gx - 2.4 - r(), G - gh * 0.7]], 0.8, 0.34, 0.6)
    line([[gx, G + 1], [gx + 0.4 - r() * 0.8, G - gh]], 0.8, 0.38, 0.4)
    line([[gx + 0.6, G + 1], [gx + 2.4 + r(), G - gh * 0.7]], 0.8, 0.34, 0.6)
  }

  return (
    <svg
      className={className}
      viewBox="0 0 200 100"
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
