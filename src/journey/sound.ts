/* Making a recording visible.

   Two jobs, both answering the same doubt: someone holding a phone up to their
   face has no way of knowing whether anything is being captured. A blinking
   dot is no help — it blinks exactly the same on a microphone that is not
   working. The only honest reassurance is the sound itself, drawn.

   `meter` reads the live microphone while it is open, so the trace on the
   panel moves because the reader is talking, and stops when they stop.
   `peaks` reads a finished recording back, so the trace on the card is the
   shape of what was actually kept rather than an ornament derived from an id.

   The two use different machinery on purpose. Metering needs a live
   AudioContext, which is only allowed to start from a gesture — and there is
   one, the tap that starts recording. Drawing a kept memo happens on scroll,
   with no gesture anywhere near it, so it goes through an OfflineAudioContext
   instead: it decodes just the same and it is not subject to autoplay policy,
   which means a journey full of memos draws itself without a console full of
   warnings about contexts that were not allowed to start. */

/** A live level reader on an open microphone.
 *
 *  Returns 0–1, weighted so that ordinary speech lands around the middle of
 *  the range rather than down in the first tenth of it. Raw RMS on a voice is
 *  a small number — around 0.05 — and a trace drawn straight from it is a flat
 *  line with a tremor in it, which looks exactly like the failure it is meant
 *  to disprove.
 *
 *  Owns its context and closes it, because recording is a discrete event with
 *  a beginning and an end. A shared context kept open for the life of the app
 *  would hold the microphone route alive long after the reader stopped. */
export function meter(stream: MediaStream) {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new Ctor()
  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 1024
  // Enough smoothing that a plosive does not spike the whole trace, not so
  // much that the line lags behind the voice and stops looking like a cause.
  analyser.smoothingTimeConstant = 0.55
  source.connect(analyser)

  const frame = new Float32Array(analyser.fftSize)

  return {
    read() {
      analyser.getFloatTimeDomainData(frame)
      let sum = 0
      for (let i = 0; i < frame.length; i += 1) sum += frame[i] * frame[i]
      const rms = Math.sqrt(sum / frame.length)
      // A curve rather than a multiplier: loud speech still has somewhere to
      // go, and a quiet room still reads as very nearly nothing.
      return Math.min(1, Math.pow(rms * 7.5, 0.72))
    },
    close() {
      source.disconnect()
      analyser.disconnect()
      void ctx.close()
    },
  }
}

/* Decoding costs a copy of the audio in memory, so it happens once per
   recording and the answer is kept against the blob itself. Keyed on the blob
   rather than on the row's id for two reasons: re-recording inside the sheet
   replaces the blob under an id that has not changed, and a WeakMap holding
   blobs it does not own lets every one of them be collected the moment the
   journey stops referring to it. */
const remembered = new WeakMap<Blob, Map<number, Promise<number[]>>>()

/** The shape of a finished recording, as `count` values from 0 to 1. */
export function peaks(media: Blob, count: number) {
  let byCount = remembered.get(media)
  if (!byCount) {
    byCount = new Map()
    remembered.set(media, byCount)
  }
  const had = byCount.get(count)
  if (had) return had

  const made = read(media, count)
  byCount.set(count, made)
  return made
}

async function read(media: Blob, count: number) {
  // One frame at a nominal rate: nothing is rendered, the context is only
  // here because decodeAudioData is a method on one.
  const ctx = new OfflineAudioContext(1, 1, 44100)
  const audio = await ctx.decodeAudioData(await media.arrayBuffer())
  const channel = audio.getChannelData(0)
  const per = Math.floor(channel.length / count) || 1

  const raw: number[] = []
  let loudest = 0
  for (let i = 0; i < count; i += 1) {
    /* Peak, not average. An average over twenty thousand samples of speech
       flattens every consonant out and leaves a smooth hill, which reads as a
       hum rather than as someone talking. */
    let top = 0
    const from = i * per
    for (let j = from; j < from + per && j < channel.length; j += 1) {
      const v = Math.abs(channel[j])
      if (v > top) top = v
    }
    raw.push(top)
    if (top > loudest) loudest = top
  }

  /* Normalised against the memo's own loudest moment, so something said at
     arm's length draws the same confident trace as something said close up.
     A recording that is genuinely silent has no loudest moment to divide by
     and stays flat — which is the truth about it. */
  return raw.map((v) => (loudest > 0 ? Math.min(1, (v / loudest) * 0.94 + 0.06) : 0.05))
}
