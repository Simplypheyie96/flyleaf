/* The mark that lands on the day you choose.

   Drawn from the same three helpers as the covers and the spines — one bloom,
   six leaves radiating from behind it — so picking a date is stitched in the
   same needlework as the book it belongs to. The threads come from the book's
   own seed, which is why the flower that lands on the 17th is the flower on
   that book's cover and not a generic ornament.

   A 44-unit field rather than the spine's 34: this sits behind a numeral and
   has to read as a ring around it, so the middle is left open and the petals
   are pushed out past where the digits sit. */

import { floss, flower, leaf, palette } from '../../books/CoverArt'

const S = 44
const C = S / 2

interface Props {
  seed: number
  className?: string
}

function Bloom({ seed, className }: Props) {
  const { a, b } = palette(seed)
  const A = floss(a)
  const B = floss(b)

  const leaves = []
  const buds = []
  for (let i = 0; i < 6; i += 1) {
    const deg = 60 * i
    const rad = (deg * Math.PI) / 180
    leaves.push(leaf(`l${i}`, C + Math.cos(rad) * 9, C + Math.sin(rad) * 9, deg, 11))
    // Offset half a step from the leaves, so the ring alternates petal, leaf,
    // petal all the way round instead of stacking the two on one spoke.
    const off = ((deg + 30) * Math.PI) / 180
    buds.push(
      flower(`f${i}`, C + Math.cos(off) * 15, C + Math.sin(off) * 15, 5.5, 5, i % 2 ? B : A),
    )
  }

  return (
    <svg
      className={className}
      viewBox={`0 0 ${S} ${S}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {leaves}
      {buds}
    </svg>
  )
}

export default Bloom
