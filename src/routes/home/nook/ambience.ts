/* THE SOUND OF THE ROOM — recordings, with one exception.
   ═══════════════════════════════════════════════════════

   This started out entirely synthesised: filtered noise, no files, nothing to
   license or cache. That argument was sound on every axis except the one that
   matters, which is whether it sounds like the thing. Rain has a grain to it,
   fire has irregular collapses, and paper has a specific dry rasp — none of
   which is a shape you can reach by putting white noise through a filter. The
   owner's verdict was the correct one, and the files won.

   WHERE THEY COME FROM. The sources are the ones already in use in VibeCafe:
   Mixkit's free SFX library and Pixabay. Both licences permit bundling inside
   an application; neither permits redistributing the audio on its own, which
   we are not doing. Credited on the Licensing page regardless.

   WHY THEY ARE NOT IN THE BUNDLE. They live in public/ambience and are fetched
   the first time a reader actually plays a layer — never at load, never at
   install. A reader who opens Home and never touches the lamp downloads no
   audio at all. From the second play they come off the service worker's
   runtime cache (see the rule in vite.config.ts), so offline works too.
   Together they are 268 kB, and mono at 48 kbps is entirely enough for a bed
   nobody is meant to be listening to directly.

   PAGES IS NOT A LOOP, and that is the fix for "paper doesn't sound like
   paper". That layer is retired now — the owner heard the recording and it
   never sounded like paper — so the room offers rain, a fire and its own
   tone, and nothing it cannot do well.

   THE ROOM STAYS SYNTHESISED, on purpose and not as a leftover. Room tone
   genuinely is filtered noise — that is a physical description of it, not an
   approximation — so there is nothing a recording would add except somebody
   else's refrigerator and 2 MB. It is the one layer where the synthesis was
   never the problem.

   AUTOPLAY. The context is built on the first tap and never before it, so a
   reader who opens Home and never touches the lamp has no audio graph at all,
   and Safari never has to refuse us. */

export type Layer = 'rain' | 'fire' | 'room'

/* Pages is gone, at the owner's call — the page-turn recording never sounded
   like paper, and three good sounds beat three good sounds and one apology. */
export const LAYERS: { id: Layer; label: string }[] = [
  { id: 'rain', label: 'Rain' },
  { id: 'fire', label: 'A fire' },
  { id: 'room', label: 'The room' },
]

/** Long enough that the loop is not a texture in itself. Two seconds of noise
    played round and round has an audible period; eight does not. Only the
    synthesised room uses this now. */
const LOOP = 8

/* Slow. Ambience that arrives inside a second has been switched on; ambience
   that takes two and a bit has been *noticed*, which is the difference between
   a sound effect and a room you are already in. */
const FADE = 2.2

let ctx: AudioContext | null = null
let master: GainNode | null = null
let bus: GainNode | null = null
let brown: AudioBuffer | null = null
let white: AudioBuffer | null = null

const live = new Map<Layer, () => void>()

/** The graph. Everything goes through a shared filter chain on the way out
 *  rather than straight to the speakers.
 *
 *  The veil and the floor cut are kept from the synthesised version, and they
 *  still earn their place now that the sources are recordings: a phone speaker
 *  turns the sub-60 Hz rumble on a fire recording into buzz trying to reproduce
 *  it, and the top octave of a rain recording is exactly the part a real window
 *  would have taken off before the reader heard it. Both are gentle — Q well
 *  under resonance — because the object is a veil, not a filter sweep somebody
 *  can hear working. */
function audio() {
  if (!ctx) {
    ctx = new AudioContext()

    master = ctx.createGain()
    master.gain.value = 0.34
    master.connect(ctx.destination)

    const veil = ctx.createBiquadFilter()
    veil.type = 'lowpass'
    veil.frequency.value = 3200
    veil.Q.value = 0.4

    const floorCut = ctx.createBiquadFilter()
    floorCut.type = 'highpass'
    floorCut.frequency.value = 58
    floorCut.Q.value = 0.5

    bus = ctx.createGain()
    bus.connect(floorCut).connect(veil).connect(master)
  }
  /* Suspended is the normal state after a tab has been backgrounded, and a
     resume on a context that is already running is a no-op. */
  if (ctx.state === 'suspended') void ctx.resume()
  return { ctx, out: bus as GainNode }
}

/* ── the recordings ────────────────────────────────────────────────────── */

const FILE: Partial<Record<Layer, string>> = {
  rain: '/ambience/rain.mp3',
  fire: '/ambience/fire.mp3',
}

/** One fetch per file for the life of the page, shared by everyone who asks.
    Toggling a layer off and on again must not go back to the network, and two
    layers starting in the same tick must not race each other into two
    downloads of the same bed. Caching the promise rather than the buffer is
    what gets both. */
const loaded = new Map<string, Promise<AudioBuffer>>()

function fetchBuffer(c: AudioContext, url: string) {
  let p = loaded.get(url)
  if (!p) {
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`${url} ${r.status}`)
        return r.arrayBuffer()
      })
      .then((b) => c.decodeAudioData(b))
    /* A failed fetch must not be remembered as a failure forever — a reader who
       was offline on the first tap should get the bed on the second. */
    p.catch(() => loaded.delete(url))
    loaded.set(url, p)
  }
  return p
}

