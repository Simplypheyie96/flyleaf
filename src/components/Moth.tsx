/* The thing that landed on the card.

   A small stitched moth, worked in the same two flosses the covers and the
   rabbit are, resting on the corner of whatever memory was just drawn. It
   opens its wings once when a new card arrives and then settles.

   WHY NOT THE RABBIT. The rabbit is the app's mascot and it already lives on
   this screen, riding the top edge of the currently-reading card. Putting the
   same creature on the section directly underneath would not read as a mascot
   appearing twice — it would read as two rabbits, six centimetres apart, which
   is one rabbit too many and makes the first one mean less. A second creature
   from the same embroidery box keeps the world and loses the double.

   A moth in particular because it is the one that belongs to the object. Moths
   live in paper, they arrive without being sent for, and they settle on the
   thing you are looking at — which is the exact sentence this section is
   making. It is also the only creature that can sit ON the card without
   needing to be cropped by anything, so unlike the rabbit's perch it costs the
   layout nothing and needs no strip.

   Drawn on a 40 × 34 field. Everything is a filled shape from the cover's
   vocabulary — teardrop petals for the wings, a pointed oval body, cream
   knots for the wing spots. Strokes only for the antennae. */

import { floss } from '../books/CoverArt'
import styles from './Moth.module.css'

const W = 40
const H = 34

const CREAM = 'var(--floss-cream)'
/* Foliage green, same ramp the rabbit's whiskers come off. */
const GREEN = 'oklch(var(--floss-green-l) var(--floss-green-c) 145)'

/* Held here rather than seeded off a book, for the reason the rabbit's are:
   every other device in the app is a function of its book, and a creature that
   changes colour per memory is not a creature. Teal against rose — a cool
   thread and a warm one, well over 90° apart, which is the pairing rule the
   covers keep. */
const WING = floss(195)
const MARK = floss(350)

/** The cover's pointed oval, as a path string. Same helper the rabbit uses,
    repeated rather than shared because the two creatures should be able to
    move apart without dragging each other. */
function oval(len: number, wid = len * 0.42) {
  const h = +(wid / 2).toFixed(2)
  return `M 0 0 C ${len * 0.34} ${-h} ${len * 0.74} ${-h} ${len} 0 C ${len * 0.74} ${h} ${len * 0.34} ${h} 0 0 Z`
}

interface Props {
  /** Rendered width, in px. */
  size?: number
  className?: string
}

/** A moth at rest. Decorative: named by nothing and read by nothing. */
function Moth({ size = 46, className }: Props) {
  return (
    <span
      className={[styles.moth, className].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      <svg
        className={styles.art}
        viewBox={`0 0 ${W} ${H}`}
        width={size}
        height={(size * H) / W}
      >
        {/* Antennae first, so the head sits on top of where they root. */}
        <g stroke={GREEN} strokeWidth="0.8" strokeLinecap="round" fill="none">
          <path d="M 19 11 C 15.5 7 13 5.4 10.6 5" />
          <path d="M 21 11 C 24.5 7 27 5.4 29.4 5" />
        </g>

        {/* Each wing is a pair of the cover's teardrops — a long upper and a
            short lower — hinged at the body so the whole side turns as one. */}
        <g className={styles.wingL} style={{ transformOrigin: '20px 17px' }}>
          <path d={oval(17, 13)} transform="translate(20 16) rotate(196)" fill={WING} />
          <path d={oval(11, 9)} transform="translate(20 19) rotate(158)" fill={WING} opacity="0.62" />
          {/* Two knots on the upper wing. The one thing that stops a pair of
              teal petals reading as a leaf. */}
          <circle cx="10.4" cy="14.6" r="1.9" fill={CREAM} />
          <circle cx="10.4" cy="14.6" r="0.85" fill={MARK} />
        </g>

        <g className={styles.wingR} style={{ transformOrigin: '20px 17px' }}>
          <path d={oval(17, 13)} transform="translate(20 16) rotate(-16)" fill={WING} />
          <path d={oval(11, 9)} transform="translate(20 19) rotate(22)" fill={WING} opacity="0.62" />
          <circle cx="29.6" cy="14.6" r="1.9" fill={CREAM} />
          <circle cx="29.6" cy="14.6" r="0.85" fill={MARK} />
        </g>

        {/* Body over both wings, which is what makes the wings read as attached
            underneath rather than as two shapes beside a third. */}
        <path d={oval(17, 5.4)} transform="translate(20 11) rotate(90)" fill={MARK} />
        <circle cx="20" cy="11.4" r="2.9" fill={MARK} />
        <circle cx="18.9" cy="10.8" r="0.7" fill={CREAM} />
        <circle cx="21.1" cy="10.8" r="0.7" fill={CREAM} />
      </svg>
    </span>
  )
}

export default Moth
