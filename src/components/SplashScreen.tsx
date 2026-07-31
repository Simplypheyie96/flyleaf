import { useEffect, useState } from 'react'
import styles from './SplashScreen.module.css'

const MIN_SHOW_MS = 650
const FADE_MS = 400
/* Hard ceiling: on a slow or flaky connection `document.fonts.ready` can
   hang indefinitely, which would strand the reader on the splash. */
const MAX_WAIT_MS = 2000

/** Launch splash: leaf mark on the sky, gone once fonts settle. */
function SplashScreen() {
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    let fadeTimer: number
    const minDelay = new Promise((r) => setTimeout(r, MIN_SHOW_MS))
    const fontsSettled = Promise.race([
      document.fonts.ready,
      new Promise((r) => setTimeout(r, MAX_WAIT_MS)),
    ])
    Promise.all([fontsSettled, minDelay]).then(() => {
      setLeaving(true)
      fadeTimer = window.setTimeout(() => setGone(true), reduceMotion ? 0 : FADE_MS)
    })
    return () => clearTimeout(fadeTimer)
  }, [])

  if (gone) return null
  return (
    <div
      className={[styles.splash, leaving && styles.leaving]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
    >
      <img className={styles.mark} src="/leaf-icon.svg" alt="" />
      <span className={styles.wordmark}>Flyleaf</span>
    </div>
  )
}

export default SplashScreen
