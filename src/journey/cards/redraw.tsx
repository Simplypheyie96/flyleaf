/* DRAWN TO ORDER — the four cards that are not drawn from a set
   ══════════════════════════════════════════════════════════════

   Four of the eight types are drawn from one of the three sets. These four are
   not. Three of them got here the same way: every set drawing was turned down,
   and the reason was always that the drawing had a *device* in it rather than
   a shape. The fourth, vocabulary, arrived after the sets had been judged and
   was drawn to order from the start rather than back-ported into three sheets
   nothing would read again.

   CHARACTERS — an avatar, the words underneath, and no clever spacing
   anywhere. Six versions before this one all had a device: a baseline grid, an
   inset card, a hanging indent. This one has none.

   PLOT THREADS — an open case, tabbed like one. Every drawing before this one
   put its difference *inside* the rectangle — knots on a cord, tally strokes,
   a status strip — which from two feet away is the same card as a note with
   something drawn on it. So the difference is the outline: the border is
   dashed rather than drawn, because a thread is the one kind that is not
   settled yet and a broken line is what provisional looks like, and the stance
   is a tab cut into the top corner rather than a line inside the column. Both
   are visible before a word is read.

   The tab was a seal for a while — a ring hung half off the leading edge,
   filling a third of the way round for a hunch and closed for something
   certain, on the argument that one shape carrying one fact beats a second
   label to read. It is a good argument about a shape nobody can read: a ring
   reports a value out of three with no scale on screen to read it against, so
   it only worked for someone who already knew, and it sat where the card's own
   name should be. The word says the thing. The tab is the shape.

   VOCABULARY — a size, and nothing else at all. See its own note below.

   VOICE — an instrument. It is the only keep on the page you *operate* rather
   than read, and the drawing has to say so before anything else does: a filled
   disc big enough to be the first thing your thumb finds, the recording's own
   shape beside it filling as it runs, and the time trailing. */

import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { Avatar } from '../avatars'
import { STANCE } from '../kinds'
import { PauseIcon, PlayIcon } from '../../components/TabIcons'
import { clock, usePlayback, useWave, type CardProps } from './shared'
import s from './redraw.module.css'

/* ══ CHARACTER ════════════════════════════════════════════════════════════

   A page from a dramatis personae. The cameo and the name share a band across
   the top — one thing, *who this is* — and what you know about them runs the
   full width underneath, on the other side of the rule.

   The cameo used to sit alone on its own line with the name beneath it, and
   that left two thirds of the top of the card as empty paper. It also left the
   name and the account as two paragraphs a size apart, which is a size
   difference rather than a hierarchy. One row does both jobs: it fills, and it
   pairs.

   The markup has not changed since; the drawing in the plate has. The portraits
   are filled colour art now rather than a pen line, so the plate is set larger
   — a face is only a few pixels of a portrait and it was too small to have an
   expression at all — and the name takes the step above the account it was
   always described as taking. Both live in the stylesheet. */

export function Character({ keep }: CardProps) {
  return (
    <article className={`${s.card} ${s.person}`}>
      <div className={s.who}>
        <span className={s.cameo}>
          <Avatar name={keep.name} note={keep.text} face={keep.face} />
        </span>
        <h3 className={s.name}>{keep.name}</h3>
      </div>
      {keep.text && <p className={s.about}>{keep.text}</p>}
    </article>
  )
}

