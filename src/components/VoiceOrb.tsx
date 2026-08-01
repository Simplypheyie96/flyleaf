import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { PauseIcon, PlayIcon } from './TabIcons'
import styles from './VoiceOrb.module.css'

interface VoiceOrbProps {
  /** The recording itself, held on the device. Absent until one is made. */
  media?: Blob
  /** Seconds, read off the recording when it was made. */
  duration?: number
  /** Stable per memo, so a memo's trace is the same trace every time. */
  seed: number
  /** For the button's accessible name — "Play the memo kept on 21 June". */
  label: string
}

const BARS = 34

/** The trace beside the orb.
 *
 *  A real waveform needs the recording decoded, which means holding the whole
 *  thing in memory to draw sixty pixels of ornament — so until a memo carries
 *  peaks of its own, the shape is derived from the memo's id. Deterministic on
 *  purpose: a trace that reshuffled on every render would be the one thing on
 *  this screen that is visibly not a record of anything.
 *
 *  Two sines of unrelated period, which is enough to read as speech: runs of
 *  loud syllables with quiet between, rather than the even comb that one sine
 *  or a random number generator both give you. */
function trace(seed: number) {
  const bars: number[] = []
  for (let i = 0; i < BARS; i += 1) {
    const a = Math.sin(seed * 0.7 + i * 0.55)
    const b = Math.sin(seed * 1.9 + i * 0.21)
    // Never to nothing: a bar at zero looks like a gap in the recording.
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
          style={{ '--h': `${Math.round(height * 100)}%` } as CSSProperties}
        />
      ))}
    </div>
  )
}

/** A kept voice memo: the orb, its trace, and how long it runs.
 *
 *  The orb is the button. Not an orb with a play triangle parked beside it —
 *  the whole object is the target, which is how it earns being 56px across on
 *  a screen whose minimum is 44.
 *
 *  It is still until it is playing. The plan asks for a softly-pulsing orb,
 *  and a page of memos all breathing at once turns a quiet scrapbook into an
 *  aquarium; worse, it spends the motion before it means anything. Held back,
 *  the pulse becomes the thing that tells you which memo is talking. */
function VoiceOrb({ media, duration, seed, label }: VoiceOrbProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [at, setAt] = useState(0)
  const bars = useMemo(() => trace(seed), [seed])

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

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void audio.play()
    else audio.pause()
  }

  return (
    <div
      className={styles.memo}
      style={{ '--played': played } as CSSProperties}
      data-playing={playing || undefined}
    >
      <button
        type="button"
        className={styles.orb}
        onClick={toggle}
        disabled={!src}
        aria-label={playing ? `Pause ${label}` : `Play ${label}`}
      >
        {/* The bloom the orb casts on the card. Its own element because it is
            the only part that grows while playing, and growing the orb itself
            would drag the glyph out of shape with it. */}
        <span className={styles.halo} aria-hidden="true" />
        <span className={styles.glyph}>
          {playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
        </span>
      </button>

      <div className={styles.trace}>
        <Bars bars={bars} className={styles.bars} />
        {/* The same trace again, lit, clipped to how far in we are. Two rows
            rather than one row of two-tone bars: a bar is 3px wide, and the
            boundary has to be able to fall inside one. */}
        <Bars bars={bars} className={styles.barsPlayed} />
      </div>

      {total > 0 && (
        <p className={styles.elapsed}>
          {playing || at > 0 ? clock(at) : clock(total)}
        </p>
      )}

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
