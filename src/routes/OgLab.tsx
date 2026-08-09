/* THE PICTURE THE LINK SHOWS.

   When somebody pastes the Flyleaf address into a message, a group chat or a
   post, the app gets one 1200×630 rectangle to say what it is. Right now it
   gets none — index.html has no og:image at all, so the link arrives as a bare
   grey URL, which for an app asking a stranger to trust it with a year of
   their reading is the worst possible first frame.

   This route is the studio, not the picture. Three compositions live here at
   exactly 1200×630; the chosen one is screenshotted to public/og.png and it is
   the PNG, not this file, that ships. Keeping the studio means the picture can
   be regenerated when the mark, the type or the palette move, instead of
   becoming an image nobody can rebuild — which is how a brand ends up with a
   share card two redesigns out of date.

   It is a workbench route, gated with /styleguide and /lab/cards: dev and
   preview only, folded out of the production bundle.

   EVERYTHING HERE IS THE APP'S OWN. The sky is the same thirteen gradients
   body::before paints, the flower is Wordmark's MARK, the rabbit is the one
   rigged animal. Nothing is redrawn for the card, because a share picture that
   disagrees with the app it opens is worse than no share picture. */

import { useState } from 'react'
import Bunny from '../rabbit/Bunny'
import Wordmark, { MARK } from '../brand/Wordmark'
import styles from './OgLab.module.css'

const TAGLINE = 'Your journey through every book you read'

/* Scattered the way the field scatters them behind the app, but composed for
   one fixed rectangle rather than a viewport of unknown size — so these are
   placed against the composition rather than kept to margins a column might
   reach. Percentages of the 1200×630 board. */
type Bloom = { x: number; y: number; s: number; r: number; o: number }

function Flowers({ blooms }: { blooms: Bloom[] }) {
  return (
    <div className={styles.blooms} aria-hidden="true">
      {blooms.map((f, i) => (
        <svg
          key={i}
          viewBox="0 0 512 512"
          className={styles.bloom}
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            width: f.s,
            height: f.s,
            opacity: f.o,
            transform: `rotate(${f.r}deg)`,
          }}
        >
          <path d={MARK} />
        </svg>
      ))}
    </div>
  )
}

/* ---- One: open sky, centred ----
   The app's front door. The mark and the word dead centre, the tagline under
   them, the rabbit waving up from the lower edge. Symmetrical because this is
   the version that has to survive being 240px wide in a chat list, and at that
   size a centred wordmark is the only layout that still reads. */
function OpenSky() {
  return (
    <div className={`${styles.board} ${styles.sky}`}>
      <Flowers
        blooms={[
          { x: 8, y: 16, s: 46, r: -14, o: 0.5 },
          { x: 87, y: 11, s: 34, r: 22, o: 0.42 },
          { x: 92, y: 62, s: 52, r: -32, o: 0.38 },
          { x: 4, y: 68, s: 38, r: 12, o: 0.45 },
          { x: 74, y: 82, s: 26, r: 8, o: 0.35 },
          { x: 20, y: 86, s: 30, r: -20, o: 0.32 },
        ]}
      />
      <div className={styles.centred}>
        <Wordmark size={92} />
        <p className={styles.tagline}>{TAGLINE}</p>
      </div>
      <div className={styles.waveSpot}>
        <Bunny pose="wave" size={250} />
      </div>
    </div>
  )
}

/* ---- Two: scrapbook spread ----
   What the app actually makes, rather than what it is called. Three keeps at
   slight angles on the sky, the wordmark small and top-left the way a masthead
   sits, the rabbit peeking from behind the stack.

   The cards are drawn here rather than imported from journey/cards: those
   components are wired to real entries and a live database, and a share
   picture needs three fixed, invented keeps that say nothing about anybody's
   actual reading. The paper, the rotation and the tape are the app's. */
