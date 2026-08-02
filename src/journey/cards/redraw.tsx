/* DRAWN TO ORDER — the character card, and candidates for plot threads
   ═══════════════════════════════════════════════════════════════════

   Five of the seven types are drawn from one of the three sets. These two are
   not.

   CHARACTERS — settled, and this is it. Three set drawings were turned down,
   then three fresh candidates after them: a monogram with no picture, a small
   engraved calling card, and the cameo demoted to a stamp with the description
   indented under the name. The answer to all six was the same and it was the
   simplest possible one — an avatar, the words underneath, and no clever
   spacing anywhere in the card. Every rejected version had a *device* in it:
   a baseline-aligned grid, an inset card, a hanging indent. So this one has no
   device. One column, one leading edge, the avatar at the top and the words
   below it, and the only spacing decision left is which gap is bigger than
   which.

   PLOT THREADS — deferred. All three set drawings drew *how many times you
   have noticed it* — knots on a cord, tally strokes, ticks struck off a
   ledger. Counting is a real instinct and it is the wrong subject: a thread is
   a question you are carrying, and the thing that moves over a book is not the
   count, it is how sure you have become. The three candidates below all put
   the stance where the ticks were. None has been picked; the live thread keeps
   drawing threads from Pressed until one is, and `?th=a|b|c` swaps these in to
   look at. They come out with the gallery once that choice is made. */

import { Avatar } from '../avatars'
import { STANCE, STANCES } from '../kinds'
import { Motifs, type CardProps } from './shared'
import s from './redraw.module.css'

const foot = { footClass: s.foot, chipClass: s.chip, stanceClass: s.stance }

/* ══ CHARACTER ════════════════════════════════════════════════════════════
   The cameo on its mount, the name under it, what you know about them under
   that. Nothing is centred, nothing is indented, nothing is aligned to
   anything but the card's own leading edge. */

export function Character({ keep, onMotif }: CardProps) {
  return (
    <article className={`${s.card} ${s.person}`}>
      <span className={s.cameo}>
        <Avatar id={keep.avatar} size={56} />
      </span>
      <h3 className={s.name}>{keep.name}</h3>
      {keep.text && <p className={s.about}>{keep.text}</p>}
      <Motifs keep={keep} onMotif={onMotif} {...foot} />
    </article>
  )
}

/* ══ PLOT THREADS ═════════════════════════════════════════════════════════ */

/* ── A · The question ─────────────────────────────────────────────────────
   The barest of the three. The thread's name set large in the display serif —
   as the question it actually is, not as a case file's label — with the
   stance as a single word beneath it in the thread's hue, and the working
   under that. No count, no ticks, no band, no chip. */

export function ThreadQuestion({ keep, onMotif }: CardProps) {
  const stance = keep.stance ?? 'hunch'
  return (
    <article className={`${s.card} ${s.asking}`} data-stance={stance}>
      <h3 className={s.question}>{keep.name}</h3>
      <p className={s.saying}>{STANCE[stance].label.toLowerCase()}, so far</p>
      {keep.text && <p className={s.working}>{keep.text}</p>}
      {/* The stance is already the line under the question, so the foot here
          carries strand names only — printing "HUNCH" twice on one card was
          the tell that the chip row and the drawing were solving the same
          problem in two languages. */}
      <Motifs keep={keep} onMotif={onMotif} {...foot} stanceClass={s.stanceHidden} />
    </article>
  )
}

/* ── B · Stance gauge ─────────────────────────────────────────────────────
   A three-stop track — hunch, suspicion, certain — with the current stop
   filled and named, sitting above the title. It draws the one thing about a
   thread that actually moves over a book, and unlike three struck ticks it
   is readable without having been there when it was marked: the stops are
   labelled, so the position means something on sight. */

export function ThreadGauge({ keep, onMotif }: CardProps) {
  const stance = keep.stance ?? 'hunch'
  const weight = STANCE[stance].weight
  return (
    <article className={`${s.card} ${s.gauged}`} data-stance={stance}>
      <div
        className={s.gauge}
        role="img"
        aria-label={`How sure you are: ${STANCE[stance].label.toLowerCase()}`}
      >
        {STANCES.map((step, i) => (
          <span
            key={step}
            className={s.stop}
            data-reached={i < weight ? '' : undefined}
            data-current={i === weight - 1 ? '' : undefined}
          >
            <span className={s.pip} aria-hidden="true" />
            <span className={s.stopLabel} aria-hidden="true">
              {STANCE[step].label}
            </span>
          </span>
        ))}
      </div>
      <h3 className={s.gaugedName}>{keep.name}</h3>
      {keep.text && <p className={s.working}>{keep.text}</p>}
      <Motifs keep={keep} onMotif={onMotif} {...foot} stanceClass={s.stanceHidden} />
    </article>
  )
}

/* ── C · Open file ────────────────────────────────────────────────────────
   A case still open. The name in mono caps at the head, the working beneath,
   and a status strip along the foot of the card carrying the stance and the
   page it last moved on. Keeps the dossier language the reader responded to
   in Plates without the struck ticks that were the part they turned down. */

export function ThreadOpenFile({ keep, onMotif }: CardProps) {
  const stance = keep.stance ?? 'hunch'
  return (
    <article className={`${s.card} ${s.file}`} data-stance={stance}>
      <div className={s.fileBody}>
        <h3 className={s.fileName}>{keep.name}</h3>
        {keep.text && <p className={s.working}>{keep.text}</p>}
        <Motifs keep={keep} onMotif={onMotif} {...foot} stanceClass={s.stanceHidden} />
      </div>
      <div className={s.status}>
        <span className={s.statusStance}>{STANCE[stance].label}</span>
        {keep.page != null && <span className={s.statusPage}>p. {keep.page}</span>}
      </div>
    </article>
  )
}
