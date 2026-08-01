/* Thirty seconds of your own voice.

   Recording happens through MediaRecorder and stops there: the blob goes
   straight into IndexedDB beside the rest of the book. Nothing is uploaded,
   nothing is transcribed, and no key is needed — which is what makes a voice
   note free to keep and free to keep forever.

   The permission prompt is the whole risk here. It is asked for on the tap,
   never on mount, so opening the composer to write a quote does not make the
   phone ask about the microphone. And if it is refused, the sheet says so in
   a sentence and leaves the other five kinds of keep working. */

import { useEffect, useRef, useState } from 'react'
import VoiceOrb from '../components/VoiceOrb'
import { PauseIcon, VoiceIcon } from '../components/TabIcons'
import styles from './sheet.module.css'

interface Props {
  media?: Blob
  duration?: number
  seed: number
  onCapture: (media: Blob, duration: number) => void
}

function clock(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${`${s}`.padStart(2, '0')}`
}

function Recorder({ media, duration, seed, onCapture }: Props) {
  const [live, setLive] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [refused, setRefused] = useState(false)
  const recorder = useRef<MediaRecorder>(null)

  /* A recorder left running when the sheet closes keeps the microphone light
     on. Stopping the tracks is the only thing that turns it off. */
  useEffect(
    () => () => {
      recorder.current?.stream.getTracks().forEach((t) => t.stop())
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
        onCapture(new Blob(chunks, { type: rec.mimeType }), (Date.now() - from) / 1000)
        setLive(false)
      }
      recorder.current = rec
      setElapsed(0)
      rec.start()
      setLive(true)
    } catch {
      setRefused(true)
    }
  }

  function stop() {
    recorder.current?.stop()
  }

  if (live) {
    return (
      <div className={styles.recorder} data-live="true">
        <span className={styles.pulse} aria-hidden="true" />
        <span className={styles.elapsed}>{clock(elapsed)}</span>
        <button type="button" className={styles.capture} onClick={stop}>
          <PauseIcon size={18} />
          Stop
        </button>
      </div>
    )
  }

  return (
    <div className={styles.recorder}>
      {media ? (
        <>
          <VoiceOrb media={media} duration={duration} seed={seed} label="the note you just recorded" />
          <button type="button" className={styles.capture} onClick={start}>
            <VoiceIcon size={18} />
            Again
          </button>
        </>
      ) : (
        <>
          <button type="button" className={styles.capture} data-lead="true" onClick={start}>
            <VoiceIcon size={18} />
            Record
          </button>
          <p className={styles.rowHint}>
            {refused
              ? 'Flyleaf can’t reach the microphone. Allow it in your browser settings, or keep this one as a note instead.'
              : 'Kept on this device, the same as everything else here.'}
          </p>
        </>
      )}
    </div>
  )
}

export default Recorder
