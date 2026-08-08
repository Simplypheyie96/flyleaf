/* Thirty seconds of your own voice.

   Recording happens through MediaRecorder and stops there: the blob goes
   straight into IndexedDB beside the rest of the book. Nothing is uploaded,
   nothing is transcribed, and no key is needed — which is what makes a voice
   note free to keep and free to keep forever.

   The permission prompt is the whole risk here. It is asked for on the tap,
   never on mount, so opening the composer to write a quote does not make the
   phone ask about the microphone. And if it is refused, the sheet says so in
   a sentence and leaves the other five kinds of keep working.

   THE ORB IS THE REAL ONE — `thinking-orbs`, at its tuned 64px, monochrome
   dots on a transparent canvas, owning its own frame loop, offscreen pausing
   and reduced-motion frame. Nothing here animates it; the panel only decides
   whether it is running. It was a pill labelled "Record" with a dot blinking
   beside it, then a sphere drawn out of two radial gradients, and both were an
   impression of the thing rather than the thing.

   AND IT IS HERE BEFORE YOU PRESS IT. Mounting it only while the microphone
   was open meant the one object the brief names was invisible until after the
   reader had already committed to recording. `paused` is the package's own
   answer — it freezes the frame while keeping the visual status, so a still
   orb is quiet rather than untruthful. Only the motion is a claim.

   THE TRACE UNDER IT IS THE MICROPHONE. This is the part that was missing, and
   it is the part that matters: an orb is reassuring but it is not evidence,
   because it turns at exactly the same rate on a microphone that is picking up
   nothing at all. So the panel reads the live level off the open stream and
   draws it. If the line moves when you speak, the microphone is working, and
   nothing else on this screen can tell you that. The orb takes its speed from
   the same reading, so the object the eye is already on responds too.

   `theme="dark"` rather than `auto`, because the panel it stands on is dark in
   both themes and `auto` would read the room instead of the surface — see
   --orb-stage. Dark means light ink for a dark background, which is what the
   package's own gallery shows and what makes a field of dots read as lit. */

import { useEffect, useRef, useState } from 'react'
import { ThinkingOrb } from 'thinking-orbs'
import VoiceOrb from '../components/VoiceOrb'
import { CycleIcon, StopIcon } from '../components/TabIcons'
import { meter } from './sound'
import styles from './sheet.module.css'

interface Props {
  media?: Blob
  duration?: number
  seed: number
  onCapture: (media: Blob, duration: number) => void
}

/** Bars in the live trace. Sampled every 55ms, so the window is a little over
 *  two seconds — long enough to see a whole phrase land, short enough that the
 *  right-hand edge is unmistakably now. */
const BARS = 40
const SAMPLE = 55
const REST = 0.05

