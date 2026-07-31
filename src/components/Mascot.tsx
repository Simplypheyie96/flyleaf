/* The thing behind the card.

   A small creature worked in the same two flosses the covers are, travelling
   along the top edge of the currently-reading card so that only its ears and
   the crown of its head clear it, and stopping every so often to look over.

   It is cropped by a strip, not by the card: PaperSurface is translucent with
   a backdrop blur, so anything genuinely behind it ghosts through as a smear
   rather than disappearing. The strip sits immediately above the card, hides
   its own overflow, and the drawing runs well past the crop — which gives the
   same read with none of the bleed.

   Drawn on a 44 × 44 field, of which a 32-unit window shows. The window is
   wider than the creature ever fills, because what is seen is set by how far
   the drawing is pushed DOWN inside it: most of the loop it sits low enough
   that only the ears clear the crop, and it rises out of that. At a shallower
   window it would stand ON the card like a sticker, and the thing being drawn
   is one that is BEHIND it. The whole body below y=37 is never seen at any
   depth, because a body that stops at the crop line reads as cut out rather
   than as hidden.

   Everything is a filled shape from the cover's vocabulary — teardrop petals,
   pointed leaves, cream knots. Strokes only for whiskers. */

import { floss } from '../books/CoverArt'
import styles from './Mascot.module.css'

const W = 44
const H = 44
/** Units of the field the strip's window is tall. Kept in step with the
    strip's height in the stylesheet, which is the same fraction of the
    width. */
export const SHOWN = 32

const CREAM = 'var(--floss-cream)'
const GREEN = 'oklch(var(--floss-green-l) var(--floss-green-c) 145)'
/* The eye. Dark enough to be a feature at 66px rather than a smudge, and
   taken from the floss ramp so it moves with the theme. */
const DARK = 'oklch(calc(var(--floss-l) - 0.34) var(--floss-c) 265)'

/* Hues held here rather than seeded. Every other device in the app is a
   function of its book; this one is the app itself, and it has to be the same
   creature on every visit or it stops being a mascot. */
const LILAC = floss(305)
const ROSE = floss(350)

/** The cover's pointed oval, as a path string: the shape every ear, nose and
    leaf here is made of. */
function oval(len: number, wid = len * 0.42) {
  const h = +(wid / 2).toFixed(2)
  return `M 0 0 C ${len * 0.34} ${-h} ${len * 0.74} ${-h} ${len} 0 C ${len * 0.74} ${h} ${len * 0.34} ${h} 0 0 Z`
}

interface Props {
  /** Rendered width of the creature, in px. */
  size?: number
  className?: string
}

/** A creature on the top edge of whatever it is placed above. Decorative: it
    is named by nothing and read by nothing. */
function Mascot({ size = 66, className }: Props) {
  const strip = [styles.strip, className].filter(Boolean).join(' ')
  return (
    <div
      className={strip}
      aria-hidden="true"
      style={{ '--mascot-w': `${size}px` } as React.CSSProperties}
    >
      {/* The track is the full width of the strip, so the creature's travel can
          be written as a share of it and stay right at any width. The SVG is
          its own size and sits at the track's start; moving the track by
          `100% - width` is what puts it flush with the far edge, and moving it
          negative is what walks it into the wall on the near side. */}
      <span className={styles.track}>
        <svg
          className={styles.art}
          viewBox={`0 0 ${W} ${H}`}
          width={size}
          height={(size * H) / W}
        >
          {/* The left ear is static — only one of the pair flicks, because two
              ears moving together is a twitch and one moving alone is a
              creature listening. */}
          <path d={oval(21, 8)} transform="translate(17.5 27) rotate(-102)" fill={LILAC} />
          <path d={oval(13, 4)} transform="translate(17.6 26) rotate(-102)" fill={ROSE} opacity="0.55" />
          <g className={styles.earR} style={{ transformOrigin: '26.5px 27px' }}>
            <path d={oval(21, 8)} transform="translate(26.5 27) rotate(-78)" fill={LILAC} />
            <path d={oval(13, 4)} transform="translate(26.4 26) rotate(-78)" fill={ROSE} opacity="0.55" />
          </g>
          <circle cx="22" cy="31" r="11" fill={LILAC} />
          {/* Eyes high on the skull. On a face that only ever clears the card by
              a third of itself, eyes at the middle of the head never make it
              over. */}
          <circle cx="17.6" cy="27" r="2.3" fill={CREAM} />
          <circle cx="17.3" cy="27" r="1.25" fill={DARK} />
          <circle cx="26.4" cy="27" r="2.3" fill={CREAM} />
          <circle cx="26.1" cy="27" r="1.25" fill={DARK} />
          <path d={oval(3.8, 3.2)} transform="translate(20.3 32) rotate(30)" fill={ROSE} />
          {/* Whiskers — the thing that stops a lilac circle with two eyes
              reading as a cat. Well under the crop; they are for the rise. */}
          <g stroke={GREEN} strokeWidth="0.7" strokeLinecap="round" opacity="0.7">
            <path d="M 14.6 32.4 L 5.6 31" />
            <path d="M 14.6 33.6 L 5.2 34.6" />
            <path d="M 29.4 32.4 L 38.4 31" />
            <path d="M 29.4 33.6 L 38.8 34.6" />
          </g>
        </svg>
      </span>
    </div>
  )
}

export default Mascot
