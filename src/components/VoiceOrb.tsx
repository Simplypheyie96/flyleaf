import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { PauseIcon, PlayIcon } from './TabIcons'
import { peaks } from '../journey/sound'
import styles from './VoiceOrb.module.css'

interface VoiceOrbProps {
  /** The recording itself, held on the device. Absent until one is made. */
  media?: Blob
  /** Seconds, read off the recording when it was made. */
  duration?: number
  /** Stable per memo, so the stand-in trace is the same trace every time. */
  seed: number
  /** For the controls' accessible names — "Play the memo kept on 21 June". */
  label: string
}

const BARS = 40

/** The stand-in trace, used for the half-second before the real one arrives
 *  and for the case where a memo's recording is not on this device.
 *
 *  Deterministic on purpose: a shape that reshuffled on every render would be
 *  the one thing on this screen visibly not a record of anything. Two sines of
 *  unrelated period, which is enough to read as speech — runs of loud
 *  syllables with quiet between, rather than the even comb a single sine or a
 *  random number generator both give you. */
function stand(seed: number) {
  const bars: number[] = []
  for (let i = 0; i < BARS; i += 1) {
    const a = Math.sin(seed * 0.7 + i * 0.55)
    const b = Math.sin(seed * 1.9 + i * 0.21)
    bars.push(0.22 + 0.78 * Math.abs(a * 0.6 + b * 0.4))
  }
  return bars
}

function clock(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

function Bars({ bars, className }: { bars: number[]; className: string }) {
  return (
    <div className={className} aria-hidden="true">
      {bars.map((height, i) => (
        <span
          key={i}
          className={styles.bar}
          /* The index rides along so a playing trace can ripple: each bar's
             bob is offset from its neighbour's by a beat. */
          style={{ '--h': `${Math.round(height * 100)}%`, '--i': i } as CSSProperties}
        />
      ))}
    </div>
  )
}

/** A kept voice memo.
 *
 *  THE WAVE IS THE OBJECT NOW. This was a 48px lit sphere with a play triangle
 *  in it and a thin decorative trace tucked in beside it, and both halves of
 *  that were wrong. The trace was not a recording — it was two sine waves
 *  derived from the row's id, drawn at 32px in the sphere's shadow — so the
 *  only thing with any presence on the card was a circle, and a circle is not
 *  what a voice memo looks like. It is what a button looks like.
 *
 *  So the recording is decoded and its actual peaks are drawn, full width and
 *  tall enough to read across a room, with the played part lit behind the
 *  playhead. That is the memo. The orb keeps its job — the brief asks for one
 *  futuristic object in a scrapbook of paper and tape and this is it — but its
 *  job is to be the transport, sitting under the wave with the clock, not to
 *  be the whole card.
 *
 *  The wave is also where you scrub. A twenty-second memo you can only ever
 *  play from the top is a tape, and the shape is right there on screen saying
 *  where the loud parts are; not being able to go to one is a tease. */
function VoiceOrb({ media, duration, seed, label }: VoiceOrbProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [at, setAt] = useState(0)

  const fallback = useMemo(() => stand(seed), [seed])
  const [shape, setShape] = useState<number[]>()

  /* The real shape, once the recording has been read. Async and best-effort:
     a codec this browser cannot decode leaves the stand-in in place rather
     than leaving a hole in the card. */
  useEffect(() => {
    if (!media) {
      setShape(undefined)
      return
    }
    let alive = true
    peaks(media, BARS)
      .then((real) => {
        if (alive) setShape(real)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [media])

  const bars = shape ?? fallback

  /* An object URL is a handle on a blob that the page holds open. Revoked on
     the way out, and re-made whenever the blob changes, or a scrolled-through
     journey would leak one per memo it passed. */
  const [src, setSrc] = useState<string>()
  useEffect(() => {
    if (!media) return
    const url = URL.createObjectURL(media)
    setSrc(url)
    return () => {
      URL.revokeObjectURL(url)
      setSrc(undefined)
    }
  }, [media])

  const total = duration ?? audioRef.current?.duration ?? 0
  const played = total > 0 ? Math.min(1, at / total) : 0
  const live = Boolean(src) && total > 0

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void audio.play()
    else audio.pause()
  }

  function goTo(seconds: number) {
    const audio = audioRef.current
    if (!audio || !live) return
    const to = Math.min(total, Math.max(0, seconds))
    audio.currentTime = to
    // Optimistic, because timeupdate does not fire until the next frame of
    // audio and the playhead should land under the finger, not after it.
    setAt(to)
  }

  function scrub(event: PointerEvent<HTMLDivElement>) {
    if (!live) return
    const box = event.currentTarget.getBoundingClientRect()
    goTo(((event.clientX - box.left) / box.width) * total)
  }

  function nudge(event: KeyboardEvent<HTMLDivElement>) {
    if (!live) return
    const step = event.key === 'ArrowLeft' ? -5 : event.key === 'ArrowRight' ? 5 : 0
    if (step) {
      event.preventDefault()
      goTo(at + step)
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      goTo(0)
    }
    if (event.key === 'End') {
      event.preventDefault()
      goTo(total)
    }
  }

  return (
    <div
      className={styles.memo}
      style={{ '--played': played } as CSSProperties}
      data-playing={playing || undefined}
    >
      {/* A slider rather than a button, because what it sets is a position in
          a recording and not a yes or no. Arrow keys move five seconds, Home
          and End go to the ends — the same contract the platform's own audio
          element offers, so nobody has to learn this one. */}
      <div
        className={styles.wave}
        role="slider"
        tabIndex={live ? 0 : -1}
        aria-label={`Position in ${label}`}
        aria-disabled={live ? undefined : true}
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(at)}
        aria-valuetext={`${clock(at)} of ${clock(total)}`}
        onPointerDown={scrub}
        onKeyDown={nudge}
      >
        <Bars bars={bars} className={styles.bars} />
        {/* The same trace again, lit, clipped to how far in we are. Two rows
            rather than one row of two-tone bars: a bar is a few pixels wide,
            and the boundary has to be able to fall inside one. */}
        <Bars bars={bars} className={styles.barsPlayed} />
        <span className={styles.head} aria-hidden="true" />
      </div>

      <div className={styles.transport}>
        <button
          type="button"
          className={styles.orb}
          onClick={toggle}
          disabled={!src}
          aria-label={playing ? `Pause ${label}` : `Play ${label}`}
        >
          {/* The bloom the orb casts on the card. Its own element because it
              is the only part that grows while playing, and growing the sphere
              itself would drag the glyph out of shape with it. */}
          <span className={styles.halo} aria-hidden="true" />
          <span className={styles.glyph}>
            {playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
          </span>
        </button>

        {total > 0 && (
          <p className={styles.elapsed}>
            {clock(at)}
            <span className={styles.of}> / {clock(total)}</span>
          </p>
        )}
      </div>

      {src && (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setAt(e.currentTarget.currentTime)}
          onEnded={() => {
            setPlaying(false)
            setAt(0)
          }}
        />
      )}
    </div>
  )
}

export default VoiceOrb
