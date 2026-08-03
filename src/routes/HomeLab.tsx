/* /lab/home — every candidate for the home screen, side by side, live.

   This page exists because a decision about a screen cannot be made from a
   screenshot sent in a message. A screenshot is one moment at one width with
   no scroll, and by the time there are six of them the only way to compare two
   is to scroll back through a conversation looking for them. A choice between
   whole screens needs the screens, running, next to each other, at the same
   moment.

   Real iframes rather than three copies of the page in one document, and that
   is the whole trick. The app's breakpoints are viewport queries; three
   390-wide divs on a 1400-wide desktop would each resolve the *desktop* rules
   and every frame would be a lie. An iframe carries its own viewport, so what
   is in these frames is what is on a phone — including the bottom bar and the
   add button, which sit outside the route and would otherwise be missing.

   Adding a candidate means adding a row to HOME_DIRECTIONS in home/Recent.tsx.
   Nothing here needs to know what the candidates are.

   Not reachable from the app's own navigation, and it comes out with the
   losing directions once one is chosen. */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HOME_DIRECTIONS } from './home/Recent'
import styles from './HomeLab.module.css'

/* Both states matter and they are not the same design question, so the page
   shows one at a time rather than six frames at once: comparing A-with-books
   against B-with-books is the comparison, and interleaving the first-run
   frames between them makes it impossible. */
const STATES = [
  { id: 'now', label: 'With books', query: '' },
  { id: 'first', label: 'First run', query: '&empty' },
] as const

function HomeLab() {
  const [state, setState] = useState<(typeof STATES)[number]['id']>('now')
  const active = STATES.find((s) => s.id === state) ?? STATES[0]

  return (
    <main className={styles.lab}>
      <header className={styles.masthead}>
        <p className={styles.eyebrow}>Flyleaf — home screen</p>
        <h1 className={styles.title}>What goes under the book</h1>
        <p className={styles.standfirst}>
          Every candidate for the home screen, running at phone width. Scroll
          inside a frame the way you would on the device, and switch between a
          reader who has books and one who has just arrived.
        </p>

        <div className={styles.states} role="group" aria-label="Reader state">
          {STATES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={styles.state}
              aria-pressed={s.id === state}
              onClick={() => setState(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <Link className={styles.back} to="/">
          Back to the app
        </Link>
      </header>

      <div className={styles.frames}>
        {HOME_DIRECTIONS.map(({ id, name, blurb }) => (
          <section key={id} className={styles.frame}>
            <header className={styles.frameHead}>
              <h2 className={styles.frameName}>
                <span className={styles.frameLetter}>{id.toUpperCase()}</span>
                {name}
              </h2>
              <p className={styles.frameBlurb}>{blurb}</p>
            </header>
            {/* Keyed on the state so switching remounts the frame rather than
                leaving it scrolled to where the other state was. */}
            <iframe
              key={`${id}-${state}`}
              className={styles.screen}
              title={`${name} — ${active.label}`}
              src={`/?home=${id}${active.query}`}
            />
          </section>
        ))}
      </div>
    </main>
  )
}

export default HomeLab
