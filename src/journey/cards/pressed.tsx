/* DIRECTION A — PRESSED
   ═════════════════════

   Everything on this page is a physical thing pressed into an album: torn out,
   taped down, punched, cornered, franked. Nothing is a rectangle with a tint;
   every keep is an object that had to be *put* there, and the album remembers
   how. A quote is a strip torn out of the book and taped down at an angle. A
   note is the leaf off a spiral pad. A voice memo is a cassette label. A
   picture is a print under corners. A character is a specimen slip. A location
   is a postcard, franked and drawn. A plot thread is a cord with knots tied in
   it — one knot for a hunch, three for a certainty.

   This is the whispers-and-ink promise taken literally: the things the book
   said arrive as things lifted *out* of it, and the things the reader put down
   arrive in their own materials. */

import { Avatar } from '../avatars'
import { keptLabel } from '../lexicon'
import { STANCE } from '../kinds'
import { PlaceIcon } from '../../components/TabIcons'
import { Place, waveBars } from './art'
import { Motifs, clock, useObjectUrl, usePlayback, type CardProps } from './shared'
import s from './pressed.module.css'

const foot = { footClass: s.foot, chipClass: s.chip, stanceClass: s.stance }

/* ── Quote ────────────────────────────────────────────────────────────────
   A strip torn out and taped down. The tear is the top and bottom edge, the
   tape holds the leading corner, and the whole thing sits a degree off square
   because nobody tapes anything straight. */

export function Quote({ keep, onMotif }: CardProps) {
  return (
    <article className={`${s.sheet} ${s.strip}`}>
      <span className={s.tape} aria-hidden="true" />
      <blockquote className={s.torn}>{keep.text}</blockquote>
      <Motifs keep={keep} onMotif={onMotif} {...foot} />
    </article>
  )
}

/* ── Note ─────────────────────────────────────────────────────────────────
   The leaf off a spiral pad — punched along the head, ruled under the hand,
   turned back at the corner. The one card the reader already recognised, so
   it is carried across unchanged rather than redesigned for the sake of it. */

export function Note({ keep, onMotif }: CardProps) {
  return (
    <article className={`${s.sheet} ${s.leaf}`}>
      <span className={s.spine} aria-hidden="true" />
      <div className={s.ruled}>
        <p className={s.hand}>{keep.text}</p>
      </div>
      <Motifs keep={keep} onMotif={onMotif} {...foot} />
      <span className={s.fold} aria-hidden="true" />
    </article>
  )
}

/* ── Voice ────────────────────────────────────────────────────────────────
   A cassette label: two reel holes, a run time written in by hand, and the
   tape's own shape under it.

   The transport used to *be* the leading reel, spokes and all, on the argument
   that you press the tape rather than a button beside it. True of a cassette,
   wrong on a phone: it left the card carrying two identical spoked circles,
   one live and one dead, and neither of them said *play*. So the leading reel
   keeps the job and gives up the spokes — a triangle at rest, two bars while
   the tape runs — and the take-up reel drops to a hairline so it reads as part
   of the object rather than as a second button that does nothing. */

export function Voice({ keep, onMotif }: CardProps) {
  const { playing, at, toggle, ready } = usePlayback(keep.media)
  const bars = waveBars(keep.id, 40)
  const played = Math.round(at * bars.length)

  return (
    <article className={`${s.sheet} ${s.cassette}`}>
      <div className={s.reels}>
        <button
          type="button"
          className={s.reel}
          onClick={toggle}
          disabled={!ready}
          aria-label={playing ? 'Pause this voice memo' : 'Play this voice memo'}
          data-spinning={playing ? '' : undefined}
        />
        <div className={s.label}>
          <p className={s.written}>{keep.text || `Kept ${keptLabel(keep.keptOn)}`}</p>
          <span className={s.runtime}>{clock(keep.duration)}</span>
        </div>
        <span
          className={`${s.reel} ${s.reelIdle}`}
          aria-hidden="true"
          data-spinning={playing ? '' : undefined}
        >
          <span className={s.hub} />
        </span>
      </div>
      <div className={s.tapeWindow} aria-hidden="true">
        {bars.map((height, i) => (
          <span
            key={i}
            className={s.tick}
            data-played={i < played ? '' : undefined}
            style={{ blockSize: `${Math.round(height * 100)}%` }}
          />
        ))}
      </div>
      <Motifs keep={keep} onMotif={onMotif} {...foot} />
    </article>
  )
}

