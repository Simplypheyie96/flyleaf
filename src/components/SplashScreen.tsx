import { useCallback, useEffect, useState } from 'react'
import Wordmark, { Mark } from '../brand/Wordmark'
import Bunny from '../rabbit/Bunny'
import PaperSurface from './PaperSurface'
import styles from './SplashScreen.module.css'

/* The launch splash — the app's first sentence, said before anything is asked.

   It used to be a leaf and a word for two thirds of a second, which is a
   loading screen rather than a greeting: long enough to register that
   something flashed, too short to read. A splash that brief is worth less than
   no splash at all, because it costs the same wait and returns nothing for it.

   So it says three things now, in the order a stranger needs them: someone is
   pleased you came (the rabbit, waving), what this is called (the mark and the
   word), and what it is for (one line). None of that is a second onboarding —
   the welcome behind it does the asking. This only has to make the wait mean
   something.

   AND THEN IT WAS A FLAT PANEL WITH THREE THINGS STACKED ON IT, which is the
   round of feedback this version answers. Two faults, both structural:

   1. It painted its own two-stop gradient at `z-index: 100`, straight over the
      clouds and the grain — which live on `body::before` and `body::after` at
      `z-index: -1`. Every other screen in this app sits under weather. The
      splash, the one screen a reader cannot avoid, was the single flat surface
      in a project whose brief says a background is never one. The stylesheet
      draws the same sky now, from the same `--sky-clouds` value.

   2. Three centred objects down the middle of a screen is a list, not a
      composition, and nothing on it was a PLACE. So the name and the line are
      inscribed on an actual sheet of paper — the flyleaf the app is named for,
      the blank page at the front of a book where you write your name — and the
      rabbit stands on its top edge rather than floating above it. The two
      become one object with a reason to be next to each other.

   THE TIMING IS THE DESIGN. Three numbers, each answering a different failure:

   - MIN_SHOW never lets it flash on a warm start, where fonts are cached and
     everything is ready in 80ms.
   - GREET is the beat the rabbit gets AFTER it has landed. Its two chunks are
     the heaviest thing here, and without this the common case is a rabbit that
     appears exactly in time to fade out — the reader sees a smudge and wonders
     what they missed.
   - MAX_WAIT is the ceiling over all of it. `document.fonts.ready` can hang on
     a flaky connection and the rabbit may never arrive at all; neither is
     allowed to strand anybody on a screen they cannot dismiss. */

/** Never less than this, however fast the launch. Third tuning, by the
    owner's clock, not a stopwatch: 1.4s flashed, 2s was "still a little
    fast", 3s is where the loader flowers get two full breaths and the
    bubble's word has time to be read as said. */
const MIN_SHOW_MS = 3000
/** And never less than this after the rabbit itself lands. */
const GREET_MS = 1400
/** The ceiling. Nothing holds the app past here — not fonts, not the rabbit. */
const MAX_WAIT_MS = 4200
const FADE_MS = 400

const after = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Dev only: `?splash` holds it open. A screen that exists for a second and a
 *  half cannot be looked at properly while it is being designed, and every way
 *  of catching it from outside lands either before it has assembled or after it
 *  has gone. Behind `import.meta.env.DEV`, so it leaves the production bundle
 *  with the rest of the dead branch — same shape as `?first` and `?bare`. */
const PREVIEW_HOLD =
  import.meta.env.DEV && new URLSearchParams(window.location.search).has('splash')

