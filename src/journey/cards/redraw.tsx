/* DRAWN TO ORDER — the three cards that are not drawn from a set
   ═══════════════════════════════════════════════════════════════

   Four of the seven types are drawn from one of the three sets. These three
   are not, and each one got here the same way: every set drawing of it was
   turned down, and the reason was always that the drawing had a *device* in it
   rather than a shape.

   CHARACTERS — an avatar, the words underneath, and no clever spacing
   anywhere. Six versions before this one all had a device: a baseline grid, an
   inset card, a hanging indent. This one has none.

   PLOT THREADS — a tabbed folder. All three set drawings drew *how many times
   you have noticed it* — knots on a cord, tally strokes, ticks struck off a
   ledger — and then three candidates after them moved the stance to where the
   count had been, which fixed the subject and not the shape. The objection
   that closed it was about the shape: a line with nodes threaded down the
   inside of a rectangle is not a different card, it is the same card with
   something drawn on it. So the difference is in the outline now. A thread is
   the one kind that stays open across a whole book, which is what a folder is
   for, and the tab is the card's own paper — same tone, fused, no second fill
   and no border of its own — carrying how sure you have got.

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
   The cameo on its mount, the name under it, what you know about them under
   that. Nothing is centred, nothing is indented, nothing is aligned to
   anything but the card's own leading edge. */

export function Character({ keep }: CardProps) {
  return (
    <article className={`${s.card} ${s.person}`}>
      <span className={s.cameo}>
        <Avatar id={keep.avatar} size={56} />
      </span>
      <h3 className={s.name}>{keep.name}</h3>
      {keep.text && <p className={s.about}>{keep.text}</p>}
    </article>
  )
}

/* ══ PLOT THREAD ══════════════════════════════════════════════════════════

   A folder with a tab. Three things follow from that and nothing else was
   added on top of them.

   The tab holds the stance, so how sure you are is legible from the card's
   outline before a word is read — which is the job the cord and its knots were
   failing at from *inside* the rectangle.

   The question is one line. A thread's name is a thing you are carrying
   around, not a paragraph, and a name that wraps turns every folder in the
   journey a different height for no reason a reader can act on. The full text
   stays reachable on hover and in the entry itself.

   The strands are a filing line, not chips. They are still the only way into
   the motif filter, so they cannot go — but a row of filled lozenges under
   every thread was the "random tag" look, and a folder already has somewhere
   for that: the line you write along the bottom of one. Named as the
   relationship it is, too, rather than left as a bare word — "filed under the
   house" is a fact about where this sits, where "the house" on its own is
   indistinguishable from a tag somebody stuck on. */

export function Thread({ keep, onMotif }: CardProps) {
  const stance = keep.stance ?? 'hunch'
  const strands = keep.motifs ?? []
  return (
    <article className={`${s.card} ${s.filed}`}>
      <span className={s.tab}>{STANCE[stance].label}</span>
      <div className={s.folder}>
        <h3 className={s.asked} title={keep.name}>
          {keep.name}
        </h3>
        {keep.text && <p className={s.working}>{keep.text}</p>}
        {/* Only when there is something filed under. An empty line is 28px of
            dead air at the bottom of the card, and on a folder that reads as a
            mistake rather than as space. */}
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
      </div>
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