/* ── Picture ──────────────────────────────────────────────────────────────
   A print under four corners, on mount board, with the caption written on the
   board rather than on the print. */

export function Picture({ keep, onMotif }: CardProps) {
  const url = useObjectUrl(keep.media)
  return (
    <figure className={`${s.sheet} ${s.mountBoard}`}>
      <div className={s.mount}>
        {url ? (
          <img className={s.print} src={url} alt={keep.text ?? 'A picture kept from this book'} />
        ) : (
          <p className={s.gone}>This picture isn’t on this device.</p>
        )}
      </div>
      {keep.text && <figcaption className={s.boardCaption}>{keep.text}</figcaption>}
      <Motifs keep={keep} onMotif={onMotif} {...foot} />
    </figure>
  )
}

/* ── Character ────────────────────────────────────────────────────────────
   A specimen slip: the drawn person mounted in an oval aperture cut out of the
   slip, the name written on the ruled line under it, and what is known about
   them below the fold. */

export function Character({ keep, onMotif }: CardProps) {
  return (
    <article className={`${s.sheet} ${s.slip}`}>
      <div className={s.aperture}>
        <Avatar id={keep.avatar} size={52} />
      </div>
      <h3 className={s.written}>{keep.name}</h3>
      {keep.text && <p className={s.known}>{keep.text}</p>}
      <Motifs keep={keep} onMotif={onMotif} {...foot} />
    </article>
  )
}

/* ── Location & lore ──────────────────────────────────────────────────────

   A plate from a survey. The drawing is still the first thing, because a
   location is a picture of somewhere before it is a paragraph — but it is
   mounted rather than printed: inset from the card's edge on all four sides,
   sitting on a survey grid, with a neat line ruled inside it. A picture that
   runs to the card's own edges is a photograph, and these are drawings.

   The name is a caption above the plate, not a title on a card: the mark in
   the place hue, then the words in mono caps, the way a plate in a field
   guide is captioned. Underneath, the note runs the full width with nothing
   reserved beside it.

   Nothing here invents a fact. There is no coordinate line, because the app
   never asked the reader for one and a made-up latitude reads as real. There
   is no instrument icon in the corner either — the three verb circles hang
   under every card already, and a fourth control that does nothing is exactly
   the noise this redraw was for. */

export function Location({ keep }: CardProps) {
  const url = useObjectUrl(keep.media)
  return (
    <article className={`${s.sheet} ${s.mapped}`}>
      {keep.name && (
        <h3 className={s.marked}>
          <span className={s.pin} aria-hidden="true">
            <PlaceIcon size={14} />
          </span>
          {keep.name}
        </h3>
      )}
      <div className={s.field}>
        {url ? (
          <img className={s.terrain} src={url} alt={`A map of ${keep.name ?? 'this location'}`} />
        ) : (
          <Place seed={keep.id} className={s.terrain} />
        )}
        <span className={s.neat} aria-hidden="true" />
      </div>
      {keep.text && <p className={s.lore}>{keep.text}</p>}
    </article>
  )
}

/* ── Plot thread ──────────────────────────────────────────────────────────
   A cord with knots tied in it. One knot is a hunch, two a suspicion, three a
   certainty — how sure the reader was is a thing you can count. The word is
   set at the foot beside the strands, because a knot only means what it means
   to whoever tied it. The cord is the same cord the journey draws between
   threads, so a filtered run of them reads as one length of string. */

export function Thread({ keep, onMotif }: CardProps) {
  const stance = keep.stance ?? 'hunch'
  const knots = STANCE[stance].weight
  return (
    <article className={`${s.sheet} ${s.corded}`} data-stance={stance}>
      <span className={s.cord} aria-hidden="true">
        {Array.from({ length: knots }, (_, i) => (
          <span key={i} className={s.knot} />
        ))}
      </span>
      <div className={s.hung}>
        {keep.name && <h3 className={s.calling}>{keep.name}</h3>}
        {keep.text && <p className={s.working}>{keep.text}</p>}
        <Motifs keep={keep} onMotif={onMotif} {...foot} />
      </div>
    </article>
  )
}
