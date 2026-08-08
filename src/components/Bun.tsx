/* THE RABBIT. Flyleaf's one character.

   WHY THIS IS A REWRITE AND NOT A TWEAK. The old mascot was built out of the
   book-cover embroidery kit — teardrop petals, floss hues, a lilac disc with
   two dots on it. That was the mistake, and it was a structural one: a set of
   shapes chosen to make abstract cover art will not make a face, because a
   face needs a line around it. Five passes of nudging that drawing produced
   five versions of the same lilac blob. So the vocabulary changed instead.

   THE CONSTRUCTION, which every pose obeys:
   · ONE uniform outline, `--bun-ink`, round caps and joins, 3.2 units on a
     ~130-unit field. Uniform is the whole trick — a line that thickens and
     thins reads as a signature, a line that doesn't reads as a character.
   · A white coat, a soft belly shade, pink ears, pink blush. Five colours, no
     gradients, no shadows on the body itself.
   · Kawaii proportions: the head is roughly the width of the body and sits
     LOW, cheeks are wide, eyes are wide-set and below the head's midline,
     limbs are stubs. Every one of those is what separates "cute animal" from
     "correctly-proportioned rabbit", which is not what this is.
   · Faces are built from four parts and only four: eyes, blush, nose, mouth.
     Detail is what made the old one look cheap.

   THE POSES ARE THE COPY. Each empty state gets its own, because a mascot
   repeating one pose across three screens stops being a character and becomes
   a graphic that got pasted three times:
     sleep  — nothing on the shelf. Curled in a puddle, Zzz rising.
     think  — nothing being read. Sitting, looking UP at the heading above it.
     write  — nothing kept in this book yet. Pencil raised, waiting to start.
     peek   — a filter came up dry. Head over a ledge, eyes hunting.
     wave   — first run. Both arms up, one ear flopped, pleased to see you.

   MOTION. Every pose idles: nothing here is a static drawing with a wiggle
   bolted on. The loops are long (4–7s), soft-eased and desynchronised, so the
   character reads as breathing rather than as a GIF. All of it is CSS on
   named groups, all of it collapses under `prefers-reduced-motion` — see
   Bun.module.css, where the reduced case is a real design and not an off
   switch. */

import { useId } from 'react'

import styles from './Bun.module.css'

export type Pose = 'sleep' | 'think' | 'write' | 'peek' | 'wave'

/* A stadium: from (0,0) running along +x for `len`, `wid` thick, centred on
   y=0. Ears, arms and the pencil are all this shape at different scales,
   which is most of why the poses look like the same animal. */
function capsule(len: number, wid: number) {
  const r = wid / 2
  const l = Math.max(len, wid + 0.01)
  return `M ${r} ${-r} L ${l - r} ${-r} A ${r} ${r} 0 0 1 ${l - r} ${r} L ${r} ${r} A ${r} ${r} 0 0 1 ${r} ${-r} Z`
}

/** An upright ear: coat capsule with a pink one inset. Rooted at (x,y),
    pointing along `deg`.

    TWO GROUPS, AND IT HAS TO BE TWO. The placement lives on the outer one and
    the animation class on the inner, because a CSS `transform` and an SVG
    `transform` attribute are the same property: the moment a keyframe on this
    element says `rotate(-13deg)`, the attribute's `translate(x y) rotate(deg)`
    is not overridden in part, it is gone. Written as one group the flicking
    ear detached from every rabbit and drew itself flat across the top-left
    corner of the frame — with no error anywhere, because nothing about it is
    invalid. Nested, the outer group places the ear and the inner one turns it
    about its own root, and neither knows about the other. */
