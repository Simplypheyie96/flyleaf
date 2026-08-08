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

/* The mark's own gesture, drawn small and in line.

   The first pass gave each drawing its own leaf-ish blob, which is how a brand
   quietly stops being one: three leaves, three shapes. So this became a single
   shared shape — and then the mark stopped being a leaf and became an open
   book, and a rounded leaf with a midrib in the empty states was the brand
   disagreeing with itself in the one place a reader has nothing else to look
   at.

   It is NOT the mark's literal path. That drawing is 349 units wide with a
   24-unit gutter; scaled to the 22–28px these vignettes use, the gutter lands
   under two pixels and the two page outlines close up into a blob at the one
   hairline everything here is drawn at. Same book, redrawn for line: the
   outline is one closed shape and the gutter is a stroke down the middle,
   which is what a book looks like when it is described rather than stamped.

   Authored in a 34-unit box and scaled to fit; stroke-width is divided back
   out so a small book still draws at the drawing's hairline instead of
   thickening as it grows. */
function Sprig({ x, y, size, tilt = 0 }: { x: number; y: number; size: number; tilt?: number }) {
  const s = size / 34
  return (
    <g
      className={styles.accentLine}
      transform={`translate(${x} ${y}) rotate(${tilt}) scale(${s})`}
      strokeWidth={2 / s}
      strokeLinejoin="round"
    >
      {/* Both pages as one silhouette. The outer edges bow outward and the top
          and bottom lift toward the spine — the same two moves the mark makes,
          which is all it takes for the two to read as the same object. */}
      <path
        d="M17 4.4 C 11.4 2.2 6.2 1.9 1.8 3.2 L 1.8 20.4
           C 6.2 19.1 11.4 19.4 17 21.6
           C 22.6 19.4 27.8 19.1 32.2 20.4 L 32.2 3.2
           C 27.8 1.9 22.6 2.2 17 4.4 Z"
        className={styles.accentFill}
      />
      {/* The gutter. A stroke here rather than a gap, for the reason above. */}
      <path d="M17 4.4 L 17 21.6" strokeLinecap="round" />
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
      {/* The gap, and the book drifting down into it. The one accent on the
          drawing, and the one thing that is about to happen. */}
      <g className={styles.accentLine}>
        <path d="M80 72 V 52" strokeDasharray="4 5" strokeLinecap="round" />
      </g>
      {/* Dropped 8 units from where the leaf sat: the book is wide and short
          where the leaf was square, so hung from the same y it left a hole
          between itself and the dashes it is meant to be falling down. */}
      <Sprig x={66} y={26} size={28} tilt={-8} />
    </>
  )
}

function Search() {
  return (
    <>
      {/* A kept thing, written on down to a last line that never arrives, and
          the mark resting where that line would be.

          Deliberately NOT a magnifying glass. A ring with a stroke across it
          is a prohibition sign in every other place a reader has seen one, and
          "no results" is not "not allowed" — the first draft of this drawing
          read as a red-circle-slash and had to go. What is drawn instead is
          the thing itself, one line short.

          It sits INSIDE the card and tilts with it. Straddling the card's
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
        {/* Same 4-unit drop as the shelf, for the same reason. */}
        <Sprig x={84} y={52} size={22} tilt={12} />
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
