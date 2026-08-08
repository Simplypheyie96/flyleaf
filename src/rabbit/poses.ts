/* The rabbit's states, all posed on one rig.

   The art is a single rigged character — a body that breathes, a head that
   sways, two ears, two hands, a tail, each on its own rotation track, and a
   pair of eyelids inside the head with a blink of their own. Nothing in this
   file draws a rabbit. Every state is that same drawing with its joints moved,
   which is why the five of them read as one animal in five moods rather than
   five animals with a family resemblance.

   SLEEP IS ONE OF THEM AGAIN, and that is a correction. It was briefly a second
   hand-drawn animal, lying down, because the rig has no hips to lay a sitting
   rabbit with. What that bought was a horizontal silhouette; what it cost was
   the character — a drawing with no outline, gradient fur and flat arcs for
   eyes standing next to a drawing with fine linework, lashes and glossy pupils.
   Two rabbits, and the reader can see it. Sleeping sitting up is a smaller
   claim than lying down and it is the true one: this is the same animal with
   its eyes shut. See `shut` below for how they close.

   **Offsets, never replacements.** The supplied animation is one continuous
   shy idle: the head drifts, the ears flick, the chest rises and falls, the
   eyes wander. Adding a constant to a joint's whole track moves that limb and
   leaves every bit of the life in it — so the waving rabbit is still breathing
   while it waves. Overwriting a track with a held value would give a posed
   statue instead, which is the thing the drawing was chosen to avoid.

   **Swing scales what is already there.** A joint inherits the idle's own
   drift; multiplying its deviation from the track's own resting value widens
   that without inventing keyframes or timing — the easing the animator set
   stays exactly as it was, it just travels further.

   **One track is written from scratch, and only one.** The arm has a single
   slow 18° sag per loop, down between frames 11 and 43 and back up by 132.
   Scaled up that is still one slow sag, so no multiplier turns it into a
   greeting; there is no wave in the source to widen. `wag` overwrites that one
   rotation with a real oscillation. Everything else on the waving rabbit —
   breathing, ears, head, blink — is untouched, so it is still the same animal
   with one limb re-animated rather than a second character. */

/** The joints worth moving. Feet exist on the rig too and are deliberately
    left alone: the rabbit is sitting in every one of these, and a moved foot on
    a sitting animal reads as a mistake rather than a pose. */
type Joint = 'Head' | 'C < Ear >' | 'C < Ear 2 >' | 'Left-Hand' | 'Right-Hand' | 'Tail'

interface Rig {
  /** Degrees added to the joint's whole rotation track. Positive turns
   *  clockwise on screen. The head sits on a low pivot, so it is the one joint
   *  where ±15 is already a strong tilt and ±60 throws the face off the body. */
  turn?: Partial<Record<Joint, number>>
  /** How much further the joint's own idle movement travels. 1 is the source. */
  swing?: Partial<Record<Joint, number>>
  /** A rotation written over the joint's own, oscillating `sweep` degrees
   *  either side of `at` a given number of times per loop. */
  wag?: Partial<Record<Joint, { at: number; sweep: number; cycles: number }>>
  /** Hold both eyelids down for the whole loop. See `shutEyes`. */
  shut?: boolean
  /** Playback rate. A thinking rabbit moves slower than a waving one, and that
   *  has to be in the breathing or the pose is only a shape. */
  speed?: number
}

export type Pose = 'wave' | 'think' | 'peek' | 'waiting' | 'sleep'