function Ear({
  x,
  y,
  deg,
  len,
  wid,
  className,
}: {
  x: number
  y: number
  deg: number
  len: number
  wid: number
  className?: string
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${deg})`}>
      <g className={className}>
        <path d={capsule(len, wid)} className={styles.coat} />
        <path
          d={capsule(len - wid * 0.9, wid * 0.44)}
          transform={`translate(${wid * 0.45} 0)`}
          className={styles.pink}
        />
      </g>
    </g>
  )
}

/* Eyes closed and content — the arc bows UP in the middle. Bowed down is the
   same two strokes and reads as miserable, which is the difference between a
   sleeping rabbit and a sad one. */
function Shut({ x, y }: { x: number; y: number }) {
  return <path d={`M ${x - 6.4} ${y + 1.8} Q ${x} ${y - 4} ${x + 6.4} ${y + 1.8}`} className={styles.line} />
}

/** An open eye, looking wherever `dx`/`dy` points. The highlight is what
    makes it alive; a plain black dot is a button. */
function Eye({ x, y, dx = 0, dy = 0 }: { x: number; y: number; dx?: number; dy?: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx="4.4" ry="5" className={styles.pupil} />
      <circle cx={x + dx - 1.3} cy={y + dy - 1.6} r="1.5" className={styles.glint} />
    </g>
  )
}

/** Nose and the two-arc mouth under it. One unit, because they are never
    apart and the mouth's position is a function of the nose's. */
function Snout({ x, y, open = false }: { x: number; y: number; open?: boolean }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx="3.4" ry="2.5" className={styles.nose} />
      {open ? (
        <>
          <path d={`M ${x - 7.5} ${y + 4} Q ${x} ${y + 14} ${x + 7.5} ${y + 4} Z`} className={styles.mouth} />
          <path d={`M ${x - 3.4} ${y + 9.4} Q ${x} ${y + 13.4} ${x + 3.4} ${y + 9.4} Z`} className={styles.tongue} />
        </>
      ) : (
        <path
          d={`M ${x} ${y + 2.6} Q ${x - 1.4} ${y + 6.4} ${x - 5.6} ${y + 4.6} M ${x} ${y + 2.6} Q ${x + 1.4} ${y + 6.4} ${x + 5.6} ${y + 4.6}`}
          className={styles.line}
        />
      )}
    </g>
  )
}

function Blush({ x, y, gap }: { x: number; y: number; gap: number }) {
  return (
    <g className={styles.blush}>
      <ellipse cx={x - gap} cy={y} rx="6.2" ry="3.8" />
      <ellipse cx={x + gap} cy={y} rx="6.2" ry="3.8" />
    </g>
  )
}

/* Two a side, short and fine. Whiskers are the cheapest thing on the drawing
   and they do more than any of it: without them the head is a circle.

   THEY HAVE TO FAN AND THEY HAVE TO STOP SHORT. Written as four straight `L`
   segments at the same height they came out as two dead-level rules ruled
   straight through the blush and out past the cheek on both sides — scratches
   across the face rather than hairs on it, which is exactly how it read at
   size. Three things fix it and all three are needed:

     1  CURVED. A `Q` with the control point pulled toward the root gives the
        droop a hair has under its own weight. A straight line is a wire.
     2  FANNED, AND FANNED SYMMETRICALLY. The upper hair lifts and the lower
        one falls, so the pair opens from 2.5 units at the root to 12.5 at the
        tip. Two parallel hairs are a stave; two that spread are a face.

        The fan was lopsided first time out — the upper hair climbed 6.5 units
        while the lower dropped 2 over the same run, which is not a fan, it is
        one hair with a level rule under it. And the level one is the whole
        problem: a dead-horizontal stroke across a cheek is the exact mark that
        reads as a scratch rather than a hair, so leaving it in place while
        lifting its partner fixed nothing at size. Both now move about 6.5.
     3  ROOTED CLEAR OF THE NOSE. 9 units out, not 7. The nose is 3.4 wide and
        drawn solid; a hair starting at 7 begins level with its edge and reads
        as growing out of the nose itself rather than from the muzzle beside it.
     4  INSIDE THE SILHOUETTE. `reach` is scaled to 0.78 here rather than at
        the five call sites, because every caller was passing a number that
        put the tip past the edge of the head and the fix belongs in one
        place. */
function Whiskers({ x, y, reach }: { x: number; y: number; reach: number }) {
  const r = reach * 0.78
  const side = (dir: 1 | -1) => (
    <>
      <path d={`M ${x + dir * 9} ${y - 0.5} Q ${x + dir * r * 0.62} ${y - 4} ${x + dir * r} ${y - 6.5}`} />
      <path d={`M ${x + dir * 9} ${y + 2} Q ${x + dir * r * 0.62} ${y + 5} ${x + dir * r} ${y + 6}`} />
    </>
  )

  return (
    <g className={styles.whisker}>
      {side(-1)}
      {side(1)}
    </g>
  )
}

/* ── The poses ─────────────────────────────────────────────────────────── */

/* NOTHING ON THE SHELF. A loaf in a shallow puddle, ears draped back over
   its own body, breathing. The puddle is the state made visible: a thing that
   has settled somewhere long enough to sink into it. */
function Sleep() {
  return (
    <>
      <g className={styles.pool}>
        <ellipse cx="74" cy="90" rx="58" ry="11" />
        <ellipse cx="70" cy="88" rx="40" ry="6.5" className={styles.poolLit} />
      </g>
      <ellipse cx="74" cy="90" rx="46" ry="9" className={styles.ripple} />

      <g className={styles.breathe} style={{ transformOrigin: '74px 88px' }}>
        <circle cx="21" cy="66" r="9.5" className={styles.coat} />
        <path
          d="M 30 88 C 17 88 12 70 25 61 C 38 52 58 50 76 54 C 90 57 98 66 100 76 C 102 84 96 88 88 88 Z"
          className={styles.coat}
        />
        <ellipse cx="47" cy="85" rx="13" ry="6" className={styles.coat} />

        {/* Ears go on BEFORE the head, so the head laps over their roots and
            they read as coming out of it rather than as two things parked
            beside it. Both lie back along the spine; a sleeping animal's ears
            are down, and upright ears on a closed-eyed face read as awake. */}
        <Ear x={95} y={55} deg={185} len={47} wid={16} className={styles.earDrape} />
        <Ear x={97} y={51} deg={197} len={41} wid={15} />

        <ellipse cx="104" cy="70" rx="25" ry="22" className={styles.coat} />
        <ellipse cx="90" cy="85" rx="10" ry="5.5" className={styles.coat} />

        <Whiskers x={104} y={76} reach={26} />
        <Blush x={104} y={77} gap={16} />
        <Shut x={95} y={68} />
        <Shut x={113} y={68} />
        <Snout x={104} y={75} />
      </g>

      {/* Three z's on one path each, rising and fading on a stagger. They are
          drawn rather than typed: a <text> here would be the one thing in the
          app whose look depended on a font loading.

          EACH ONE IS TWO GROUPS DEEP, and it has to be. The `transform`
          attribute that places a z and the `transform` the rise keyframe
          animates are THE SAME PROPERTY — CSS wins, so a single element
          carrying both loses its placement the instant the animation starts.
          All three then played from the frame's origin, which is why they
          appeared stacked in one clump off the rabbit's shoulder instead of
          climbing away from its head: not a stagger problem at all, the
          drawing had simply thrown away where each z lives.

          Outer `<g>` places and scales. Inner `<path>` rises. Neither touches
          the other's transform, and the placement now survives into reduced
          motion for free — the media query only has to stop the animation. */}
      <g className={styles.zzz}>
        <g transform="translate(114 42) scale(0.7)">
          <path d="M 0 0 L 9 0 L 0 10 L 9 10" className={styles.snore} />
        </g>
        <g transform="translate(123 26) scale(0.9)">
          <path d="M 0 0 L 9 0 L 0 10 L 9 10" className={styles.snore} />
        </g>
        <g transform="translate(132 8) scale(1.1)">
          <path d="M 0 0 L 9 0 L 0 10 L 9 10" className={styles.snore} />
        </g>
      </g>
    </>
  )
}

/* NOTHING BEING READ. Sitting, paw at the chin, tipped back to look up at the
   heading it sits under — so the drawing points at the words instead of
   competing with them. The bubble rises the same way. */
function Think() {
  return (
    <>
      <ellipse cx="62" cy="135" rx="38" ry="7" className={styles.shadow} />

      <g className={styles.breathe} style={{ transformOrigin: '62px 132px' }}>
        <path
          d="M 62 134 C 41 134 31 121 33 104 C 35 89 47 82 62 82 C 77 82 89 89 91 104 C 93 121 83 134 62 134 Z"
          className={styles.coat}
        />
        <ellipse cx="44" cy="130" rx="12" ry="6.5" className={styles.coat} />
        <ellipse cx="80" cy="130" rx="12" ry="6.5" className={styles.coat} />
        <ellipse cx="44" cy="129" rx="4.6" ry="2.6" className={styles.pad} />
        <ellipse cx="80" cy="129" rx="4.6" ry="2.6" className={styles.pad} />

        {/* The arm is drawn under the head group so the chin covers where the
            paw meets the face. */}
        <path d={capsule(27, 15)} transform="translate(77 103) rotate(-103)" className={styles.coat} />

        <g className={styles.gazeUp} style={{ transformOrigin: '60px 80px' }}>
          <Ear x={52} y={38} deg={-104} len={46} wid={16} className={styles.earFlick} />
          <Ear x={68} y={36} deg={-70} len={43} wid={15} />
          <ellipse cx="60" cy="58" rx="27" ry="25" className={styles.coat} />
          <Whiskers x={60} y={67} reach={30} />
          <Blush x={60} y={67} gap={19} />
          <Shut x={49} y={58} />
          <Shut x={71} y={58} />
          <Snout x={60} y={66} />
          <circle cx="70" cy="79" r="7.5" className={styles.coat} />
        </g>
      </g>

      <g className={styles.muse}>
        <circle cx="93" cy="47" r="3.6" className={styles.bubble} />
        <circle cx="101" cy="36" r="5" className={styles.bubble} />
        <ellipse cx="101" cy="18" rx="18" ry="13" className={styles.bubble} />
        <g className={styles.dots}>
          <circle cx="94" cy="18" r="2.3" />
          <circle cx="101" cy="18" r="2.3" />
          <circle cx="108" cy="18" r="2.3" />
        </g>
      </g>
    </>
  )
}

/* NOTHING KEPT IN THIS BOOK. Pencil up, eyes open and aimed at the heading,
   mid-thought rather than asleep — the difference between "this shelf is
   empty" and "this page is waiting for you", which are two different silences
   and should not get the same drawing. */
function Write() {
  return (
    <>
      <ellipse cx="60" cy="135" rx="38" ry="7" className={styles.shadow} />

      <g className={styles.breathe} style={{ transformOrigin: '60px 132px' }}>
        <path
          d="M 60 134 C 39 134 29 121 31 104 C 33 89 45 82 60 82 C 75 82 87 89 89 104 C 91 121 81 134 60 134 Z"
          className={styles.coat}
        />
        <ellipse cx="42" cy="130" rx="12" ry="6.5" className={styles.coat} />
        <ellipse cx="78" cy="130" rx="12" ry="6.5" className={styles.coat} />
        <ellipse cx="42" cy="129" rx="4.6" ry="2.6" className={styles.pad} />
        <ellipse cx="78" cy="129" rx="4.6" ry="2.6" className={styles.pad} />

        {/* Left arm resting; the right one is up and is the one that moves. */}
        <path d={capsule(24, 14)} transform="translate(36 104) rotate(-118)" className={styles.coat} />
        <circle cx="25" cy="86" r="6.8" className={styles.coat} />

        <Ear x={52} y={38} deg={-99} len={46} wid={16} />
        <Ear x={70} y={37} deg={-64} len={42} wid={15} className={styles.earFlick} />
        <ellipse cx="60" cy="58" rx="27" ry="25" className={styles.coat} />
        <Whiskers x={60} y={67} reach={30} />
        <Blush x={60} y={67} gap={19} />
        <g className={styles.blink} style={{ transformOrigin: '60px 57px' }}>
          <Eye x={49} y={57} dy={-1} />
          <Eye x={71} y={57} dy={-1} />
        </g>
        <Snout x={60} y={68} />

        {/* Arm and pencil turn together about the shoulder — a pencil that
            waggles while the arm holding it stays still is a pencil that is
            not being held. */}
        <g className={styles.tap} style={{ transformOrigin: '86px 102px' }}>
          <path d={capsule(25, 14)} transform="translate(86 102) rotate(-74)" className={styles.coat} />
          <g transform="translate(93 84) rotate(-56)">
            <path d={capsule(30, 8.5)} className={styles.tool} />
            <path d="M 30 -4.25 L 39 0 L 30 4.25 Z" className={styles.nib} />
            <path d={capsule(5, 8.5)} className={styles.eraser} />
          </g>
          <circle cx="93" cy="84" r="7" className={styles.coat} />
        </g>
      </g>

      <g className={styles.spark}>
        <path d="M 112 46 l 0 -7 M 112 46 l 0 7 M 112 46 l -6 0 M 112 46 l 6 0" />
        <path d="M 101 28 l 0 -5 M 101 28 l 0 5 M 101 28 l -4.5 0 M 101 28 l 4.5 0" />
      </g>
    </>
  )
}

/* A FILTER CAME UP DRY. Head and two paws over a ledge, eyes hunting left and
   right. It is the only pose that is cropped, and the crop is the joke: it is
   looking for the thing you asked for and it is not up here.

   THE LEDGE HAS TO BE DRAWN AND THE CROP HAS TO BE REAL. The first version had
   neither: the head was a complete circle with its chin fully closed, and the
   two paws were whole circles floating in clear air below it with a gap. The
   comment above them claimed a "crop line", but no line existed and nothing was
   cropped — so at size it read as a head with two balls under it, which is the
   one thing a mascot cannot afford to look like. Three parts, all needed:

     1  A LINE. `edge` is a real stroke across the frame at y=79. Without
        something to grip, "peeking" is not a pose, it is a floating head.
     2  A CLIP. Everything above the line renders and everything below is gone,
        so the paws are HALF paws and the chin is genuinely behind the edge.
        Half a circle over a line reads as a hand hooked over it; a whole
        circle beside a line reads as a ball resting on it.
     3  THE HEAD LOWERED two units, so the ledge cuts into the face rather than
        kissing the underside of it. Touching is not overlapping, and only
        overlap makes depth.

   The line is drawn BEFORE the clipped group, so the paws' white coat covers
   its upper half where they sit on it — paws in front of the edge, not behind
   it, which is the difference between holding on and hiding. */
function Peek() {
  const clip = useId()
  const rail = useId()

  return (
    <>
      {/* `userSpaceOnUse`, not the default — an objectBoundingBox gradient on a
          dead-horizontal line has a zero-height box to resolve against, which
          is undefined behaviour and renders as nothing in practice. */}
      <linearGradient id={rail} gradientUnits="userSpaceOnUse" x1="6" x2="112">
        <stop offset="0" className={styles.edgeStop} stopOpacity="0" />
        <stop offset="0.18" className={styles.edgeStop} />
        <stop offset="0.82" className={styles.edgeStop} />
        <stop offset="1" className={styles.edgeStop} stopOpacity="0" />
      </linearGradient>
      <path d="M 6 79 L 112 79" className={styles.edge} style={{ stroke: `url(#${rail})` }} />

      <g clipPath={`url(#${clip})`}>
        <clipPath id={clip}>
          {/* Generous everywhere but the bottom — the ears overflow the frame
              by design and must not be caught by their own crop. */}
          <rect x="-30" y="-40" width="178" height="119" />
        </clipPath>

        <g className={styles.crane} style={{ transformOrigin: '59px 88px' }}>
          <Ear x={51} y={36} deg={-102} len={40} wid={15} className={styles.earFlick} />
          <Ear x={67} y={35} deg={-72} len={37} wid={14} />
          <ellipse cx="59" cy="56" rx="26" ry="24" className={styles.coat} />
          <Whiskers x={59} y={64} reach={29} />
          <Blush x={59} y={64} gap={18} />
          <g className={styles.hunt}>
            <Eye x={48} y={55} />
            <Eye x={70} y={55} />
          </g>
          <Snout x={59} y={64} />
        </g>

        {/* The paws do NOT move with the head, which is what makes the head
            read as rising out of a grip rather than the whole animal bobbing. */}
        <circle cx="33" cy="79" r="9" className={styles.coat} />
        <circle cx="85" cy="79" r="9" className={styles.coat} />
      </g>
    </>
  )
}

