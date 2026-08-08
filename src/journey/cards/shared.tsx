/* The three things all seven cards need whatever direction they are drawn in:
   a way to look at an attached blob, the stance line, and the props shape.

   Deliberately small. The moment this file starts holding layout, the three
   directions stop being three directions and become one template with three
   skins — which is exactly the failure the directions exist to fix. */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Entry } from '../../data/db'
import { STANCE } from '../kinds'
import { waveBars } from './art'
import { peaks } from '../sound'

export interface CardProps {
  keep: Entry
}

/** A blob, as something an `img` can be pointed at. The handle is released on
    the way out; a journey scrolled end to end would otherwise leak one per
    picture it passed. */
export function useObjectUrl(blob: Blob | undefined) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) return
    const made = URL.createObjectURL(blob)
    setUrl(made)
    return () => {
      URL.revokeObjectURL(made)
      setUrl(undefined)
    }
  }, [blob])
  return url
}

/** Playback for the directions that draw their own transport instead of using
    the orb. One `Audio` per card, torn down on the way out, and a normalised
    0–1 position so a card can draw progress however it likes — a filled cord, a
    swept waveform, a moving hairline. */
export function usePlayback(media: Blob | undefined) {
  const url = useObjectUrl(media)
  const player = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [at, setAt] = useState(0)
  /* Read off the file rather than off the row. A keep normally carries the
     length it was recorded at, but one restored from a journey file written by
     an older version may not, and a card that cannot say how long a recording
     is cannot offer to seek within it. */
  const [length, setLength] = useState(0)

  useEffect(() => {
    if (!url) return
    const audio = new Audio(url)
    player.current = audio
    const tick = () => setAt(audio.duration ? audio.currentTime / audio.duration : 0)
    const measure = () => setLength(Number.isFinite(audio.duration) ? audio.duration : 0)
    const done = () => {
      setPlaying(false)
      setAt(0)
    }
    audio.addEventListener('loadedmetadata', measure)
    audio.addEventListener('timeupdate', tick)
    audio.addEventListener('ended', done)
    return () => {
      audio.pause()
      audio.removeEventListener('loadedmetadata', measure)
      audio.removeEventListener('timeupdate', tick)
      audio.removeEventListener('ended', done)
      player.current = null
      setPlaying(false)
      setAt(0)
      setLength(0)
    }
  }, [url])

  const toggle = () => {
    const audio = player.current
    if (!audio) return
    if (audio.paused) {
      void audio.play()
      setPlaying(true)
    } else {
      audio.pause()
      setPlaying(false)
    }
  }

  /** Go to a fraction of the way in. Set optimistically as well as on the
      element, because `timeupdate` does not fire until the next frame of audio
      has been decoded and the playhead should land under the finger rather
      than a moment after it. */
  const seek = (p: number) => {
    const audio = player.current
    if (!audio?.duration) return
    const to = Math.min(1, Math.max(0, p))
    audio.currentTime = to * audio.duration
    setAt(to)
  }

  return { playing, at, length, toggle, seek, ready: Boolean(url) }
}

/** The recording's own shape, in `count` bars, each 0–1.
 *
 *  The real peaks, decoded off the blob, with the seeded stand-in drawn until
 *  they arrive and left in place for good if they never do — a codec this
 *  browser cannot read, or a memo whose recording is not on this device.
 *
 *  It matters that this is the real thing. A trace derived from the row's id is
 *  a decoration that happens to be shaped like sound: the loud part of it is
 *  not where the reader raised their voice, and the pause in the middle is not
 *  where they stopped to think. Once you can scrub by it, an invented shape is
 *  worse than none — it points at moments that are not there. */
export function useWave(media: Blob | undefined, seed: number, count: number) {
  const stand = useMemo(() => waveBars(seed, count), [seed, count])
  const [real, setReal] = useState<number[]>()

  useEffect(() => {
    if (!media) {
      setReal(undefined)
      return
    }
    let alive = true
    peaks(media, count)
      .then((shape) => {
        if (alive) setReal(shape)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [media, count])

  return real ?? stand
}

/** m:ss. Used on every voice card in every direction — the one thing about a
    recording that has no room for interpretation. */
export function clock(seconds: number | undefined) {
  /* Zero is a reading, not a gap: a memo sitting at its own start is at 0:00,
     and only a length nobody knows gets the dashes. */
  if (seconds === undefined || !Number.isFinite(seconds)) return '—:——'
  const whole = Math.round(seconds)
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

/** How sure the reader was, in a word. Each direction hands in its own classes,
    because the line has to look like it belongs to the object it is sitting on
    rather than like a visitor from another card.

    Threads only, and that is the whole rule. Every other kind already says what
    it is by being what it is: a quote is a quote, a picture is a picture, and a
    label underneath is a caption on a photograph of itself. A plot thread is
    the one kind carrying something its own shape cannot spell — *hunch*,
    *suspicion*, *certain*.

    It is a word rather than only a count. Each direction already draws how sure
    the reader was as something you can count — knots in a cord, strokes in the
    margin, ticks struck off a ledger — and counting is the right instinct, but
    a mark with nothing to decode it against is a private language: three dots
    on a string is not *certain* to anybody who was not there when it was tied.
    So the word is set once at the foot, and the count stays as its echo. It is
    a state and not a filter, so it is a span and not a button — there is
    nothing here to press. */
export function Stance({
  keep,
  footClass,
  stanceClass,
}: CardProps & { footClass: string; stanceClass: string }) {
  if (keep.type !== 'thread') return null
  const stance = keep.stance ?? 'hunch'
  return (
    <div className={footClass}>
      <span className={stanceClass} data-stance={stance}>
        {STANCE[stance].label}
      </span>
    </div>
  )
}
