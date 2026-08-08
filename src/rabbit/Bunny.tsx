/* The rabbit.

   One drawn, rigged animal, posed into five states — see poses.ts for the rig
   and why every state is an offset rather than a redrawing. One animal is the
   whole point: there was briefly a second, hand-drawn rabbit for the sleeping
   state, and two drawings of the same character in one app is a thing readers
   notice immediately. Sleep is a pose now.

   **It arrives late on purpose.** The art and the player together are about a
   hundred kilobytes, and every place the rabbit appears is a place where
   nothing else is happening: an empty shelf, a book with no keeps, a first
   run. None of that is on the critical path to reading, so both halves are
   fetched only once a rabbit is actually mounted, and the space it will fill
   is held from the first frame so the copy under it never jumps.

   **It stops when nobody is watching.** Offscreen, and in a hidden tab, the
   animation pauses — an SVG this detailed redrawing sixty times a second
   behind three screens of scroll is heat for nothing.

   **Reduced motion gets the pose, not the loop.** The whole point of these is
   the posture; the breathing is the seasoning. A reader who has asked for
   stillness still gets a sleeping rabbit on the empty shelf, held on one
   frame. */

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { AnimationItem } from 'lottie-web'
import { posed, speedOf, type Pose } from './poses'
import styles from './bunny.module.css'

interface BunnyProps {
  pose: Pose
  /** Side of the square the rabbit is drawn in, in px. Every pose is the same
   *  sitting animal, so this is a side and not a width — a rabbit asked for at
   *  132 occupies 132 in both directions whatever mood it is in. */
  size?: number
  className?: string
  /** Fired the moment the art exists on screen. For the one caller that has to
   *  wait on the rabbit rather than merely hold space for it — the splash,
   *  which is not allowed to leave before the thing it is introducing has
   *  arrived. Held in a ref so an inline arrow from a re-rendering parent
   *  cannot tear the animation down and rebuild it. */
  onDrawn?: () => void
}

/** The frame held when motion is turned down. Far enough into the loop that
    the body has settled out of its opening stretch and the pose reads clean. */
const STILL = 40

/** The square actually worth drawing, inside the art's own 1500×1500 board.

    The animal is drawn small and low in that board, so honouring the full
    canvas spends a third of every box on empty air and hands back a rabbit two
    thirds the size that was asked for. This crop is measured, not guessed: the
    union of the drawn bounds across all five poses at six frames apiece, so
    the splayed ears of `sleep` and the raised arm of `wave` — the two that
    reach furthest — both stay inside it with room to spare. */
const CROP = '164 162 1160 1160'

function Bunny({ pose, size = 132, className, onDrawn }: BunnyProps) {
  const host = useRef<HTMLDivElement>(null)
  const [drawn, setDrawn] = useState(false)
  const told = useRef(onDrawn)
  told.current = onDrawn

  useEffect(() => {
    const box = host.current
    if (!box) return

    let stale = false
    let anim: AnimationItem | null = null
    let watch: IntersectionObserver | null = null
    let onVisibility: (() => void) | null = null

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    void (async () => {
      const [player, art] = await Promise.all([
        import('lottie-web/build/player/lottie_light'),
        import('./bunny.json'),
      ])
      if (stale || !host.current) return

      anim = player.default.loadAnimation({
        container: host.current,
        renderer: 'svg',
        loop: true,
        autoplay: !still,
        animationData: posed(art.default, pose),
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet', viewBoxSize: CROP },
      })

      setDrawn(true)
      told.current?.()

      if (still) {
        anim.goToAndStop(STILL, true)
        return
      }

      anim.setSpeed(speedOf(pose))

      // Only run while it is both on screen and in the front tab. Two separate
      // signals, so coming back from another tab does not restart a rabbit
      // that has meanwhile been scrolled away from.
      let onScreen = true
      const settle = () => {
        if (!anim) return
        if (onScreen && !document.hidden) anim.play()
        else anim.pause()
      }
      watch = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting
        settle()
      })
      watch.observe(box)
      onVisibility = settle
      document.addEventListener('visibilitychange', onVisibility)
    })()

    return () => {
      stale = true
      watch?.disconnect()
      if (onVisibility) document.removeEventListener('visibilitychange', onVisibility)
      anim?.destroy()
    }
  }, [pose])

  return (
    <div
      ref={host}
      className={[styles.bunny, className].filter(Boolean).join(' ')}
      style={
        { '--bunny-size': `${size}px` } as CSSProperties
      }
      data-drawn={drawn || undefined}
      // A mood, not information. Every rabbit in the app sits above a line of
      // copy that already says what the screen means, so announcing "a
      // sleeping rabbit" would be the sentence twice, the second time in a
      // voice the reader cannot skim past.
      aria-hidden="true"
    />
  )
}

export default Bunny
export type { Pose }
