/* The stitched device on a spine.

   Bound books put something between the title and the imprint — a publisher's
   device, a rule, a stamped ornament — and its absence is most of why a shelf
   of flat coloured bars reads as a mock-up.

   This used to be four abstract geometric marks: a cross, a lozenge, a burst.
   They were legible and they were nothing to do with the rest of the app. The
   covers are needlework, so the spine is worked in the same stitches, from the
   same helpers, in the same two threads — a book is one piece of embroidery
   whichever way it is turned on the shelf.

   Two of the cover's four arrangements survive the trip. A spine is read with
   your head tilted, so anything with a top comes out lying on its side: the
   garland and the sprig both grow upward and are out. The wreath and the
   rosette are radially symmetric and read the same at any angle, which is
   exactly why they are the two the mark is built from — each in both thread
   orders, giving four devices indexed by `seed % 4`.

   Indexed rather than drawn from the random stream, for the same reason the
   covers are: adding a fifth later must not restamp every book on a shelf. */

import type { ReactNode } from 'react'
import { bud, floss, flower, leaf, palette } from './CoverArt'

/* Drawn on a 34-unit square and rendered at 18px. The cover's helpers take
   real radii rather than fractions, so the field has to be big enough that a
   flower is a flower: at 20 units a six-petal bloom with a cream eye and a
   crown of knots collapses into a dot. */
const S = 34
const C = S / 2

/** One bloom, four buds on the diagonals, four leaves between them — the
    cover's rosette at a fifth of the size. */
function rosette(a: string, b: string): ReactNode {
  const marks: ReactNode[] = []
  for (let i = 0; i < 4; i += 1) {
    const deg = 90 * i + 45
    const rad = (deg * Math.PI) / 180
    marks.push(leaf(`l${i}`, C + Math.cos(rad) * 6, C + Math.sin(rad) * 6, deg, 8))
  }
  for (let i = 0; i < 4; i += 1) {
    const deg = 90 * i
    const rad = (deg * Math.PI) / 180
    // 11.5, not 13: a bud is drawn *from* its anchor outward, so the last
    // 1.5 units of it were being cut off by the edge of the viewBox.
    marks.push(bud(`b${i}`, C + Math.cos(rad) * 11.5, C + Math.sin(rad) * 11.5, deg + 90, 3.4, b))
  }
  marks.push(flower('big', C, C, 9, 6, a))
  return <>{marks}</>
}

/** Six small blooms in a ring with leaves inside it — the cover's wreath,
    kept open in the middle so it does not silt up at 18px. */
function wreath(a: string, b: string): ReactNode {
  const marks: ReactNode[] = []
  /* 10.5 out with a 4.6 bloom reaches 15.1 of the 17 available — the ring sits
     inside the field with a unit and a half to spare, so no petal is clipped
     and the whole device still reads as one shape rather than six. */
  const r = 10.5
  for (let i = 0; i < 6; i += 1) {
    const deg = 60 * i + 30
    const rad = (deg * Math.PI) / 180
    marks.push(leaf(`l${i}`, C + Math.cos(rad) * 4, C + Math.sin(rad) * 4, deg, 7))
  }
  for (let i = 0; i < 6; i += 1) {
    const rad = ((60 * i) * Math.PI) / 180
    marks.push(
      flower(`f${i}`, C + Math.cos(rad) * r, C + Math.sin(rad) * r, 4.6, 5, i % 2 ? b : a),
    )
  }
  return <>{marks}</>
}

/* Both arrangements in both thread orders. Which floss carries the dominant
   bloom changes the device more than the arrangement does at this size, so
   swapping them is a real fourth variant and not padding. */
const MARKS = [
  (a: string, b: string) => rosette(a, b),
  (a: string, b: string) => wreath(a, b),
  (a: string, b: string) => rosette(b, a),
  (a: string, b: string) => wreath(b, a),
]

interface Props {
  seed: number
  className?: string
}

function SpineMark({ seed, className }: Props) {
  const { a, b } = palette(seed)
  const draw = MARKS[seed % MARKS.length]

  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox={`0 0 ${S} ${S}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {draw(floss(a), floss(b))}
    </svg>
  )
}

export default SpineMark
