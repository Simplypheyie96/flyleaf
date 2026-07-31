/* The stitching on a spine, behind the type.

   The bands at head and foot used to be four `repeating-linear-gradient`
   rows in a pseudo-element. That was fine for two hairlines and a dead end
   for anything more: a gradient cannot follow an edge, cannot round a corner,
   and cannot be drawn in the same units as the flowers. So the spine gets a
   real drawing surface, in the same two threads as the book's cover.

   One unit is one pixel — the spine's own width and height are handed in and
   used as the viewBox — so nothing here is scaled, and a stitch is the same
   length on a 34px spine as on a 46px one. Sizing the art to the box instead
   would stretch every dash on the narrow books and squash it on the wide.

   What it draws is the frame of the cover, adapted to a shape twelve times
   taller than it is wide: a dashed border down each long edge and a double
   band across each end. The cover's seed-stitch scatter is deliberately not
   here. A spine is ~10px of clear cloth either side of the title, and knots
   strewn into a gap that narrow stop reading as stitching and start reading
   as dirt on the board — which is the one thing a pastel spine cannot
   afford. */

import { floss, palette } from './CoverArt'

/** Shorter than the cover's `3.4 2.6`: these runs are a fraction of the
    length, and the cover's stitch gives the head band barely three of them. */
const STITCH = '3 2.4'

/** How far the long borders sit in from the edges. Clear of the 3px corner
    radius, and inside the shading gradient's darkest columns so the thread is
    not drawn through the deepest part of the curve. */
const INSET = 4.5

/** Where the double band crosses, measured from each end. Inside the 12px the
    type is padded by, so the bands never touch a letter. */
const BAND = 5.5

interface Props {
  seed: number
  /** The spine's own box, in CSS pixels. */
  w: number
  h: number
  className?: string
}

function SpineArt({ seed, w, h, className }: Props) {
  const { a, b } = palette(seed)
  const A = floss(a)
  const B = floss(b)

  /* Thread A then thread B, half a stitch apart. That offset is what a second
     row of running stitch does on cloth — the gaps in one row sit over the
     stitches in the other — and it is the whole difference between a worked
     band and a dotted rule. */
  const band = (y: number, key: string) => (
    <g key={key}>
      <path d={`M ${INSET + 1} ${y} L ${w - INSET - 1} ${y}`} stroke={A} />
      <path
        d={`M ${INSET + 2.7} ${y + 3} L ${w - INSET - 1} ${y + 3}`}
        stroke={B}
      />
    </g>
  )

  // The long borders stop clear of the bands rather than crossing them: a
  // stitched frame is worked as four runs meeting at the corners, not as two
  // lines laid over two others.
  const top = BAND + 9
  const bottom = h - BAND - 9

  return (
    <svg
      className={className}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      strokeWidth="1.2"
      strokeDasharray={STITCH}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <g opacity="0.62">
        {band(BAND, 'head')}
        {band(h - BAND - 3, 'foot')}
      </g>
      <g opacity="0.45">
        <path d={`M ${INSET} ${top} L ${INSET} ${bottom}`} stroke={A} />
        <path d={`M ${w - INSET} ${top} L ${w - INSET} ${bottom}`} stroke={B} />
      </g>
    </svg>
  )
}

export default SpineArt
