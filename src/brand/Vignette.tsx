import styles from './brand.module.css'

/* Small warm moments for the screens that have nothing on them yet.

   08 asks that no empty state feel cold. Two of them were a bare sentence in
   soft ink — an empty shelf, and a search that found nothing — which is the
   coldest thing a screen can do: the app goes quiet exactly where the reader
   most needs to be told what happens next.

   These are drawings, not illustrations: line work at one weight, one muted
   fill, one accent detail, nothing shaded. That is deliberate. A rendered
   picture in an empty state is a thing to look at; a drawing this thin is a
   gesture, and it leaves the sentence underneath as the loudest thing on the
   card, which is where the reader's next move actually is.

   Everything is drawn in currentColor and the accent token, so night is not a
   second set of assets — it is the same three strokes on darker paper. */

export type Scene = 'shelf' | 'search'

interface VignetteProps {
  scene: Scene
  className?: string
}

/* The same silhouette the mark is, drawn small.

   The first pass gave each drawing its own leaf-ish blob, which is how a brand
   quietly stops being one: three leaves, three shapes. This one is the mark's
   own path — round on three corners, squared where the stem meets it — so the
   thing that appears in an empty state is recognisably the thing on the button
   and in the logo.

   The path is authored in a 34-unit box and scaled to fit; stroke-width is
   divided back out so a small leaf still draws at the drawing's one hairline
   instead of thickening as it grows. */
function Sprig({ x, y, size, tilt = 0 }: { x: number; y: number; size: number; tilt?: number }) {
  const s = size / 34
  return (
    <g
      className={styles.accentLine}
      transform={`translate(${x} ${y}) rotate(${tilt}) scale(${s})`}
      strokeWidth={2 / s}
    >
      <path
        d="M17 0 C 26 0 34 8 34 17 C 34 26 26 34 17 34
           L 5 34 C 2.2 34 0 31.8 0 29 L 0 17 C 0 8 8 0 17 0 Z"
        className={styles.accentFill}
      />
      {/* The mark's midrib, and only the midrib — the side vein it carries at
          logo size is four units long here and would just be a speck. It stops
          short of the far edge for the same reason it does there: a stroke
          that touches both sides of a rounded shape reads as a "no" sign. */}
      <path d="M8 26.4 Q 15.7 21.6 22.8 13" strokeLinecap="round" />
    </g>
  )
}

function Shelf() {
  return (
    <>
      {/* Two books leaning into a gap where a third would stand — the shape of
          "there is room here", drawn rather than said. */}
      <g className={styles.line}>
        <rect x="30" y="30" width="15" height="46" rx="2.5" />
        <g transform="rotate(-11 50 76)">
          <rect x="47" y="30" width="14" height="46" rx="2.5" />
        </g>
        <path d="M18 76 H 142" strokeLinecap="round" />
      </g>
      {/* The gap, and the leaf drifting down into it. The one accent on the
          drawing, and the one thing that is about to happen. */}
      <g className={styles.accentLine}>
        <path d="M80 72 V 52" strokeDasharray="4 5" strokeLinecap="round" />
      </g>
      <Sprig x={66} y={18} size={28} tilt={-8} />
    </>
  )
}

function Search() {
  return (
    <>
      {/* A kept thing, written on down to a last line that never arrives, and
          a leaf resting where that line would be.

          Deliberately NOT a magnifying glass. A ring with a stroke across it
          is a prohibition sign in every other place a reader has seen one, and
          "no results" is not "not allowed" — the first draft of this drawing
          read as a red-circle-slash and had to go. What is drawn instead is
          the thing itself, one line short.

          The leaf sits INSIDE the card and tilts with it. Straddling the card's
          edge — where it was — made the two shapes fight for the same corner
          and read as one muddled blob. */}
      <g transform="rotate(-3 76 52)">
        <g className={styles.line}>
          <rect x="34" y="18" width="84" height="68" rx="5" />
          <path d="M48 34 H 100" strokeLinecap="round" />
          <path d="M48 46 H 104" strokeLinecap="round" />
        </g>
        <g className={styles.accentLine}>
          <path d="M48 58 H 72" strokeDasharray="3 6" strokeLinecap="round" />
        </g>
        <Sprig x={84} y={48} size={22} tilt={12} />
      </g>
    </>
  )
}

function Vignette({ scene, className }: VignetteProps) {
  return (
    <svg
      className={[styles.vignette, className].filter(Boolean).join(' ')}
      viewBox="0 0 160 100"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {scene === 'shelf' ? <Shelf /> : <Search />}
    </svg>
  )
}

export default Vignette