/* FIRST RUN. Arms up, one ear flopped, open smile. The flopped ear is the
   only asymmetry in the set and it is doing a lot of work: a perfectly
   symmetrical character reads as a logo. */
function Wave() {
  return (
    <>
      <ellipse cx="63" cy="130" rx="36" ry="7" className={styles.shadow} />

      <g className={styles.hop} style={{ transformOrigin: '63px 128px' }}>
        <path
          d="M 63 129 C 43 129 33 116 35 100 C 37 86 49 79 63 79 C 77 79 89 86 91 100 C 93 116 83 129 63 129 Z"
          className={styles.coat}
        />
        <ellipse cx="46" cy="125" rx="11.5" ry="6.2" className={styles.coat} />
        <ellipse cx="80" cy="125" rx="11.5" ry="6.2" className={styles.coat} />
        <ellipse cx="46" cy="124" rx="4.4" ry="2.5" className={styles.pad} />
        <ellipse cx="80" cy="124" rx="4.4" ry="2.5" className={styles.pad} />

        <g className={styles.armL} style={{ transformOrigin: '40px 98px' }}>
          <path d={capsule(26, 14)} transform="translate(40 98) rotate(-141)" className={styles.coat} />
          <circle cx="21" cy="82" r="7" className={styles.coat} />
        </g>
        <g className={styles.armR} style={{ transformOrigin: '86px 98px' }}>
          <path d={capsule(26, 14)} transform="translate(86 98) rotate(-39)" className={styles.coat} />
          <circle cx="105" cy="82" r="7" className={styles.coat} />
        </g>

        <Ear x={54} y={36} deg={-101} len={45} wid={16} className={styles.earFlick} />
        {/* The flop is a closed curve rather than a capsule — a bent capsule
            is a bent stick, and an ear that bends has to get FATTER at the
            fold, which only a drawn outline does. */}
        <g className={styles.earFlop} style={{ transformOrigin: '72px 38px' }}>
          <path
            d="M 72 38 C 70 20 78 4 91 5 C 102 6 104 18 95 25 C 87 31 77 32 72 38 Z"
            className={styles.coat}
          />
          <path
            d="M 75 34 C 74 21 80 11 89 11.5 C 96 12 97 19 91 23 C 85 27 79 29 75 34 Z"
            className={styles.pink}
          />
        </g>

        <ellipse cx="62" cy="56" rx="27" ry="25" className={styles.coat} />
        <Whiskers x={62} y={64} reach={30} />
        <Blush x={62} y={65} gap={19} />
        <Shut x={51} y={55} />
        <Shut x={73} y={55} />
        <Snout x={62} y={63} open />
      </g>
    </>
  )
}