/* ══ VOCABULARY ═══════════════════════════════════════════════════════════

   A type specimen, set flush left. The headword in small caps with the
   tracking opened out, the way it is said on the line under it beside the
   part of speech, a short rust rule, then the sense.

   This is the third drawing and the second one shipped. The first was a
   dictionary column with a hanging dash. The second was an index card: the
   headword and chip on a header row closed by a two-pixel rust rule, with the
   gloss written on faint ruling. The ruling was the good part of it and the
   rule was not — a full-width two-pixel line under a single word is heavier
   than anything else in the journey, and it read as an underline rather than
   as a card's own furniture, which is what the owner said when they saw it on
   a real page. Thinning it would only have made a quieter version of the same
   idea. So the header comes apart instead.

   What replaces it is the specimen's own logic: nothing on this card is
   framed, and the hierarchy is carried by *the letters* rather than by lines
   drawn around them. Small caps do the work the 2px rule was doing — a word
   in caps at the top of a card is unmistakably the thing the card is about,
   and it needs no line to close it. The rule survives at a fifth of the
   weight and a fifth of the width: 1px, 32 wide, held at the leading edge. At
   that size it is a printer's mark separating the entry from its definition,
   not an underline under a word.

   Flush left, though the specimen it is named after was centred. Centred was
   the better label and the wrong card: every other keep in the journey — the
   quote, the note, the character, the thread — starts on the same vertical,
   and one card centred in a scrolling column reads as a card that has come
   loose. The owner called that in the round it was picked. Left-aligned, the
   whole set still shares an edge and this card is still the only one in small
   caps.

   The ruled gloss goes with the index card it belonged to. A specimen is
   printed on clean stock; ruling it would be two devices arguing.

   Everything under the headword is conditional on being true. The phonetic
   and the part of speech only exist when the look-up fetched them — a
   hand-written entry never grows a pronunciation the reader did not hear —
   and the rule belongs to the gloss rather than to the header, so a card with
   only a word and a meaning has exactly two pieces and one mark between them,
   with nothing left dangling in either honest state.

   `overflow-wrap` is the one defensive line: German and Latin arrive in this
   card at eighteen characters and there is no sensible break in them, and a
   headword that runs off the trailing edge is worse than one that breaks. */

