/* A SPRINKLE OF THE MARK, behind every page.

   The owner's ask: the way the little stars live in the corners of things,
   the logo's flower should drift faintly through the backgrounds — a brand
   that is in the paper, not only on the door. Seven of them, fixed to the
   viewport so they hold still while the pages scroll over them, at an opacity
   just above imagination. The path is the Wordmark's own MARK, not a
   redrawing, so the flower in the sky can never disagree with the flower on
   the splash.

   `z-index: -1` keeps the layer under every page without asking any page to
   raise itself; `fixed` keeps it out of scroll and out of layout. It costs
   seven small SVGs once, and nothing after that. */

import { MARK } from './Wordmark'
import styles from './brand.module.css'

/* Kept to the margins the columns rarely reach, so the flowers read as
   weather rather than as content the text has to negotiate with. */
const FALL = [
  { x: 6, y: 10, s: 26, r: -14 },
  { x: 86, y: 6, s: 18, r: 22 },
  { x: 90, y: 30, s: 13, r: -32 },
  { x: 4, y: 44, s: 19, r: 12 },
  { x: 88, y: 60, s: 24, r: -8 },
  { x: 7, y: 78, s: 15, r: 28 },
  { x: 82, y: 90, s: 21, r: -18 },
]

export default function FlowerField() {
  return (
    <div className={styles.field} aria-hidden="true">
      {FALL.map((f, i) => (
        <svg
          key={i}
          viewBox="0 0 512 512"
          className={styles.fieldFlower}
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            width: f.s,
            height: f.s,
            transform: `rotate(${f.r}deg)`,
          }}
        >
          <path d={MARK} />
        </svg>
      ))}
    </div>
  )
}
