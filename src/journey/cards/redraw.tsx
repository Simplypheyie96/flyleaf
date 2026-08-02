/* THE FOURTH DRAWING — characters and plot threads
   ════════════════════════════════════════════════

   Five of the seven types are settled. These two are not: all three of the
   original directions were turned down for both, and re-picking from three
   drawings that were already rejected is not a decision, it is a coin toss.
   So this file holds three fresh candidates for each, to be looked at in the
   real thread and chosen from.

   Why each of them failed is worth stating, because it is what these are
   built against.

   CHARACTERS. All three led with a portrait — a cameo in an oval, a person
   glyph, a plate with a name band. But the app has no portrait: it has a
   silhouette the reader picked off a sheet. So each version put a stand-in
   likeness in the hero slot of the card and then arranged everything else
   around it, which is why the avatar kept reading wrong no matter how it was
   drawn. The fault is hierarchy, not draughtsmanship. Two of the three below
   remove the picture entirely; the third keeps it and demotes it.

   PLOT THREADS. All three drew *how many times you have noticed it* — knots
   on a cord, tally strokes, ticks struck off a ledger. Counting is a real
   instinct and it is the wrong subject: a thread is a question you are
   carrying, and the thing that moves over a book is not the count, it is how
   sure you have become. All three below put the stance where the ticks were.

   These are candidates, not a fourth complete set. `?ch=` and `?th=` on a
   book's URL swap them in; nothing links to it and this whole file comes out
   with the gallery once the two choices are made. */

import { Avatar } from '../avatars'
import { STANCE, STANCES } from '../kinds'
import { Motifs, type CardProps } from './shared'
import s from './redraw.module.css'

const foot = { footClass: s.foot, chipClass: s.chip, stanceClass: s.stance }

/* ══ CHARACTERS ═══════════════════════════════════════════════════════════ */

/* ── A · Monogram ─────────────────────────────────────────────────────────
   No portrait at all. The initial set very large in the display serif in the
   character's own hue, the name in small caps beside it, the description
   under both. The journey already opens on a drop cap — "Cracked the spine on
   July 2" — so the move is native to the page rather than imported onto it,
   and a letter is the one mark that is unarguably *this person* without
   pretending to be their face. */

export function CharacterMonogram({ keep, onMotif }: CardProps) {
  // Grapheme-aware: `[...name][0]` keeps an emoji or an accented letter whole
  // where `name[0]` would hand back half a surrogate pair.
  const initial = [...(keep.name ?? '?').trim()][0] ?? '?'
  return (
    <article className={`${s.card} ${s.monogram}`}>
      <div className={s.mono}>
        <span className={s.letter} aria-hidden="true">
          {initial}
        </span>
        <h3 className={s.named}>{keep.name}</h3>
      </div>
      {keep.text && <p className={s.about}>{keep.text}</p>}
      <Motifs keep={keep} onMotif={onMotif} {...foot} />
    </article>
  )
}

/* ── B · Calling card ─────────────────────────────────────────────────────
   A small formal card inset into the keep: the name centred in the display
   serif between two hairline rules, nothing else inside it. The description
   sits below the card, on the keep's own paper, so the card stays an object
   you were handed rather than a container everything lives in. Reads as being
   introduced to someone instead of looking at their photograph. */

export function CharacterCallingCard({ keep, onMotif }: CardProps) {
  return (
    <article className={`${s.card} ${s.calling}`}>
      <div className={s.callingCard}>
        <span className={s.rule} aria-hidden="true" />
        <h3 className={s.engravedName}>{keep.name}</h3>
        <span className={s.rule} aria-hidden="true" />
      </div>
      {keep.text && <p className={s.about}>{keep.text}</p>}
      <Motifs keep={keep} onMotif={onMotif} {...foot} />
    </article>
  )
}

/* ── C · Tracked person ───────────────────────────────────────────────────
   The one that keeps a face. The avatar drops to a 40px stamp on the leading
   edge, level with the name, and the card becomes a running record: who, then
   what you noticed, indented to begin exactly under the name the way an
   observation is entered against one. The picture is still there and is no
   longer the subject. */

export function CharacterTracked({ keep, onMotif }: CardProps) {
  return (
    <article className={`${s.card} ${s.tracked}`}>
      <header className={s.who}>
        <span className={s.stamp}>
          <Avatar id={keep.avatar} size={40} />
        </span>
        <h3 className={s.trackedName}>{keep.name}</h3>
      </header>
      {keep.text && <p className={s.observed}>{keep.text}</p>}
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