export const POSES: Record<Pose, Rig> = {
  /* Hello. One paw up beside the jaw, waving — the only state where the rabbit
     is addressing the reader rather than being watched.

     The arm is the one joint that had to be re-animated. Its idle is a single
     slow 18° sag, down between frames 11 and 43 and back up by 132; widening
     that gives a slower, larger sag, never a greeting. So it waves properly:
     four passes per loop, which at speed 1.1 lands a little under two thirds
     of a second each — a hand moving at the speed a hand actually moves.

     `at` is absolute, unlike `turn` — the track is being written, not nudged,
     so it is stated where the joint actually sits rather than as a distance
     from its −180 rest. The arc is 52° wide: −376 puts the paw up beside the
     cheek and −428 sends it out level with the shoulder. That width is what
     the shoulder allows rather than what a wave would ideally be, the arm
     being short and set low — 32° either side was tried and it both grazes the
     cheek fur at the top and drops the arm limp at the bottom. Any higher and
     the paw crosses the face, which is `think` and `peek`. */
  wave: {
    turn: { Head: -4 },
    wag: { 'Left-Hand': { at: -402, sweep: 26, cycles: 4 } },
    speed: 1.1,
  },

  /* A paw at the cheek and the head tilted over: nothing is open, and the
     rabbit is waiting on it too. The cocked ear is what stops this reading as
     shyness — an ear turned outward is an animal listening for something. */
  think: {
    turn: { 'Right-Hand': 150, Head: 12, 'C < Ear >': 18 },
    speed: 0.9,
  },

  /* Both paws up at the face, peering between them. This is the one that has
     to say *searching* rather than *hiding*, so the head stays up and the
     idle's own eye-wander does the looking. */
  peek: {
    turn: { 'Left-Hand': -150, 'Right-Hand': 150, Head: 8 },
    swing: { Head: 1.5 },
  },

  /* Sitting up, ears pricked forward, chin lifted — attentive, waiting for a
     first line nobody has written yet.

     NO PAW HERE, and that took a sweep to settle. Every raised-paw value was
     already spoken for: low ones land at the cheek and become `think`, high
     ones swing the arm out and become `wave`. The distinctive thing about
     waiting is not a gesture, it is attention — so it is the ears that turn,
     inward and forward. */
  waiting: {
    turn: { Head: 6, 'C < Ear >': 14, 'C < Ear 2 >': -14 },
    speed: 0.95,
  },

  /* Asleep sitting up. Eyes shut, chin down, both ears folded outward and back,
     breathing at just over half rate.

     THE EARS DO THE SLEEPING, more than the eyes do. Closed eyes on their own
     read as *content* — a rabbit enjoying itself — because everything else
     about the pose is still alert. Ears are the tell: awake they stand, asleep
     they go over. Note the signs: the ear joints mirror each other, so outward
     is NEGATIVE on `C < Ear >` and positive on its twin. Same magnitudes with
     the signs swapped fold them inward instead, which is a rabbit listening.
     34° is as far as this rig takes them before the tips leave the crop, and it
     is enough — the silhouette goes from two uprights to a soft V and the
     animal reads as off duty from across the screen.

     The head turn is small on purpose. It sits on a low pivot, so 10 is already
     a chin dropping onto the chest; more and the face rolls off the body and
     the rabbit looks unwell rather than asleep.

     0.55 is the slowest speed used anywhere in the app. The idle is a shy
     breath at rest, and slowing it that far is what turns it into a sleeping
     one — the same track, half the rate, and nothing else needed. */
  sleep: {
    turn: { Head: 10, 'C < Ear >': -34, 'C < Ear 2 >': 34 },
    shut: true,
    speed: 0.55,
  },
}

/* ── Applying a rig ────────────────────────────────────────────────────── */

/** A Lottie keyframed property: `a: 1` with keyframes, or `a: 0` with a value.
    Typed loosely on purpose — this walks a third-party document format, and a
    faithful type for it would be longer than the code that uses it. */
type Prop = { a: 0 | 1; k: number | number[] | Keyframe[] }
type Keyframe = { t?: number; s?: number[]; e?: number[]; i?: Ease; o?: Ease }
type Ease = { x: number[]; y: number[] }
type Layer = { nm: string; ks: { r?: Prop; p?: Prop }; tm?: Prop }
type Comp = { id: string; layers: Layer[] }
type Doc = { op: number; layers: Layer[]; assets: Comp[] }

function keyframes(p: Prop): Keyframe[] {
  return Array.isArray(p.k) ? (p.k as Keyframe[]) : []
}

function turnBy(layer: Layer | undefined, degrees: number) {
  const r = layer?.ks.r
  if (!r) return
  if (r.a === 0) {
    r.k = (r.k as number) + degrees
    return
  }
  for (const kf of keyframes(r)) {
    if (kf.s) kf.s = kf.s.map((v) => v + degrees)
    if (kf.e) kf.e = kf.e.map((v) => v + degrees)
  }
}

