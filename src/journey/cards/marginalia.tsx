/* DIRECTION B — MARGINALIA
   ════════════════════════

   Almost nothing here is a card. The journey is a book, and a keep is
   something set into its page: the words sit directly on the paper, and what
   tells one kind from another is a small drawn mark out in the margin plus the
   way the text itself is set.

   This is the quietest of the three and the most typographic. It is also the
   one that reads fastest on a phone, because there is no card chrome between
   the reader and the words — a long journey scrolls like a chapter rather than
   like a feed.

   The whispers-and-ink split does real work here: whispers (quote, character,
   location) are set in the book's serif, and ink (note, voice, picture,
   thread) is set in the reader's own hand, mono or sans. You can hear which
   voice is speaking before you read a word. */

import { keptLabel } from '../lexicon'
import { STANCE } from '../kinds'
import { Place } from './art'
import { Stance, clock, useObjectUrl, usePlayback, useWave, type CardProps } from './shared'
import s from './marginalia.module.css'

const foot = { footClass: s.foot, stanceClass: s.stance }

/* ── Quote ────────────────────────────────────────────────────────────────
   A pulled quote, the way a book sets one: a heavy rule in the margin, the
   line hung off it in large italic serif, no container at all. */

export function Quote({ keep }: CardProps) {
  return (
    <article className={`${s.set} ${s.pulled}`}>
      <span className={`${s.mark} ${s.rule}`} aria-hidden="true" />
      <div className={s.body}>
        <blockquote className={s.said}>{keep.text}</blockquote>
      </div>
    </article>
  )
}

/* ── Note ─────────────────────────────────────────────────────────────────
   The reader's hand, written straight onto a dotted writing guide — the sort
   printed faintly so it disappears once there is writing on it. */

export function Note({ keep }: CardProps) {
  return (
    <article className={`${s.set} ${s.written}`}>
      <span className={`${s.mark} ${s.nib}`} aria-hidden="true" />
      <div className={s.body}>
        <p className={s.hand}>{keep.text}</p>
      </div>
    </article>
  )
}

/* ── Voice ────────────────────────────────────────────────────────────────
   A bare waveform with a play mark in the margin. No slab, no shell: the
   recording is a line across the page, and it fills in as it plays. */

export function Voice({ keep }: CardProps) {
  const { playing, at, toggle, ready } = usePlayback(keep.media)
  const bars = useWave(keep.media, keep.id, 56)
  const played = Math.round(at * bars.length)

  return (
    <article className={`${s.set} ${s.spoken}`}>
      <button
        type="button"
        className={`${s.mark} ${s.play}`}
        onClick={toggle}
        disabled={!ready}
        aria-label={playing ? 'Pause this voice memo' : 'Play this voice memo'}
        data-playing={playing ? '' : undefined}
      />
      <div className={s.body}>
        <div className={s.wave} aria-hidden="true">
          {bars.map((height, i) => (
            <span
              key={i}
              className={s.bar}
              data-played={i < played ? '' : undefined}
              style={{ blockSize: `${Math.round(height * 100)}%` }}
            />
          ))}
        </div>
        <p className={s.aside}>
          <span className={s.stamp}>{clock(keep.duration)}</span>
          {keep.text || `Kept ${keptLabel(keep.keptOn)}`}
        </p>
      </div>
    </article>
  )
}

/* ── Picture ──────────────────────────────────────────────────────────────
   The picture runs the full measure with nothing around it — no mount, no
   frame, no corners. The caption is set under it as a printed plate line. */

export function Picture({ keep }: CardProps) {
  const url = useObjectUrl(keep.media)
  return (
    <figure className={`${s.set} ${s.plated}`}>
      <span className={`${s.mark} ${s.corner}`} aria-hidden="true" />
      <div className={s.body}>
        {url ? (
          <img className={s.bleed} src={url} alt={keep.text ?? 'A picture kept from this book'} />
        ) : (
          <p className={s.gone}>This picture isn’t on this device.</p>
        )}
        {keep.text && <figcaption className={s.plate}>{keep.text}</figcaption>}
      </div>
    </figure>
  )
}

/* ── Character ────────────────────────────────────────────────────────────
   A drawn bust in the margin, on the name's own baseline, and the name set as
   a dramatis-personae entry: small caps, an em rule, then the description
   running on as prose. */

export function Character({ keep }: CardProps) {
  return (
    <article className={`${s.set} ${s.listed}`}>
      <svg className={`${s.mark} ${s.bust}`} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="7.4" r="4.1" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M3.6 21.4c0-4.7 3.8-7.6 8.4-7.6s8.4 2.9 8.4 7.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <div className={s.body}>
        <p className={s.entry}>
          <span className={s.who}>{keep.name}</span>
          {keep.text && <span className={s.about}>{keep.text}</span>}
        </p>
      </div>
    </article>
  )
}

/* ── Location & lore ──────────────────────────────────────────────────────
   A drawn horizon ruled across the full measure, like a chapter-head vignette,
   with the name set beneath it in the small caps a map uses. */

export function Location({ keep }: CardProps) {
  const url = useObjectUrl(keep.media)
  return (
    <article className={`${s.set} ${s.surveyed}`}>
      <span className={`${s.mark} ${s.pinMark}`} aria-hidden="true" />
      <div className={s.body}>
        <div className={s.vignette}>
          {url ? (
            <img className={s.pinned} src={url} alt={`A map of ${keep.name ?? 'this location'}`} />
          ) : (
            <Place seed={keep.id} className={s.horizon} />
          )}
        </div>
        {keep.name && <h3 className={s.legend}>{keep.name}</h3>}
        {keep.text && <p className={s.lore}>{keep.text}</p>}
      </div>
    </article>
  )
}

/* ── Plot thread ──────────────────────────────────────────────────────────
   A mark in the margin, exactly the way a reader marks their own book: one
   stroke for a hunch, two for a suspicion, and a struck-through certainty. The
   mark gets darker and heavier as the reader gets surer — no tag, no label,
   nothing to read. */

export function Thread({ keep }: CardProps) {
  const stance = keep.stance ?? 'hunch'
  const strokes = STANCE[stance].weight
  return (
    <article className={`${s.set} ${s.marked}`} data-stance={stance}>
      <span className={`${s.mark} ${s.strokes}`} aria-hidden="true">
        {Array.from({ length: strokes }, (_, i) => (
          <span key={i} className={s.stroke} />
        ))}
      </span>
      <div className={s.body}>
        {keep.name && <h3 className={s.calling}>{keep.name}</h3>}
        {keep.text && <p className={s.working}>{keep.text}</p>}
        <Stance keep={keep} {...foot} />
      </div>
    </article>
  )
}