export function Vocabulary({ keep }: CardProps) {
  return (
    <article className={`${s.card} ${s.lexicon}`}>
      <h3 className={s.word}>{keep.name}</h3>
      {(keep.phonetic || keep.pos) && (
        <p className={s.saying}>
          {keep.phonetic && <span className={s.phonetic}>{keep.phonetic}</span>}
          {keep.pos && <i className={s.pos}>{keep.pos}</i>}
        </p>
      )}
      {keep.text && <p className={s.gloss}>{keep.text}</p>}
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

   The tab is the second shape. The stance sits on it, cut into the top corner
   and filled, which is where a case file carries its own name and which
   nothing else in the journey does. It was a seal for a while — a ring hung
   half off the leading rule, filling as the stance hardened — on the argument
   that one shape carrying one fact beats a label you have to read. The
   argument holds for shapes that can be read. A ring reports a value out of
   three against a scale that is nowhere on the screen, so it told you nothing
   you did not already know, and it stood where the card's own name goes. The
   word is the fact; the tab is the shape.

   The question is one line. A thread's name is a thing you are carrying
   around, not a paragraph, and a name that wraps turns every card in the
   journey a different height for no reason a reader can act on. The full text
   stays reachable on hover and in the entry itself. */

export function Thread({ keep }: CardProps) {
  const stance = keep.stance ?? 'hunch'
  return (
    <article className={`${s.card} ${s.dossier}`} data-stance={stance}>
      {/* The stance, on a tab cut into the top corner — first in the markup
          because it is first in the reading order and first on the card, and
          pulled onto the card's own edge in CSS rather than positioned out of
          flow, so the title below it moves when the tab does. */}
      <p className={s.standing}>{STANCE[stance].label}</p>

      <h3 className={s.asked} title={keep.name}>
        {keep.name}
      </h3>
      {keep.text && <p className={s.working}>{keep.text}</p>}
    </article>
  )
}

/* ══ VOICE ════════════════════════════════════════════════════════════════

   Reversed out of the page in both themes, because a recording is a device and
   not a piece of paper — the one object in the journey with no paper at all.

   THE RECORDING IS THE CARD. This led with a 56px filled disc and put the
   sound beside it as a 28-bar strip at a third of the disc's height, on the
   argument that a voice memo is a thing you operate and the control should be
   the first thing your thumb finds. The argument holds for the *control* and
   fails for the *card*: from arm's length what you saw was a circle with a
   texture next to it, and a circle is what every button in every app looks
   like. A recording looks like exactly one thing, and this is now that thing —
   the real decoded peaks, full width, tall enough to read a sentence's shape
   in, filling as the tape runs.

   And once the shape is real and that size, it has to be the scrubber. The
   loud part is visibly *there*; a card that draws where the reader raised
   their voice and then only lets you play from the top is showing you a door
   with no handle. */

const BARS = 46

export function Voice({ keep }: CardProps) {
  const { playing, at, length, toggle, seek, ready } = usePlayback(keep.media)
  const bars = useWave(keep.media, keep.id, BARS)

  /* The row's own figure first — it is there the instant the card paints,
     where the file's is only known once the browser has read the header. */
  const total = keep.duration || length
  const live = ready && total > 0

  /* Elapsed over the whole length. Both, rather than the one-or-the-other this
     card used to swap between: the moment the wave became scrubbable the
     listener needs to know where they are *and* how much is left, and a figure
     that silently changes meaning when playback starts is a riddle. Tabular,
     so counting up never shifts the row. */
  const now = clock(at * total)
  const whole = clock(total)

  function nudge(event: KeyboardEvent<HTMLDivElement>) {
    if (!live) return
    const step = event.key === 'ArrowLeft' ? -5 : event.key === 'ArrowRight' ? 5 : 0
    if (step) {
      event.preventDefault()
      seek(at + step / total)
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      seek(event.key === 'Home' ? 0 : 1)
    }
  }

  function scrub(event: PointerEvent<HTMLDivElement>) {
    if (!live) return
    const box = event.currentTarget.getBoundingClientRect()
    seek((event.clientX - box.left) / box.width)
  }

  return (
    <article className={`${s.card} ${s.recorder}`} data-playing={playing || undefined}>
      {/* A slider, because what it sets is a position in a recording and not a
          yes or no. Arrow keys move five seconds and Home/End go to the ends —
          the contract the platform's own audio element already offers, so
          there is nothing new to learn here.

          The bars themselves are two stacked rows rather than one row of
          two-tone bars: a bar is two pixels wide, and the boundary between
          heard and not-yet has to be able to fall inside one. */}
      <div
        className={s.wave}
        style={{ '--played': live ? at : 0 } as CSSProperties}
        role="slider"
        tabIndex={live ? 0 : -1}
        aria-label="Position in this voice memo"
        aria-disabled={live ? undefined : true}
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(at * total)}
        aria-valuetext={`${now} of ${whole}`}
        onPointerDown={scrub}
        onKeyDown={nudge}
      >
        <span className={s.bars} aria-hidden="true">
          {bars.map((height, i) => (
            /* The index rides along so a running memo can ripple: each bar's
               bob is offset from its neighbour's by a beat. */
            <span
              key={i}
              className={s.waveBar}
              style={{ blockSize: `${height * 100}%`, '--i': i } as CSSProperties}
            />
          ))}
        </span>
        <span className={s.barsHeard} aria-hidden="true">
          {bars.map((height, i) => (
            /* The index rides along so a running memo can ripple: each bar's
               bob is offset from its neighbour's by a beat. */
            <span
              key={i}
              className={s.waveBar}
              style={{ blockSize: `${height * 100}%`, '--i': i } as CSSProperties}
            />
          ))}
        </span>
        <span className={s.head} aria-hidden="true" />
      </div>

      <div className={s.transport}>
        <button
          type="button"
          className={s.play}
          onClick={toggle}
          disabled={!ready}
          aria-label={playing ? 'Pause this voice memo' : 'Play this voice memo'}
        >
          {playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
        </button>
        <p className={s.elapsed}>
          {now}
          <span className={s.of}> / {whole}</span>
        </p>
      </div>

      {keep.text && <p className={s.said}>{keep.text}</p>}
    </article>
  )
}