function clock(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${`${s}`.padStart(2, '0')}`
}

function Recorder({ media, duration, seed, onCapture }: Props) {
  const [live, setLive] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [refused, setRefused] = useState(false)
  /* How hard the reader is speaking, in four steps. Four rather than a
     continuous number because this one crosses into React: the trace is
     written straight to the DOM and costs nothing, but the orb's speed is a
     prop, and a prop that changes eighteen times a second would re-render the
     panel eighteen times a second to move one canvas by a hair. */
  const [push, setPush] = useState(0)

  const recorder = useRef<MediaRecorder>(null)
  const level = useRef<ReturnType<typeof meter>>(null)
  const bars = useRef<(HTMLSpanElement | null)[]>([])
  const frame = useRef(0)

  function draw(values: number[]) {
    values.forEach((v, i) => {
      bars.current[i]?.style.setProperty('--l', v.toFixed(3))
    })
  }

  function watch(stream: MediaStream) {
    const read = meter(stream)
    level.current = read
    const seen: number[] = Array.from({ length: BARS }, () => REST)
    let last = 0
    let step = 0

    frame.current = requestAnimationFrame(function tick(now) {
      frame.current = requestAnimationFrame(tick)
      if (now - last < SAMPLE) return
      last = now

      seen.shift()
      seen.push(Math.max(REST, read.read()))
      draw(seen)

      const next = Math.min(3, Math.floor(seen[BARS - 1] * 4))
      if (next !== step) {
        step = next
        setPush(next)
      }
    })
  }

  function hush() {
    cancelAnimationFrame(frame.current)
    level.current?.close()
    level.current = null
    draw(Array.from({ length: BARS }, () => REST))
    setPush(0)
  }

  /* A recorder left running when the sheet closes keeps the microphone light
     on, and a frame loop left running keeps reading a stream that is gone.
     Stopping the tracks is the only thing that turns the first off. */
  useEffect(
    () => () => {
      recorder.current?.stream.getTracks().forEach((t) => t.stop())
      cancelAnimationFrame(frame.current)
      level.current?.close()
    },
    [],
  )

  useEffect(() => {
    if (!live) return
    const started = Date.now()
    const tick = setInterval(() => setElapsed((Date.now() - started) / 1000), 200)
    return () => clearInterval(tick)
  }, [live])

  async function start() {
    setRefused(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      const chunks: Blob[] = []
      const from = Date.now()
      rec.ondataavailable = (event) => chunks.push(event.data)
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        hush()
        onCapture(new Blob(chunks, { type: rec.mimeType }), (Date.now() - from) / 1000)
        setLive(false)
      }
      recorder.current = rec
      setElapsed(0)
      rec.start()
      setLive(true)
      // After start, not before: the reading is of an open microphone, and the
      // AudioContext behind it is only allowed to run off this same tap.
      watch(stream)
    } catch {
      setRefused(true)
    }
  }

  function stop() {
    recorder.current?.stop()
  }

  /* Kept: the sphere stops being a microphone and becomes the recording. The
     wave, the transport and the length, with one quiet way back to the start —
     quiet because re-recording throws away what is already there, and the loud
     button on this panel should never be the destructive one. */
  if (media && !live) {
    return (
      <div className={styles.booth} data-kept="">
        <span className={styles.boothPlay}>
          <VoiceOrb
            media={media}
            duration={duration}
            seed={seed}
            label="the note you just recorded"
          />
        </span>
        <button type="button" className={styles.capture} onClick={start}>
          <CycleIcon size={17} />
          Record again
        </button>
      </div>
    )
  }

  return (
    <div className={styles.booth} data-live={live || undefined}>
      {/* One object, two jobs: a control until the microphone is open, then
          the thing you are watching. It is the same orb either way — only the
          wrapper changes, from a button to a span, so a running recording
          cannot be stopped by tapping the animation.

          The stop glyph used to ride over the canvas, which put a small dark
          square in the densest part of a field of moving dots and read as a
          fault in the animation rather than as a button. So the orb is left
          alone to be the status, and the way out of it is a pill under the
          clock with a word on it.

          Hidden from assistive tech in both states — the hint below is a live
          region and already says what is happening, and two announcements of
          one state is worse than none. The button keeps the label. */}
      {live ? (
        <span className={styles.recStage}>
          <ThinkingOrb
            state="composing"
            size={64}
            theme="dark"
            speed={0.85 + push * 0.12}
            aria-hidden="true"
          />
        </span>
      ) : (
        <button
          type="button"
          className={styles.recOrb}
          onClick={start}
          aria-label={refused ? 'Try the microphone again' : 'Start recording'}
        >
          <ThinkingOrb state="composing" size={64} theme="dark" paused aria-hidden="true" />
        </button>
      )}

      {/* Reserved whether or not it is running, so starting a recording does
          not shove the orb up the panel. Flat at rest is the honest picture:
          nothing is being heard, so there is nothing to draw. */}
      <div className={styles.meter} aria-hidden="true">
        {Array.from({ length: BARS }, (_, i) => (
          <span
            key={i}
            ref={(el) => {
              bars.current[i] = el
            }}
            className={styles.meterBar}
          />
        ))}
      </div>

      <p className={styles.boothClock} aria-live="off">
        {live ? clock(elapsed) : '0:00'}
      </p>

      {live && (
        <button type="button" className={styles.recStop} onClick={stop}>
          <StopIcon size={18} />
          Stop
        </button>
      )}

      <p className={styles.boothHint} role="status">
        {refused
          ? 'Flyleaf can’t reach the microphone. Allow it in your browser settings, or keep this one as a note instead.'
          : live
            ? 'The line moves when it hears you. Nothing leaves this device.'
            : 'Tap and say it. Kept on this device, the same as everything else here.'}
      </p>
    </div>
  )
}

export default Recorder