/** Widen the joint's own movement about its resting value. A static joint has
    nothing to widen and is left alone rather than being given motion it never
    had — an ear that only moves in one pose is an ear that looks broken in
    the other four. */
function swingBy(layer: Layer | undefined, factor: number) {
  const r = layer?.ks.r
  if (!r || r.a === 0) return
  const frames = keyframes(r)
  const rest = frames[0]?.s?.[0]
  if (rest === undefined) return
  for (const kf of frames) {
    if (kf.s) kf.s = kf.s.map((v) => rest + (v - rest) * factor)
    if (kf.e) kf.e = kf.e.map((v) => rest + (v - rest) * factor)
  }
}

/** Ease either side of every sample, so the joint slows at the top and bottom
    of each pass the way a real one does instead of ticking between corners. */
const EASE_IN: Ease = { x: [0.5], y: [1] }
const EASE_OUT: Ease = { x: [0.5], y: [0] }

/** Overwrite a joint's rotation with a clean oscillation across the whole loop.
    Sampled eight times a cycle: enough that the eased segments read as one
    continuous arc, few enough that the track stays legible. The last sample
    lands back on the first value, so the loop has no seam. */
function wagAt(layer: Layer | undefined, at: number, sweep: number, cycles: number, loop: number) {
  const r = layer?.ks.r
  if (!r) return
  const samples = cycles * 8
  const track: Keyframe[] = []
  for (let i = 0; i <= samples; i++) {
    const phase = i / samples
    track.push({
      t: Math.round(phase * loop),
      s: [at + Math.sin(phase * cycles * 2 * Math.PI) * sweep],
      i: EASE_IN,
      o: EASE_OUT,
    })
  }
  r.a = 1
  r.k = track
}

/** The eyelids, held down.

    The blink is not a shape being drawn — it is a time remap on two precomp
    layers inside the head. The lid comp is scrubbed to 0.183s while the eye is
    open and dipped to 0 for the third of a second the lid is travelling. So
    pinning that remap to 0 does not remove the blink; it parks the rabbit at
    the bottom of one and leaves it there. Two numbers, and the eyes are shut
    for good — which is why sleep did not need a second drawing after all.

    Written over the existing keyframes rather than collapsing the track to a
    static value: the same track shape keeps working through every player path,
    and a two-line change that cannot alter timing is worth more here than a
    tidier one that might. The lids live inside the head precomp, so this is the
    one rig operation that has to look past the top-level layers. */
const SHUT = 0

function shutEyes(doc: Doc) {
  for (const comp of doc.assets ?? []) {
    for (const layer of comp.layers) {
      if (layer.nm !== 'R Eyelid' && layer.nm !== 'L Eyelid') continue
      const tm = layer.tm
      if (!tm) continue
      if (tm.a === 0) {
        tm.k = SHUT
        continue
      }
      for (const kf of keyframes(tm)) {
        if (kf.s) kf.s = kf.s.map(() => SHUT)
        if (kf.e) kf.e = kf.e.map(() => SHUT)
      }
    }
  }
}

/** How fast the pose lives. Kept beside the posture rather than in the
    component because a thinking rabbit breathing at a waving rabbit's rate is
    not thinking — the rate is part of the state, not a playback setting
    applied to it. */
export function speedOf(pose: Pose): number {
  return POSES[pose].speed ?? 1
}

/** A fresh copy of the animation with one pose applied. Always a copy: the
    loaded document is a module-level import shared by every rabbit on screen,
    and posing it in place would leave the last state applied to all of them. */
export function posed(base: unknown, pose: Pose): unknown {
  const doc = structuredClone(base) as Doc
  const rig = POSES[pose]
  const find = (nm: string) => doc.layers.find((l) => l.nm === nm)

  for (const [joint, degrees] of Object.entries(rig.turn ?? {})) {
    turnBy(find(joint), degrees)
  }
  for (const [joint, factor] of Object.entries(rig.swing ?? {})) {
    swingBy(find(joint), factor)
  }
  for (const [joint, { at, sweep, cycles }] of Object.entries(rig.wag ?? {})) {
    wagAt(find(joint), at, sweep, cycles, doc.op)
  }
  if (rig.shut) shutEyes(doc)
  return doc
}
