/* DRAWN TO ORDER — the three cards that are not drawn from a set
   ═══════════════════════════════════════════════════════════════

   Four of the seven types are drawn from one of the three sets. These three
   are not, and each one got here the same way: every set drawing of it was
   turned down, and the reason was always that the drawing had a *device* in it
   rather than a shape.

   CHARACTERS — an avatar, the words underneath, and no clever spacing
   anywhere. Six versions before this one all had a device: a baseline grid, an
   inset card, a hanging indent. This one has none.

   PLOT THREADS — an open case, marked with a seal. Every drawing before this
   one put its difference *inside* the rectangle — knots on a cord, tally
   strokes, a status strip — which from two feet away is the same card as a
   note with something drawn on it. So the difference is the outline, twice
   over: the border is dashed rather than drawn, because a thread is the one
   kind that is not settled yet and a broken line is what provisional looks
   like; and a seal hangs off the leading edge, breaking that outline, which no
   other card in the set does. Both are visible before a word is read.

   The seal is also where the stance went. It used to be a word on a tab; it is
   now the ring around the seal, filling as the reader moves from a hunch to
   something they are sure of — one shape carrying one fact, instead of a
   second label to read.

   VOICE — an instrument. It is the only keep on the page you *operate* rather
   than read, and the drawing has to say so before anything else does: a filled
   disc big enough to be the first thing your thumb finds, the recording's own
   shape beside it filling as it runs, and the time trailing. */

import { Avatar } from '../avatars'
import { STANCE } from '../kinds'
import { PauseIcon, PlayIcon } from '../../components/TabIcons'
import { waveBars } from './art'
import { clock, usePlayback, type CardProps } from './shared'
import s from './redraw.module.css'

/* ══ CHARACTER ════════════════════════════════════════════════════════════

   A page from a dramatis personae. The cameo and the name share a band across
   the top — one thing, *who this is* — and what you know about them runs the
   full width underneath, on the other side of the rule.

   The cameo used to sit alone on its own line with the name beneath it, and
   that left two thirds of the top of the card as empty paper. It also left the
   name and the account as two paragraphs three points apart, which is a size
   difference rather than a hierarchy. One row does both jobs: it fills, and it
   pairs. */

export function Character({ keep }: CardProps) {
  return (
    <article className={`${s.card} ${s.person}`}>
      <div className={s.who}>
        <span className={s.cameo}>
          <Avatar id={keep.avatar} size={52} />
        </span>
        <h3 className={s.name}>{keep.name}</h3>
      </div>
      {keep.text && <p className={s.about}>{keep.text}</p>}
    </article>
  )
}

/* ══ PLOT THREAD ══════════════════════════════════════════════════════════

   An open case, broken outline and all. Two shapes do the work and nothing
   was added on top of them.

   The dashed border says provisional. Every other card in the journey is a
   closed rectangle, so a card whose edge is not continuous is legible as a
   different kind of object from across the room — and it happens to be exactly
   what the type means, since a thread is the one keep that is still running.

   The seal breaks that edge. It hangs half outside the leading rule, and its
   ring fills as the stance hardens: a third of the way round for a hunch, two
   thirds for a suspicion, closed for something certain. One shape, one fact.
   The stance used to be a word on a tab, which meant reading a label to learn
   something the card could have shown. The seal carries no glyph, because the
   knot standing in the gutter beside it already carries the one this type
   would have used.

   The question is one line. A thread's name is a thing you are carrying
   around, not a paragraph, and a name that wraps turns every card in the
   journey a different height for no reason a reader can act on. The full text
   stays reachable on hover and in the entry itself.

   The strands are a filing line, not chips. They are still the only way into
   the motif filter, so they cannot go — but a row of filled lozenges under
   every thread was the "random tag" look, and a case file already has
   somewhere for that: the line you write along the bottom of one. Named as the
   relationship it is, too, rather than left as a bare word — "filed under the
   house" is a fact about where this sits, where "the house" on its own is
   indistinguishable from a tag somebody stuck on. */

export function Thread({ keep, onMotif }: CardProps) {
  const stance = keep.stance ?? 'hunch'
  const strands = keep.motifs ?? []
  return (
    <article className={`${s.card} ${s.dossier}`} data-stance={stance}>
      {/* Hung on the leading edge, half outside the dashed rule it breaks. It
          clears the journey's own thread in the gutter by a few pixels on
          purpose: near enough to read as tied to it, not so near that it looks
          strung on it.

          Empty on purpose. The first version carried the thread glyph, and the
          knot standing in the gutter twenty pixels away carries that same
          glyph — two circles with one mark between them, which is the exact
          noise this card was supposed to stop making. The knot says *what kind
          of keep*; the seal says *how sure*, and it says it with the one thing
          the knot has no version of: a ring that fills. */}
      <span className={s.seal} aria-hidden="true" />

      {/* The word for the ring. Anyone who cannot see how full the seal is
          reads the stance here instead, and nobody reads it twice. */}
      <p className={s.standing}>{STANCE[stance].label}</p>

      <h3 className={s.asked} title={keep.name}>
        {keep.name}
      </h3>
      {keep.text && <p className={s.working}>{keep.text}</p>}
      {/* Only when there is something filed under. An empty line is 28px of
          dead air at the bottom of the card, and that reads as a mistake
          rather than as space. */}
      {strands.length > 0 && (
        <p className={s.filing}>
          <span className={s.filedUnder}>Filed under</span>
          {strands.map((strand) => (
            <button
              key={strand}
              type="button"
              className={s.strand}
              onClick={() => onMotif(strand)}
            >
              {strand}
            </button>
          ))}
        </p>
      )}
    </article>
  )
}

/* ══ VOICE ════════════════════════════════════════════════════════════════

   Reversed out of the page in both themes, because a recording is a device and
   not a piece of paper — the one object in the journey with no paper at all.

   The transport is the card. What was here before drew a soft orb with a 20px
   glyph inside it and a waveform beside it, and the honest description of that
   is a decoration you could also press: nothing about it said *play* at a
   glance. So the disc is 56, filled in the voice hue, and it is the first
   thing on the leading edge — the same size and the same place a portrait sits
   on a character card, which is the only other keep that leads with a circle.

   The waveform is a scrubber's worth of feedback and no more: it fills as the
   tape runs, so you can see at a glance how far in you are without the card
   pretending to be a media player. */

export function Voice({ keep }: CardProps) {
  const { playing, at, toggle, ready } = usePlayback(keep.media)
  const bars = waveBars(keep.id, 28)
  const played = Math.round(at * bars.length)
  /* Elapsed while it runs, the whole length at rest — the two readings a
     listener actually wants, never both at once, and tabular so swapping
     between them never moves the row. */
  const showing = at && keep.duration ? at * keep.duration : keep.duration

  return (
    <article className={`${s.card} ${s.recorder}`}>
      <div className={s.transport}>
        <button
          type="button"
          className={s.play}
          onClick={toggle}
          disabled={!ready}
          aria-label={playing ? 'Pause this voice memo' : 'Play this voice memo'}
        >
          {playing ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
        </button>
        <span className={s.wave} aria-hidden="true">
          {bars.map((height, i) => (
            <span
              key={i}
              className={s.waveBar}
              data-played={i < played ? '' : undefined}
              style={{ blockSize: `${Math.round(height * 100)}%` }}
            />
          ))}
        </span>
        <span className={s.elapsed}>{clock(showing)}</span>
      </div>
      {keep.text && <p className={s.said}>{keep.text}</p>}
    </article>
  )
}