function Scrapbook() {
  return (
    <div className={`${styles.board} ${styles.sky}`}>
      <Flowers
        blooms={[
          { x: 90, y: 12, s: 40, r: 18, o: 0.4 },
          { x: 5, y: 58, s: 34, r: -22, o: 0.38 },
          { x: 84, y: 78, s: 28, r: 10, o: 0.3 },
        ]}
      />
      <div className={styles.masthead}>
        <Wordmark size={44} />
      </div>

      <div className={styles.spread}>
        <div className={`${styles.card} ${styles.quoteCard}`}>
          <span className={styles.tape} aria-hidden="true" />
          <p className={styles.quoteText}>
            “She read the way other people breathed — without noticing, and
            without stopping.”
          </p>
          <p className={styles.cardFoot}>page 214</p>
        </div>

        <div className={`${styles.card} ${styles.photoCard}`}>
          <div className={styles.photo} aria-hidden="true" />
          <p className={styles.cardFoot}>the window seat</p>
        </div>

        <div className={`${styles.card} ${styles.memoCard}`}>
          <span className={styles.orb} aria-hidden="true" />
          <div className={styles.wave} aria-hidden="true">
            {[9, 17, 26, 20, 31, 14, 24, 11, 19, 27, 15, 8].map((h, i) => (
              <span key={i} style={{ height: h }} />
            ))}
          </div>
          <p className={styles.cardFoot}>0:42</p>
        </div>
      </div>

      {/* The cards show what the app MAKES; this says what it IS. Without it
          the picture is three pretty rectangles a stranger cannot name, which
          is a share card doing half its job.

          It sits bottom-left, last in the reading order, rather than under the
          masthead: the name arrives first, the keeps prove it, and the
          sentence closes. Putting it at the top instead would push the spread
          into the lower half and cost the composition its whole middle. */}
      <div className={styles.say}>
        <p className={styles.sayLine}>A private journal for the books you read</p>
        <p className={styles.sayNote}>
          Quotes, notes, voice memos and photographs — kept on your own device.
        </p>
      </div>

      <div className={styles.peekSpot}>
        <Bunny pose="peek" size={150} />
      </div>
    </div>
  )
}

/* ---- Three: bookplate ----
   The literal thing the app is named after: the plate pasted inside a front
   board, with a ruled border and an inscription. One sheet of paper on the
   sky, everything typeset on it, the rabbit and the pressed blooms out in the
   margin as marginalia rather than as illustration.

   The most restrained of the three and the one that carries the name best —
   at a glance it is a book, which is the whole claim. */
function Bookplate() {
  return (
    <div className={`${styles.board} ${styles.sky}`}>
      <Flowers
        blooms={[
          { x: 4, y: 14, s: 44, r: -16, o: 0.45 },
          { x: 93, y: 20, s: 30, r: 24, o: 0.38 },
          { x: 7, y: 74, s: 34, r: 10, o: 0.4 },
          { x: 91, y: 76, s: 40, r: -12, o: 0.35 },
        ]}
      />
      <div className={styles.plate}>
        <div className={styles.rule}>
          <Wordmark size={64} />
          <span className={styles.hair} aria-hidden="true" />
          <p className={styles.plateLine}>{TAGLINE}</p>
          <p className={styles.plateNote}>
            Quotes, notes, voice memos and pressed photographs — kept on your
            own device.
          </p>
        </div>
      </div>
      <div className={styles.marginSpot}>
        <Bunny pose="think" size={168} />
      </div>
    </div>
  )
}

const SHOTS = [
  { id: 'sky', name: 'Open sky, centred', View: OpenSky },
  { id: 'scrapbook', name: 'Scrapbook spread', View: Scrapbook },
  { id: 'plate', name: 'Bookplate', View: Bookplate },
]

function OgLab() {
  const [only, setOnly] = useState<string | null>(
    new URLSearchParams(window.location.search).get('shot'),
  )

  /* ?shot=sky renders that one composition alone on a bare page, which is what
     the screenshot is taken against — the picker and the captions would
     otherwise end up inside the 1200×630 crop. */
  const shown = only ? SHOTS.filter((s) => s.id === only) : SHOTS

  return (
    <main className={only ? styles.bare : styles.lab}>
      {!only && (
        <header className={styles.labHead}>
          <h1>Share picture</h1>
          <p>
            Three compositions at 1200×630, the size a link preview is cropped
            to. Open one on its own to screenshot it.
          </p>
          <div className={styles.picker}>
            {SHOTS.map((s) => (
              <button key={s.id} type="button" onClick={() => setOnly(s.id)}>
                {s.name}
              </button>
            ))}
          </div>
        </header>
      )}

      {shown.map(({ id, name, View }) => (
        <figure key={id} className={styles.slot}>
          <View />
          {!only && <figcaption>{name}</figcaption>}
        </figure>
      ))}
    </main>
  )
}

export default OgLab