/* ── the synthesised room ──────────────────────────────────────────────── */

function whiteBuffer(c: AudioContext) {
  if (white) return white
  const buf = c.createBuffer(1, c.sampleRate * LOOP, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  white = buf
  return buf
}

/** Noise with the highs rolled off by integration — the low, weighty hiss under
    a quiet room. Leaked slightly towards zero so it cannot wander off into DC
    over eight seconds. */
function brownBuffer(c: AudioContext) {
  if (brown) return brown
  const buf = c.createBuffer(1, c.sampleRate * LOOP, c.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < d.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) * 0.996
    d[i] = last * 12
  }
  brown = buf
  return buf
}

function loop(c: AudioContext, buffer: AudioBuffer, rate = 1) {
  const src = c.createBufferSource()
  src.buffer = buffer
  src.loop = true
  src.playbackRate.value = rate
  src.start()
  return src
}

function room(c: AudioContext, into: GainNode) {
  const src = loop(c, brownBuffer(c), 0.5)

  const air = c.createBiquadFilter()
  air.type = 'lowpass'
  air.frequency.value = 190
  air.Q.value = 0.7

  const lift = c.createGain()
  lift.gain.value = 0.6

  /* A thread of the higher air, well under the low end — without it the layer
     is a rumble rather than a room. The balance between these two is the whole
     difference between a room and a lorry idling outside one. */
  const top = c.createBiquadFilter()
  top.type = 'bandpass'
  top.frequency.value = 1400
  top.Q.value = 0.5
  const thin = c.createGain()
  thin.gain.value = 0.05

  const hiss = loop(c, whiteBuffer(c))

  src.connect(air).connect(lift).connect(into)
  hiss.connect(top).connect(thin).connect(into)

  return () => {
    src.stop()
    hiss.stop()
  }
}

/* ── the played layers ─────────────────────────────────────────────────── */

/** A looped bed. The files are crossfaded end-over-start at build time, so
    `loop = true` has no seam to click on. */
function bed(c: AudioContext, buf: AudioBuffer, into: GainNode) {
  const src = loop(c, buf)
  src.connect(into)
  return () => src.stop()
}

/** How loud each one sits against the others, set by ear against the 0.34
    master and the veil above. The recordings need less than the synthesised
    versions did — a real rain bed already has its own internal dynamics, so it
    does not have to be pushed to sound like anything. */
const LEVEL: Record<Layer, number> = { rain: 0.5, fire: 0.45, room: 0.28 }

/* ── the switch ────────────────────────────────────────────────────────── */

export function start(layer: Layer) {
  if (live.has(layer)) return
  const { ctx: c, out } = audio()

  const gain = c.createGain()
  gain.gain.setValueAtTime(0.0001, c.currentTime)
  gain.connect(out)

  /* Registered before the audio exists. Starting a layer is now potentially a
     network round trip, and a reader who taps a layer on and straight back off
     must end up with silence — so `live` has to hold an entry the whole time,
     and the teardown it holds has to work whether or not the buffer ever
     arrived. `cancelled` is what the late arrival checks. */
  let cancelled = false
  let teardown: (() => void) | null = null

  const fadeOut = () => {
    cancelled = true
    gain.gain.cancelScheduledValues(c.currentTime)
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + FADE / 2)
    window.setTimeout(
      () => {
        teardown?.()
        gain.disconnect()
      },
      (FADE / 2) * 1000 + 60,
    )
  }
  live.set(layer, fadeOut)

  const begin = (build: () => () => void) => {
    if (cancelled) return
    teardown = build()
    gain.gain.setValueAtTime(0.0001, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(LEVEL[layer], c.currentTime + FADE)
  }

  const url = FILE[layer]
  if (!url) {
    begin(() => room(c, gain))
    return
  }

  void fetchBuffer(c, url)
    .then((buf) => {
      begin(() => bed(c, buf, gain))
    })
    .catch(() => {
      /* No bed rather than a broken one. The switch in the nook stays lit
         because the reader asked for it; there is simply nothing to hear, which
         is the honest outcome of being offline on a first play. */
      live.delete(layer)
      gain.disconnect()
    })
}

export function stop(layer: Layer) {
  live.get(layer)?.()
  live.delete(layer)
}

export function stopAll() {
  /* Fade them all, then clear in one go — calling stop() in a loop would be
     deleting out of the map it is walking. */
  for (const fade of live.values()) fade()
  live.clear()
}

/** Give the audio graph back. Called when the nook leaves the screen — the
    scene is a moment on Home rather than a player running in the background,
    and sound with no visible way to stop it is the worst thing this could be.
 *
 *  The decoded buffers are deliberately NOT dropped here: they belong to the
 *  context being closed, so they go with it, but `loaded` is keyed by URL and
 *  holds promises of buffers from a context that is about to die. Clearing it
 *  is what stops the next visit decoding into a closed context. */
export function release() {
  stopAll()
  const c = ctx
  if (!c) return
  ctx = null
  master = null
  bus = null
  white = null
  brown = null
  loaded.clear()
  window.setTimeout(() => void c.close().catch(() => {}), FADE * 1000)
}
