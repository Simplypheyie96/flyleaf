/* SOMEWHERE TO READ — the room, cut from paper.
   ═════════════════════════════════════════════

   The room is a sandwich of three planes now, because the sofa is no longer
   drawn here. Back to front: the backdrop SVG (wall, rainy window, floor, the
   owner's bouquet, the bookcase), then the LOUNGE — the woman, her book and
   the dog, from the animation the owner sent, see Lounge.tsx — and then a
   front SVG carrying only the lamp and its light, so the beam falls ON the
   reader rather than behind her. The two SVGs share one viewBox and the
   lounge is placed by the same 360×250 numbers, so the three planes can be
   reasoned about as one drawing.

   THE BOUQUET IS NOT OURS. It is the owner's own drawing, traced from the file
   they sent. See Vase.tsx for what was and was not done to it. It stands at the
   left because that is where the window is, and flowers belong against glass.

   LIGHTING IS STAGED, not switched. The shade warms, then the bloom opens, then
   the cone reaches the floor, then the room takes the colour up, then the
   animation wakes. A single simultaneous fade is the exact thing that makes a
   lit room look like an opacity toggle, and this picture is trying to be a
   room. */

import Lounge from './Lounge'
import Vase from './Vase'
import s from './nook.module.css'

/* Rain, in two depths, and the whole difficulty is the loop.

   A drop falls exactly one row-space and then snaps back to the top, so the
   only way the snap is invisible is if another drop is standing precisely
   where it lands — an exact lattice, spaced at the travel distance, moving as
   one. What breaks up the look of the grid is everything else: each column on
   its own phase and weight, and TWO lattices at different depths. The far one
   is thin, short and slow — weather out there; the near one is longer,
   brighter and quick — water going past the glass. One sheet of identical
   dashes is what read as "sticks"; the depth split is what reads as rain. */
const FAR = Array.from({ length: 10 }, (_, col) => ({
  x: 34 + col * 16.5,
  delay: -(col * 0.19),
  fade: 0.3 + ((col * 3) % 5) * 0.07,
}))
const FAR_ROWS = Array.from({ length: 8 }, (_, row) => -16 + row * 26)

const NEAR = [
  { x: 55, delay: -0.13, fade: 0.72 },
  { x: 98, delay: -0.47, fade: 0.9 },
  { x: 133, delay: -0.71, fade: 0.62 },
  { x: 169, delay: -0.29, fade: 0.82 },
]
const NEAR_ROWS = Array.from({ length: 4 }, (_, row) => -24 + row * 52)

/** Water on the near side of the glass, which is the part that actually reads
    as rain: a bead running down the pane, slow, wandering, catching the light.
    Only three, because a window streaming with water is a storm and this room
    is meant to be comfortable. Each runs at its own pace so they never pair
    up. */
const RUNNELS = [
  { x: 68, delay: -1.4, dur: 7.5, len: 20 },
  { x: 121, delay: -4.9, dur: 9.2, len: 14 },
  { x: 163, delay: -6.6, dur: 6.4, len: 24 },
]

/* The books, as spines: [x, width, height, tone].

   Standing books are the only thing in this picture allowed to be a plain
   rectangle, because that is genuinely what a spine is at this size. What
   stops them reading as a barcode: heights that never repeat two in a row,
   widths that vary, one fallen against its neighbours, and a paper label band
   on the taller spines — the one mark a real spine carries at any distance. */
const UPPER: [number, number, number, number][] = [
  [106, 6, 20, 1],
  [113, 4.5, 16, 2],
  [118.5, 7, 21, 3],
  [126.5, 5, 14, 4],
  [132.5, 6.5, 19, 5],
]
const LOWER: [number, number, number, number][] = [
  [106, 7, 19, 3],
  [114, 5, 15, 5],
  [120, 6, 21, 1],
  [127, 7.5, 17, 2],
]

