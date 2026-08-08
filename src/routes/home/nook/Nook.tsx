/* SOMEWHERE TO READ — the section.
   ════════════════════════════════

   Third and last on Home, under "Look what fell out". It is the only thing on
   this screen that is not about the reader's own books, and it earns its place
   by being the only thing they can *do* rather than read.

   Two rules it is built on:

   NO SOUND WITHOUT A VISIBLE WAY TO STOP IT. The audio graph is created on the
   tap that starts a layer and never before, so a reader who scrolls past has no
   AudioContext at all and Safari is never asked to autoplay anything. Putting
   the lamp out stops every layer, and leaving Home releases the graph entirely.
   There is no state in which this thing is making noise off-screen.

   THE LAMP IS NOT A SWITCH FOR A PICTURE. Lit and unlit are both finished
   drawings — someone reads in one and sleeps in the other — so there is a
   reason to turn it off as well as on. */

import { useEffect, useState } from 'react'
import Room from './Room'
import Timer from './Timer'
import { type Book } from '../../../data/db'
import { LAYERS, type Layer, release, start, stop, stopAll } from './ambience'
import s from './nook.module.css'

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

/* One glyph per sound, in the tab bar's stroke idiom. The chips used to all
   wear the same three meter bars, which said "audio, generically" three times
   over; a drop, a flame and an armchair say which sound before the word
   does. */
const GLYPH: Record<Layer, React.ReactNode> = {
  rain: (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <g {...stroke}>
        <path d="M8 4 L 5.5 11" />
        <path d="M14 4 L 11.5 11" />
        <path d="M20 4 L 17.5 11" />
        <path d="M11 14.5 L 9 20" />
        <path d="M17 14.5 L 15 20" />
      </g>
    </svg>
  ),
  fire: (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <g {...stroke}>
        <path d="M12 3.5 C 15 7 18 9.5 18 14 A 6 6 0 0 1 6 14 C 6 11 7.5 9 9 7.5 C 9 9.5 10 10.5 11 11 C 10.5 8 11 5.5 12 3.5 Z" />
        <path d="M12 20 A 3 3 0 0 1 9.4 15.5" />
      </g>
    </svg>
  ),
  room: (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <g {...stroke}>
        <path d="M6 12 V 8 A 3 3 0 0 1 12 7 A 3 3 0 0 1 18 8 V 12" />
        <path d="M4.5 13.5 A 1.8 1.8 0 0 1 6.5 11.8 V 15 H 17.5 V 11.8 A 1.8 1.8 0 0 1 19.5 13.5 V 16.5 A 1.5 1.5 0 0 1 18 18 H 6 A 1.5 1.5 0 0 1 4.5 16.5 Z" />
        <path d="M6.5 18 L 6 20 M 17.5 18 L 18 20" />
      </g>
    </svg>
  ),
}

/** The book the clock will time — whatever Home already worked out the reader
    is in the middle of. Passed in rather than queried here, so the room and the
    "Currently reading" card above can never disagree about which book that is. */
export default function Nook({ reading }: { reading?: Book }) {
  const [lit, setLit] = useState(false)
  const [playing, setPlaying] = useState<Layer[]>([])

  /* Home is not a player. When this leaves the screen the graph goes with it. */
  useEffect(() => release, [])

  function toggleLamp() {
    setLit((was) => {
      if (was) {
        stopAll()
        setPlaying([])
      }
      return !was
    })
  }

  function toggleLayer(id: Layer) {
    setPlaying((was) => {
      if (was.includes(id)) {
        stop(id)
        return was.filter((l) => l !== id)
      }
      start(id)
      return [...was, id]
    })
  }

  return (
    <section
      className={s.stage}
      data-lit={lit || undefined}
      aria-labelledby="nook-head"
    >
      <div className={s.heading}>
        <h2 id="nook-head" className={s.title}>
          Somewhere to read
        </h2>
        <span className={s.state}>{lit ? 'Lamp on' : 'Lamp off'}</span>
      </div>

      {/* The picture and everything that sits ON it share one box, so the
          prompt can be absolutely placed over the foot of the drawing and
          never takes a slot in the column — which was half of the distance
          the owner measured between the room and its own caption. */}
      <div className={s.picture}>
        <button
          type="button"
          className={s.scene}
          aria-pressed={lit}
          onClick={toggleLamp}
        >
          <span className={s.sr}>{lit ? 'Put the lamp out' : 'Light the lamp'}</span>
          <Room lit={lit} />
        </button>

        {/* Sits over the foot of the picture and leaves once it has been
            obeyed. Hidden from the reader who is using a screen reader,
            because the button above already says exactly this and says it
            better. */}
        <div className={s.prompt} aria-hidden="true">
          <span className={s.tap}>Tap the lamp</span>
        </div>
      </div>

      {/* THE CONSOLE — one glass shelf of three sounds, floated up over the
          foot of the picture like the rest of the app's chrome floats over
          its content. Only offered once the room is awake.

          inert, not hidden. `hidden` is UA `display: none`, which the
          module's own display outranks, so the chips would stay clickable at
          zero opacity — an invisible button that starts rain in an unlit
          room. inert cannot be outranked by a stylesheet: no focus, no
          clicks, out of the accessibility tree.

          The fold around it is a grid row animated 0fr to 1fr — a height
          animation to a height nobody typed — and shut, its negative margin
          hands the section's flex gap back so the caption sits one ordinary
          gap under the picture in both lamp states. */}
      <div className={s.soundsFold}>
        <ul className={s.sounds} aria-label="Ambient sound" inert={!lit}>
          {LAYERS.map((layer) => {
            const on = playing.includes(layer.id)
            return (
              <li key={layer.id}>
                <button
                  type="button"
                  className={s.sound}
                  aria-pressed={on}
                  onClick={() => toggleLayer(layer.id)}
                >
                  {GLYPH[layer.id]}
                  <span>{layer.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <p className={s.caption}>
        {lit
          ? 'Stay a while. Put something on and read.'
          : 'A corner of a room, waiting. The lamp is off and so is everything else.'}
      </p>

      {/* Last, and deliberately not inside the lamp's `inert` fence. The room
          is a mood and the clock is a record; a reader who wants to time a
          sitting in silence should not have to turn a light on in a drawing
          first. */}
      <Timer book={reading} />
    </section>
  )
}
