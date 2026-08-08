/* THE SOFA, THE READER AND THE DOG — the owner's own pick.

   This is the animation the owner sent (a LottieFiles vector, same free
   licence as the rabbit), not a redrawing of it: a woman lying the length of
   the sofa with her book held over her face, a dog sitting up beside her.
   `lounge.json` is that file put through one deterministic pass — its own
   table, mug, lamp, wall pictures and floor line stripped out, because it is
   moving into a room that already has all of those, and its stock palette
   re-inked to Flyleaf's tokens so it arrives wearing the app's colours.
   The pass lives outside the repo; the JSON is the artefact.

   IT PLAYS ONLY WHILE THE LAMP IS LIT. Unlit, the frame holds and the room's
   dim settles over it — resting, not switched off. The player itself is the
   rabbit's: same lazy import, same offscreen/hidden-tab pause, same
   reduced-motion hold on a clean frame. */

import { useEffect, useRef } from 'react'
import type { AnimationItem } from 'lottie-web'
import s from './nook.module.css'

/* The square is 1080 but the art is a sofa: everything drawn lives in this
   box (measured as the union of drawn bounds across the loop). Honouring the
   full canvas would spend two thirds of the scene's box on empty air. */
const CROP = '105 481 817 327'

/** Held frame for reduced motion and for the unlit room on first paint: the
    dog is up and settled, the page mid-rest — the loop's calmest moment. */
const STILL = 60

export default function Lounge({ lit }: { lit: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  /* The play/pause decision, owned by the async block below once the player
     exists. A ref rather than state: nothing about the DOM changes when the
     lamp toggles, only the playhead. */
  const settle = useRef<() => void>(() => {})
  const isLit = useRef(lit)
  isLit.current = lit

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
        import('./lounge.json'),
      ])
      if (stale || !host.current) return

      anim = player.default.loadAnimation({
        container: host.current,
        renderer: 'svg',
        loop: true,
        autoplay: false,
        animationData: art.default,
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet', viewBoxSize: CROP },
      })

      if (still) {
        anim.goToAndStop(STILL, true)
        return
      }

      anim.goToAndStop(STILL, true)

      let onScreen = true
      settle.current = () => {
        if (!anim) return
        if (isLit.current && onScreen && !document.hidden) anim.play()
        else anim.pause()
      }
      watch = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting
        settle.current()
      })
      watch.observe(box)
      onVisibility = () => settle.current()
      document.addEventListener('visibilitychange', onVisibility)
      settle.current()
    })()

    return () => {
      stale = true
      settle.current = () => {}
      watch?.disconnect()
      if (onVisibility) document.removeEventListener('visibilitychange', onVisibility)
      anim?.destroy()
    }
  }, [])

  /* The lamp toggling re-runs the standing decision; it never rebuilds the
     player, so the animation resumes from where the dark caught it. */
  useEffect(() => {
    settle.current()
  }, [lit])

  // Presentation only: the wrapper carries the whole scene's description.
  return <div ref={host} className={s.lounge} aria-hidden="true" />
}