/** Motes in the beam. Three sizes so they read as depth rather than as a
    pattern, and each carries its own delay so the drift never phases up. */
const MOTES = [
  { x: 232, y: 150, r: 1.7, d: 0 },
  { x: 258, y: 118, r: 1.1, d: -3.1 },
  { x: 218, y: 186, r: 1.3, d: -5.4 },
  { x: 276, y: 168, r: 0.9, d: -1.7 },
  { x: 246, y: 208, r: 1.5, d: -6.8 },
  { x: 292, y: 214, r: 1, d: -4.2 },
  { x: 208, y: 224, r: 1.2, d: -2.4 },
]

/** A spine's label band, only on spines tall enough to carry one. */
function bands(list: [number, number, number, number][], shelfY: number) {
  return list
    .filter(([, , h]) => h >= 17)
    .map(([x, w, h]) => (
      <rect key={`b${x}`} x={x + 1.2} y={shelfY - h + 2.6} width={w - 2.4} height={1.6} rx="0.8" className={s.band} />
    ))
}

export default function Room({ lit }: { lit: boolean }) {
  return (
    <div
      className={s.room}
      data-lit={lit || undefined}
      role="img"
      aria-label={
        lit
          ? 'A paper cut-out room: a woman lies along the sofa reading, a dog sitting beside her, under a lit lamp — a bookcase, a vase of flowers and a rainy window around them'
          : 'A dim paper cut-out room: a woman rests on the sofa with her book, a dog beside her. The lamp is off and rain runs down the window'
      }
    >
      <svg viewBox="0 0 360 250" className={s.art} data-lit={lit || undefined} aria-hidden="true">
        <defs>
          <linearGradient id="nk-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-sky-high)" />
            <stop offset="1" stopColor="var(--color-sky-low)" />
          </linearGradient>
          {/* The wall is not one flat value. Daylight arrives from the window
              and falls off across the room, which is most of what tells you
              this is a room rather than a backdrop. */}
          <radialGradient id="nk-day" cx="0.32" cy="0.42" r="0.85">
            <stop offset="0" stopColor="var(--color-paper)" stopOpacity="0.5" />
            <stop offset="1" stopColor="var(--color-paper)" stopOpacity="0" />
          </radialGradient>
          {/* HOW STRONG THE LAMP IS BELONGS TO THE THEME, not to this file. A
              lamp in a bright room is a warm suggestion; a lamp in a dark room
              is the only reason you can see anything. These were fixed numbers
              tuned for daylight, which is why lighting the lamp at night did
              almost nothing you could see. */}
          <radialGradient id="nk-glow">
            <stop offset="0" stopColor="var(--color-accent)" stopOpacity="var(--nk-glow-core)" />
            <stop offset="0.42" stopColor="var(--color-accent)" stopOpacity="var(--nk-glow-mid)" />
            <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="nk-cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-accent)" stopOpacity="var(--nk-beam-top)" />
            <stop offset="0.6" stopColor="var(--color-accent)" stopOpacity="var(--nk-beam-mid)" />
            <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
          <clipPath id="nk-pane">
            <path d="M44 154 V86 A70 70 0 0 1 184 86 V154 Z" />
          </clipPath>
          <clipPath id="nk-beam">
            <path d="M222 72 L270 72 L332 250 L160 250 Z" />
          </clipPath>
        </defs>

        {/* ══ Plane one — the wall ════════════════════════════════════════ */}
        <rect x="0" y="0" width="360" height="214" className={s.wall} />
        <rect x="0" y="0" width="360" height="214" fill="url(#nk-day)" className={s.day} />

        {/* A picture rail, and then the skirting at the foot. Both are the same
            trick: a room has horizontals in it, and a wall with none reads as
            paper stretched behind the furniture. */}
        <rect x="0" y="42" width="360" height="2" className={s.rail} />
        <rect x="0" y="202" width="360" height="12" className={s.skirt} />

        {/* ── The window ─────────────────────────────────────────────────── */}
        <g clipPath="url(#nk-pane)">
          <path d="M44 154 V86 A70 70 0 0 1 184 86 V154 Z" fill="url(#nk-sky)" />
          {/* THE PANE IS DULLED BEFORE ANY RAIN IS DRAWN ON IT. Pale strokes
              over a bright open sky at almost the same lightness have nothing
              to be pale against. A wet afternoon is a dim one; drop the sky
              first and the same water reads immediately. */}
          <rect x="30" y="8" width="168" height="152" className={s.weather} />
          <ellipse cx="86" cy="46" rx="60" ry="18" className={s.overcast} />
          <ellipse cx="146" cy="58" rx="44" ry="15" className={s.overcast} />
          {FAR.map((col) => (
            <g
              key={col.x}
              className={s.rain}
              style={{ animationDelay: `${col.delay}s`, opacity: col.fade }}
            >
              {FAR_ROWS.map((y) => (
                <path key={y} d={`M${col.x} ${y} l-2.6 11`} />
              ))}
            </g>
          ))}
          {NEAR.map((col) => (
            <g
              key={col.x}
              className={s.rainNear}
              style={{ animationDelay: `${col.delay}s`, opacity: col.fade }}
            >
              {NEAR_ROWS.map((y) => (
                <path key={y} d={`M${col.x} ${y} l-5 19`} />
              ))}
            </g>
          ))}
          {RUNNELS.map((r) => (
            <g
              key={r.x}
              className={s.runnel}
              style={{ animationDelay: `${r.delay}s`, animationDuration: `${r.dur}s` }}
            >
              <path d={`M${r.x} 0 v${r.len}`} className={s.trail} />
              <circle cx={r.x} cy={r.len} r="1.9" className={s.bead} />
            </g>
          ))}
        </g>

        <path d="M114 16 V154 M46 86 H182" className={s.bar} />
        <path d="M44 154 V86 A70 70 0 0 1 184 86 V154 Z" className={s.reveal} />
        <rect x="34" y="150" width="160" height="9" rx="3" className={s.sill} />
        <rect x="40" y="159" width="148" height="4" rx="2" className={s.underSill} />

        {/* ══ Plane two — the floor ═══════════════════════════════════════ */}
        <rect x="0" y="214" width="360" height="36" className={s.floor} />
        <path d="M0 226 H360 M0 238 H360" className={s.boards} />
        <ellipse cx="186" cy="236" rx="172" ry="21" className={s.rug} />
        <ellipse cx="186" cy="236" rx="152" ry="15" className={s.rugRing} />
        <ellipse cx="248" cy="234" rx="96" ry="24" fill="url(#nk-glow)" className={s.pool} />

        {/* ══ Plane three — the bouquet ═══════════════════════════════════
            Placed by its ink, not by its artboard: the source drawing carries
            a wide margin, so the transform in the module puts the drawn
            content at x 6…106, y 50…230 — standing on the floor, clear of the
            sofa. */}
        <ellipse cx="56" cy="228" rx="34" ry="6" className={s.cast} />
        <Vase className={s.vase} />

        {/* ══ The bookcase ════════════════════════════════════════════════
            It stands in the gap between the bouquet and the sofa, and it is
            drawn BEFORE the lounge plane so the sofa's near arm crosses its
            right-hand edge. That overlap is the whole reason it reads as
            standing against the wall rather than floating on the carpet.

            A carcass, a recess cut into it darker, one shelf across the middle
            and a plinth at the foot. The recess is what makes it a bookcase
            and not a cupboard: without a value change between the box and the
            space inside it, the books look painted onto a board. */}
        <ellipse cx="127" cy="215" rx="31" ry="5" className={s.cast} />
        <g className={s.case}>
          <rect x="100" y="156" width="54" height="58" rx="2" className={s.carcass} />
          <rect x="104" y="160" width="46" height="46" className={s.recess} />
          <rect x="104" y="181" width="46" height="2.5" className={s.board} />
          <rect x="100" y="206" width="54" height="8" rx="1.5" className={s.plinth} />
          <g className={s.books}>
            {UPPER.map(([x, w, h, tone]) => (
              <rect key={x} x={x} y={181 - h} width={w} height={h} rx="1" data-tone={tone} />
            ))}
            {bands(UPPER, 181)}
            {/* The one that has fallen against its neighbours. Every shelf in
                the world has one, and it is the single detail that stops the
                row looking like a chart. */}
            <rect
              x="140"
              y="163"
              width="6"
              height="18"
              rx="1"
              data-tone="4"
              transform="rotate(11 143 181)"
            />
            {LOWER.map(([x, w, h, tone]) => (
              <rect key={x} x={x} y={206 - h} width={w} height={h} rx="1" data-tone={tone} />
            ))}
            {bands(LOWER, 206)}
            {/* Two laid flat on top of the standing ones — the pair somebody
                is part-way through and has not put back properly. */}
            <rect x="136" y="201" width="13" height="5" rx="1.5" data-tone="1" />
            <rect x="137" y="195" width="11" height="5" rx="1.5" data-tone="3" />
          </g>
        </g>

        {/* The sofa's shadow belongs to the floor, not to the animation — the
            lounge plane above lands exactly inside this footprint. */}
        <ellipse cx="237" cy="212" rx="106" ry="8" className={s.cast} />
      </svg>

      {/* ══ Plane four — the lounge ═══════════════════════════════════════
          Placed by the same numbers as everything else: the animation's drawn
          box is 817×327, scaled so the sofa spans x 126…348 with its base on
          y 211 — near arm over the bookcase's edge, right arm under the
          lamp's reach. The percentages in the module are those numbers over
          360×250. */}
      <Lounge lit={lit} />

      {/* ══ Front of house — the lamp, and the light it makes ═════════════
          Drawn over the lounge so the pole crosses in front of the sofa's arm
          and the beam falls on the woman rather than behind her. */}
      <svg
        viewBox="0 0 360 250"
        className={`${s.art} ${s.front}`}
        data-lit={lit || undefined}
        aria-hidden="true"
      >
        <g className={s.cone}>
          <path d="M222 72 L270 72 L332 250 L160 250 Z" fill="url(#nk-cone)" />
          <g clipPath="url(#nk-beam)" className={s.motes}>
            {MOTES.map((m, i) => (
              <circle
                key={i}
                cx={m.x}
                cy={m.y}
                r={m.r}
                style={{ animationDelay: `${m.d}s` }}
                className={s.mote}
              />
            ))}
          </g>
        </g>

        {/* THE LAMP. A shade is a cone seen from slightly below, so it needs
            both of its ellipses: a small one closing the top, a wide one
            opening the bottom. Those two are the entire difference between a
            cone and a triangle. The pole gets a heavier stroke and a finial
            where it meets the shade, because a gooseneck that simply vanishes
            into a flat shape has no joint. */}
        <ellipse cx="336" cy="212" rx="19" ry="5" className={s.cast} />
        <g className={s.lamp}>
          <path d="M336 210 C340 132 330 42 252 38" className={s.pole} />
          <ellipse cx="336" cy="211" rx="16" ry="4.5" />
        </g>
        <circle cx="246" cy="70" r="84" fill="url(#nk-glow)" className={s.bloom} />
        <path d="M228 42 H264 L273 70 H219 Z" className={s.shade} />
        <ellipse cx="246" cy="42" rx="18" ry="3.5" className={s.cap} />
        <circle cx="250" cy="37" r="3.5" className={s.finial} />
        <ellipse cx="246" cy="70" rx="27" ry="5" className={s.bulb} />
      </svg>
    </div>
  )
}