function SplashScreen() {
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)

  /* Resolved by the rabbit itself, through `onDrawn`. A promise rather than
     state: the effect below has to await it, and re-rendering the splash while
     it is counting down would only restart the count.

     Built in a lazy `useState` initialiser and NOT in a `useRef` — this is the
     difference between working and silently never firing. `useRef(new
     Promise(…))` runs its executor on every render and keeps only the first
     result, so React's development double-render hands the resolver of a
     THROWN-AWAY promise to whoever asks; the promise actually being awaited is
     then never resolved and the splash sits out its whole ceiling with an empty
     box where the rabbit should be. An initialiser closes over its own pair, so
     a discarded run discards both halves together. */
  const [gate] = useState(() => {
    let land = () => {}
    const done = new Promise<void>((resolve) => {
      land = resolve
    })
    return { done, land }
  })
  const drawn = useCallback(() => gate.land(), [gate])

  useEffect(() => {
    if (PREVIEW_HOLD) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let fadeTimer: number
    let live = true

    /* Everything the splash is waiting for, in one promise: the fonts (so the
       wordmark does not re-flow under the reader), the rabbit, and its beat. */
    const ready = (async () => {
      await Promise.race([document.fonts.ready, after(MAX_WAIT_MS)])
      await gate.done
      await after(GREET_MS)
    })()

    void Promise.race([Promise.all([ready, after(MIN_SHOW_MS)]), after(MAX_WAIT_MS)]).then(() => {
      if (!live) return
      setLeaving(true)
      fadeTimer = window.setTimeout(() => setGone(true), still ? 0 : FADE_MS)
    })

    return () => {
      live = false
      clearTimeout(fadeTimer)
    }
  }, [])

  if (gone) return null
  return (
    <div
      className={[styles.splash, leaving && styles.leaving].filter(Boolean).join(' ')}
      /* The whole screen is decorative and temporary. A reader on a screen
         reader is already being handed the app underneath it; announcing a
         splash they cannot act on and cannot skip is noise in front of the
         thing they came for. */
      aria-hidden="true"
    >
      {/* Three blossoms adrift in the sky, at 6–9% ink.

          The same mark, three sizes, far enough back to be weather rather than
          logos. It is the one bit of decoration here that is not borrowed: the
          rosette is already stitched into every generated cover in the
          library, so a reader who sees these on the way in meets the shape
          before it ever has to work as a mark. Behind the paper, and slow
          enough that you notice them on the second launch, not the first. */}
      <div className={styles.blossoms}>
        <Mark size={26} className={styles.driftA} />
        <Mark size={17} className={styles.driftB} />
        <Mark size={13} className={styles.driftC} />
      </div>

      <div className={styles.scene}>
        {/* Waving, and the same rabbit that lives in the empty states — the
            first time a reader meets it, it is saying hello rather than
            sitting in a gap where their own writing will go.

            Standing ON the sheet, not above it. Its drawn feet sit at about
            0.95 of its own box, so the paper only has to come up a dozen
            pixels for the two to touch; see the negative margin in the
            stylesheet. */}
        {/* "Welcome", said by the one who was already saying it. A wave
            reads as a wave; the bubble puts the word on it, arriving a beat
            after the rabbit so it is spoken rather than printed. */}
        <span className={styles.bubble}>Welcome</span>

        <Bunny pose="wave" size={124} onDrawn={drawn} className={styles.rabbit} />

        {/* THE FLYLEAF ITSELF. The blank page at the front of a book, where a
            reader historically wrote their name — which is where this app's
            name comes from and what it is for. Putting the inscription on real
            paper is the shortest way to say that without a paragraph.

            Not taped: the rabbit is already standing on the top edge, tape
            would collide with it, and a flyleaf is bound in rather than stuck
            down. The tilt is the same hand-placed degree the scrapbook cards
            use. */}
        <PaperSurface rotate={-1.2} className={styles.leaf}>
          {/* The real lockup, not a second copy of it. This screen used to
              hand-roll its own mark and word, which is how it ended up with a
              20px name and its own spacing bug; now it renders the component
              every other surface renders and inherits the fix. */}
          <Wordmark size={44} />

          {/* What it is, in one line, and deliberately NOT the etymology. The
              welcome behind this already opens on where the word comes from,
              and hearing it twice before you have done anything is a lecture.
              This answers the only question a stranger is actually asking on a
              splash screen: what will this do for me. */}
          <p className={styles.line}>Your own page in every book you read.</p>
        </PaperSurface>

        {/* THE LOADER — the three flowers the owner asked to keep, doing a
            job. They breathe in sequence under the paper for as long as the
            splash holds, which is what turns the longer dwell from "slow"
            into "arriving". Same mark as everything else; reduced motion
            holds them still at mid-breath. */}
        <div className={styles.loader}>
          <Mark size={13} className={styles.petalA} />
          <Mark size={13} className={styles.petalB} />
          <Mark size={13} className={styles.petalC} />
        </div>
      </div>
    </div>
  )
}

export default SplashScreen
