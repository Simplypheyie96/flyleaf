/* The three things all seven cards need whatever direction they are drawn in:
   a way to look at an attached blob, the motif chips, and the props shape.

   Deliberately small. The moment this file starts holding layout, the three
   directions stop being three directions and become one template with three
   skins — which is exactly the failure the directions exist to fix. */

import { useEffect, useRef, useState } from 'react'
import type { Entry } from '../../data/db'
import { STANCE } from '../kinds'

export interface CardProps {
  keep: Entry
  onMotif: (motif: string) => void
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

  useEffect(() => {
    if (!url) return
    const audio = new Audio(url)
    player.current = audio
    const tick = () => setAt(audio.duration ? audio.currentTime / audio.duration : 0)
    const done = () => {
      setPlaying(false)
      setAt(0)
    }
    audio.addEventListener('timeupdate', tick)
    audio.addEventListener('ended', done)
    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', tick)
      audio.removeEventListener('ended', done)
      player.current = null
      setPlaying(false)
      setAt(0)
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

  return { playing, at, toggle, ready: Boolean(url) }
}

/** m:ss. Used on every voice card in every direction — the one thing about a
    recording that has no room for interpretation. */
export function clock(seconds: number | undefined) {
  if (!seconds || !Number.isFinite(seconds)) return '—:——'
  const whole = Math.round(seconds)
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

/** The motif chips. Each direction hands in its own classes — the chips are a
    filter control, and a control has to look like it belongs to the object it
    is sitting on rather than like a visitor from another card.

    Threads only, and that is the whole rule. A tag under a quote is a caption
    on a photograph of itself: the card already says what it is, the knot in
    the gutter says it again, and a third label just adds a row of small white
    lozenges to every keep on the page. A plot thread is the one kind whose
    tag carries something the card cannot — *suspicion*, *hunch*, the name of
    the strand this belongs to — so it is the one kind that keeps them.

    The stance leads, and it is a word rather than only a count. Each direction
    already draws how sure the reader was as something you can count — knots in
    a cord, strokes in the margin, ticks struck off a ledger — and counting is
    the right instinct, but a mark with nothing to decode it against is a
    private language: three dots on a string is not *certain* to anybody who
    was not there when it was tied. So the word is set once, at the head of the
    row, and the count stays as its echo. The stance is a state, not a filter,
    so it is a span and not a button — nothing here is pressable except the
    strand names that follow it. */
export function Motifs({
  keep,
  onMotif,
  footClass,
  chipClass,
  stanceClass,
}: CardProps & { footClass: string; chipClass: string; stanceClass: string }) {
  if (keep.type !== 'thread') return null
  const stance = keep.stance ?? 'hunch'
  return (
    <div className={footClass}>
      <span className={stanceClass} data-stance={stance}>
        {STANCE[stance].label}
      </span>
      {keep.motifs?.map((motif) => (
        <button key={motif} type="button" className={chipClass} onClick={() => onMotif(motif)}>
          {motif}
        </button>
      ))}
    </div>
  )
}
