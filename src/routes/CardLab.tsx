/* /lab/cards — the three directions, side by side, on the same words.

   Not a product screen. It exists so a choice can be made by looking: every
   entry type drawn three completely different ways, three keeps deep, so a
   design is judged against real sentence lengths rather than against one
   flattering line.

   Nothing here writes to the database and nothing here is reachable from the
   app's own navigation. Once the seven choices are made, `cards/index.ts` is
   edited and this page stops mattering. */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Entry } from '../data/db'
import { KINDS, KIND, SIDE } from '../journey/kinds'
import { DIRECTIONS, SETS } from '../journey/cards'
import { SAMPLES, drawnPicture, silence } from '../journey/cards/samples'
import styles from './CardLab.module.css'

/** Pictures and recordings are made on the device on the way in, so the two
    media types are judged on their real drawing rather than on their empty
    state. Seeded off the keep, so re-rendering never reshuffles them. */
function useSampleMedia() {
  const [media, setMedia] = useState<Record<number, Blob>>({})

  useEffect(() => {
    let live = true
    const made: Record<number, Blob> = {}
    for (const keep of SAMPLES.voice) made[keep.id] = silence(keep.duration ?? 30)

    void Promise.all(
      SAMPLES.image.map(async (keep) => {
        made[keep.id] = await drawnPicture(keep.id)
      }),
    ).then(() => {
      if (live) setMedia(made)
    })

    return () => {
      live = false
    }
  }, [])

  return media
}

function CardLab() {
  const media = useSampleMedia()

  /* One pass, so a keep object is stable between renders — the drawings hold
     object URLs keyed on the blob, and a new blob every render would revoke
     and remake every picture on the page. */
  const samples = useMemo(() => {
    const out: Record<string, Entry[]> = {}
    for (const kind of KINDS) {
      out[kind] = SAMPLES[kind].map((keep) =>
        media[keep.id] ? { ...keep, media: media[keep.id] } : keep,
      )
    }
    return out
  }, [media])

  return (
    <main className={styles.lab}>
      <header className={styles.masthead}>
        <p className={styles.eyebrow}>Flyleaf — card directions</p>
        <h1 className={styles.title}>Three ways to keep a thing</h1>
        <p className={styles.standfirst}>
          Every entry type, drawn three completely different ways, on the same three pieces of
          writing. Pick one direction per type — they do not have to match.
        </p>
        <nav className={styles.jump} aria-label="Entry types">
          {KINDS.map((kind) => (
            <a key={kind} className={styles.jumpLink} href={`#${kind}`}>
              {KIND[kind].label}
            </a>
          ))}
        </nav>
        <Link className={styles.back} to="/book/111111">
          Back to the journey
        </Link>
      </header>

      {KINDS.map((kind) => {
        const { label, side } = KIND[kind]
        return (
          <section key={kind} id={kind} className={styles.kind}>
            <header className={styles.kindHead}>
              <h2 className={styles.kindName}>{label}</h2>
              <p className={styles.kindSide}>
                {SIDE[side].label} — {SIDE[side].blurb}
              </p>
            </header>

            <div className={styles.lanes}>
              {DIRECTIONS.map(({ id, name, blurb }) => {
                /* A type that arrived after the sets were judged has no set
                   drawing at all — see the note above `setOf`. The lane says
                   so rather than disappearing, so the gallery keeps reading as
                   three sets side by side. */
                const Card = SETS[id][kind]
                return (
                  <article key={id} className={styles.lane}>
                    <header className={styles.laneHead}>
                      <h3 className={styles.laneName}>{name}</h3>
                      <p className={styles.laneBlurb}>{blurb}</p>
                    </header>
                    <div className={styles.samples}>
                      {Card ? (
                        samples[kind].map((keep) => (
                          <div key={keep.id} className={styles.slot}>
                            <Card keep={keep} />
                          </div>
                        ))
                      ) : (
                        <p className={styles.laneBlurb}>
                          Never drawn in this set — drawn to order instead.
                        </p>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}
    </main>
  )
}

export default CardLab
