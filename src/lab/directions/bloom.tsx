/* DIRECTION 3 — BLOOM
   ═══════════════════
   Axis: COLOUR. The app already gives all eight kinds a muted hue and then
   spends it on a 12px notch, so every screen is the same pale blue whatever is
   on it. Here the hue reaches the page: the spine is woven out of the colours
   of the keeps actually on it, each keep warms the sky behind it, and Home
   opens with a portrait of what this reader has been collecting.

   The claim it is testing: the most engaging thing about somebody's journal is
   that it looks like theirs, and the only material the app has for that is the
   mix of kinds they keep.

   The restraint this direction lives or dies by: the spine is woven segment by
   segment, each one running from the previous keep's hue into its own, rather
   than being one gradient with twenty-four stops in it. A twenty-four-stop
   gradient is the rainbow the guardrails forbid; a hue that changes only where
   the kind changes is a record of what was kept. */

import BookCover from '../../components/BookCover'
import Face from '../../components/Face'
import type { Entry } from '../../data/db'
import { cardFor } from '../../journey/cards'
import { KIND } from '../../journey/kinds'
import { BOOK, READER, SHORT, ago, palette } from './stub'
import s from './bloom.module.css'

function Keep({ keep }: { keep: Entry }) {
  const Card = cardFor(keep.type)
  return <Card keep={keep} />
}

export function Home({ stream }: { stream: Entry[] }) {
  const mix = palette(stream)
  const fell = stream[1]
  const dominant = mix[0].kind

  return (
    <div className={s.column} style={{ '--dominant': `var(${KIND[dominant].hue})` } as React.CSSProperties}>
      {/* The sky, tinted by whatever this reader keeps most of. Fixed and
          behind everything, and low enough in alpha that the ink over it is
          untouched — the wash is 7%, which is below the grain already on the
          background. */}
      <span className={s.wash} aria-hidden="true" />

      <header className={s.mast}>
        <div>
          <p className={s.hello}>Good evening,</p>
          <p className={s.who}>{READER.name}</p>
        </div>
        <span className={s.portrait}>
          <Face seed={READER.face} size={48} />
        </span>
      </header>

      {/* THE PORTRAIT. One stacked bar, segmented by kind and proportional to
          what is in the drawer, with the three biggest named underneath. It is
          the only thing on Home that is about the reader rather than about a
          book, and it is made entirely of numbers the app already has. */}
      <section aria-labelledby="bloom-mix">
        <h2 id="bloom-mix" className={s.slug}>
          What you have been keeping
        </h2>
        <div
          className={s.bar}
          role="img"
          aria-label={mix.map(({ kind, count }) => `${count} ${KIND[kind].many}`).join(', ')}
        >
          {mix.map(({ kind, count }, i) => (
            <span
              key={kind}
              className={s.band}
              style={
                {
                  '--kind': `var(${KIND[kind].hue})`,
                  '--i': i,
                  flexGrow: count,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
        <ul className={s.legend}>
          {mix.slice(0, 3).map(({ kind, count }) => (
            <li key={kind} className={s.key} style={{ '--kind': `var(${KIND[kind].hue})` } as React.CSSProperties}>
              <span className={s.dot} aria-hidden="true" />
              {count} {count === 1 ? KIND[kind].one : KIND[kind].many}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="bloom-reading">
        <h2 id="bloom-reading" className={s.slug}>
          Currently reading
        </h2>
        <div className={s.hero}>
          <span className={s.bleed} aria-hidden="true" />
          <BookCover title={BOOK.title} author={BOOK.author} width={96} rotate={-2} />
          <div className={s.heroInfo}>
            <h3 className={s.title}>{BOOK.title}</h3>
            <p className={s.author}>{BOOK.author}</p>
            <p className={s.fact}>
              {stream.length} memories kept · opened {ago(BOOK.startedOn!)}
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="bloom-fell">
        <h2 id="bloom-fell" className={s.slug}>
          Look what fell out
        </h2>
        {/* The keep sits in a pool of its own hue, so the page's colour changes
            each time this card redraws — which is the one place on Home where
            something is genuinely different every visit. */}
        <div className={s.pool} style={{ '--kind': `var(${KIND[fell.type].hue})` } as React.CSSProperties}>
          <Keep keep={fell} />
          <p className={s.caption}>
            {KIND[fell.type].one} · {SHORT(fell.keptOn)} · from {BOOK.title}
          </p>
        </div>
      </section>
    </div>
  )
}

export function Journey({ stream }: { stream: Entry[] }) {
  return (
    <div className={s.column}>
      <header className={s.journeyHead}>
        <BookCover title={BOOK.title} author={BOOK.author} width={52} rotate={-2} />
        <div>
          <h1 className={s.journeyTitle}>{BOOK.title}</h1>
          <p className={s.journeyFact}>
            {BOOK.author} · {stream.length} kept
          </p>
        </div>
      </header>

      <ol className={s.thread}>
        {stream.map((keep, i) => (
          <li
            key={keep.id}
            className={s.notch}
            style={
              {
                '--i': i,
                '--kind': `var(${KIND[keep.type].hue})`,
                /* The segment above this keep runs out of the previous keep's
                   colour and into this one — the weave. The first keep has
                   nothing above it, so it starts from its own hue. */
                '--prev': `var(${KIND[(stream[i - 1] ?? keep).type].hue})`,
              } as React.CSSProperties
            }
          >
            <span className={s.strand} aria-hidden="true" />
            <span className={s.knot} aria-hidden="true" />
            <div className={s.hang}>
              <p className={s.kind}>
                {KIND[keep.type].one}
                <span className={s.when}>
                  {SHORT(keep.keptOn)}
                  {keep.page ? ` · p.${keep.page}` : ''}
                </span>
              </p>
              <div className={s.card}>
                <span className={s.glow} aria-hidden="true" />
                <Keep keep={keep} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
