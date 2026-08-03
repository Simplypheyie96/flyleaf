/* DIRECTION C — PLATES
   ════════════════════

   The loudest of the three. Every keep is a plate: a designed object with its
   own silhouette, its own edge, and — for four of the seven — a reversed band
   that names it. Where Marginalia removes the container, this direction makes
   the container the whole idea.

   Silhouettes: a tinted panel with the book's own mark ghosted across it; a
   ruled index card with a red header; a dark slab; a polaroid; a portrait
   plate; a map plaque; a ledger strip. Squint and no two have the same
   outline, which is the test.

   Whispers and ink again, in the material: whispers arrive on a plate the book
   printed (quote, character, location — reversed bands, ghosted marks, formal
   lettering) and ink arrives on a plate the reader filled in themselves (note,
   voice, picture, thread — index cards, slabs, polaroids, ledgers). */

import VoiceOrb from '../../components/VoiceOrb'
import { Avatar } from '../avatars'
import { keptLabel } from '../lexicon'
import { STANCES, STANCE } from '../kinds'
import { Survey } from './art'
import { Motifs, useObjectUrl, type CardProps } from './shared'
import s from './plates.module.css'

const foot = { footClass: s.foot, chipClass: s.chip, stanceClass: s.stance }

/* ── Quote ────────────────────────────────────────────────────────────────
   A tinted panel with an oversized quotation mark ghosted across it, bled off
   the leading edge. The line is set over the mark, not beside it. */

export function Quote({ keep, onMotif }: CardProps) {
  return (
    <article className={`${s.plate} ${s.panel}`}>
      <span className={s.ghost} aria-hidden="true">
        “
      </span>
      <blockquote className={s.said}>{keep.text}</blockquote>
      <Motifs keep={keep} onMotif={onMotif} {...foot} />
    </article>
  )
}

/* ── Note ─────────────────────────────────────────────────────────────────
   A ruled index card: red rule under the head, blue rules under the writing, a
   margin down the leading edge. The most familiar object in the set, and the
   one the reader already said reads clearly. */

export function Note({ keep, onMotif }: CardProps) {
  return (
    <article className={`${s.plate} ${s.index}`}>
      <div className={s.lines}>
        <p className={s.hand}>{keep.text}</p>
      </div>
      <Motifs keep={keep} onMotif={onMotif} {...foot} />
    </article>
  )
}

/* ── Voice ────────────────────────────────────────────────────────────────
   The one object on the page printed in reverse: a dark bar by day, a pale bar
   after dark, inverted against the page either way. A recording is a device,
   not a piece of paper. */

export function Voice({ keep, onMotif }: CardProps) {
  return (
    <article className={`${s.plate} ${s.slab}`}>
      <VoiceOrb
        media={keep.media}
        duration={keep.duration}
        seed={keep.id}
        label={`the voice memo kept ${keptLabel(keep.keptOn)}`}
      />
      {keep.text && <p className={s.slabCaption}>{keep.text}</p>}
      <Motifs keep={keep} onMotif={onMotif} {...foot} />
    </article>
  )
}

/* ── Picture ──────────────────────────────────────────────────────────────
   A polaroid: white all round, heavy at the foot, the caption written across
   the wide edge in the reader's hand. */

export function Picture({ keep, onMotif }: CardProps) {
  const url = useObjectUrl(keep.media)
  return (
    <figure className={`${s.plate} ${s.polaroid}`}>
      <div className={s.window}>
        {url ? (
          <img className={s.shot} src={url} alt={keep.text ?? 'A picture kept from this book'} />
        ) : (
          <p className={s.gone}>This picture isn’t on this device.</p>
        )}
      </div>
      <figcaption className={s.scrawl}>{keep.text || keptLabel(keep.keptOn)}</figcaption>
      <Motifs keep={keep} onMotif={onMotif} {...foot} />
    </figure>
  )
}

/* ── Character ────────────────────────────────────────────────────────────
   A portrait plate: the stamped initial mounted large on a tinted ground, with
   the name reversed out of a band across the foot of the portrait — the way a
   plate in an illustrated edition is captioned. */

export function Character({ keep, onMotif }: CardProps) {
  return (
    <article className={`${s.plate} ${s.portrait}`}>
      <div className={s.ground}>
        <span className={s.mount}>
          <Avatar name={keep.name} />
        </span>
        <h3 className={s.band}>{keep.name}</h3>
      </div>
      {keep.text && <p className={s.dossier}>{keep.text}</p>}
      <Motifs keep={keep} onMotif={onMotif} {...foot} />
    </article>
  )
}

/* ── Location & lore ──────────────────────────────────────────────────────
   A map plaque. The survey — contours, a watercourse, a route and the place
   marked — runs the whole plate, and the name is reversed out of a scrim laid
   across the foot of it, which is how a plaque is lettered. */

export function Location({ keep, onMotif }: CardProps) {
  const url = useObjectUrl(keep.media)
  return (
    <article className={`${s.plate} ${s.plaque}`}>
      <div className={s.chart}>
        {url ? (
          <img className={s.pinned} src={url} alt={`A map of ${keep.name ?? 'this location'}`} />
        ) : (
          <Survey seed={keep.id} className={s.survey} />
        )}
        {keep.name && (
          <div className={s.scrim}>
            <h3 className={s.engraved}>{keep.name}</h3>
          </div>
        )}
      </div>
      <div className={s.plaqueBody}>
        {keep.text && <p className={s.lore}>{keep.text}</p>}
        <Motifs keep={keep} onMotif={onMotif} {...foot} />
      </div>
    </article>
  )
}

/* ── Plot thread ──────────────────────────────────────────────────────────
   A ledger strip: a reversed mono band with the case name in it, ruled body
   under, and three ticks at the trailing edge — filled up to how sure the
   reader is. Three boxes, one, two or three of them struck. Countable, not
   readable. */

export function Thread({ keep, onMotif }: CardProps) {
  const stance = keep.stance ?? 'hunch'
  const weight = STANCE[stance].weight
  return (
    <article className={`${s.plate} ${s.ledger}`} data-stance={stance}>
      <header className={s.header}>
        <h3 className={s.calling}>{keep.name}</h3>
        <span className={s.ticks} aria-hidden="true">
          {STANCES.map((step, i) => (
            <span key={step} className={s.tick} data-struck={i < weight ? '' : undefined} />
          ))}
        </span>
      </header>
      <div className={s.ledgerBody}>
        {keep.text && <p className={s.working}>{keep.text}</p>}
        <Motifs keep={keep} onMotif={onMotif} {...foot} />
      </div>
    </article>
  )
}