/* Each pose owns its own frame. A shared box would have to be the union of
   all five — tall enough for the thought bubble AND wide enough for the loaf
   — which would hang dead space off every one of them and make `size` mean a
   different amount of rabbit in each place it is used.

   THE FRAME MUST CONTAIN THE INK, and `think` did not: measured, its drawing
   ran from y −13.1 to y 142 inside a box declared as 0 → 146, so the ears
   stood a full 13 units outside their own frame. Nothing clips, so the rabbit
   looked correct in isolation and quietly broke every container it was put
   in — the Home card reserves 32px of padding above it and got 11, because
   the ears had already spent the other 21 climbing out of the box. A drawing
   whose bounds lie about its size cannot be laid out against anything.

   Hence `y`: the frame's own origin, not a nudge applied at the call site. A
   margin in the card would have hidden this in one place and left it waiting
   in the next. `x` is here for the same reason, unused so far because no pose
   has yet run out of the sides. */
const POSES: Record<
  Pose,
  { x?: number; y?: number; w: number; h: number; art: () => React.ReactElement }
> = {
  /* The z's climb out of the top, so the same 3-units-of-clearance rule
     applies here as everywhere: ink from −9.8, frame from −13. */
  sleep: { y: -13, w: 150, h: 117, art: Sleep },
  /* −16 clears the ears with ~3 units to spare, matching the ~4 the shadow
     already leaves at the foot — the drawing sits in its box rather than
     against the lid. */
  think: { y: -16, w: 124, h: 162, art: Think },
  write: { y: -13, w: 128, h: 159, art: Write },
  /* The only frame with a reason to end where it does: the ledge at y 79 IS
     the bottom of this composition, and the 88 it used to declare hung 8 units
     of nothing under a drawing that is meant to stop dead at an edge. Ends 3
     units past the rail, opens 15 above so the ears clear their own crane. */
  peek: { y: -15, w: 118, h: 99, art: Peek },
  wave: { y: -22, w: 126, h: 160, art: Wave },
}

interface Props {
  pose: Pose
  /** Rendered width in px; height follows the pose's own ratio. */
  size?: number
  className?: string
}

/** Decorative in every placement: the rabbit illustrates a sentence that is
    always right next to it, so a label here would say the same thing twice to
    a screen reader. */
function Bun({ pose, size = 150, className }: Props) {
  const { x = 0, y = 0, w, h, art: Art } = POSES[pose]
  return (
    <svg
      className={[styles.bun, className].filter(Boolean).join(' ')}
      viewBox={`${x} ${y} ${w} ${h}`}
      width={size}
      height={Math.round((size * h) / w)}
      aria-hidden="true"
      focusable="false"
    >
      <Art />
    </svg>
  )
}

export default Bun
