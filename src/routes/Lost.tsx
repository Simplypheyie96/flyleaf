import { Link } from 'react-router-dom'
import Bunny from '../rabbit/Bunny'
import pageStyles from './page.module.css'
import styles from './Lost.module.css'

/** Wherever the address went.
 *
 *  Every route the app has is one somebody reached by tapping something, so
 *  nobody arrives here by walking. They arrive by a link that got cut in half
 *  in a message, an old address that has moved, or a typed URL. What that has
 *  in common is that it is not the reader's fault and nothing is wrong with
 *  their journey, so this says so and points at the one door back.
 *
 *  Deliberately not an apology and not a joke. A 404 with a gag on it is
 *  charming once and grating the second time, and this is the screen somebody
 *  might hit while wondering whether the app they trusted with a year of notes
 *  is broken. It answers that question in the second line and gets out of the
 *  way.
 *
 *  No status code, no "404". The number is a fact about a server, and there is
 *  no server here — the whole app is on the device. Printing it would be the
 *  app explaining itself in a vocabulary the reader has no use for. */
function Lost() {
  return (
    <main className={pageStyles.page}>
      <div className={`${pageStyles.column} ${styles.fill}`}>
        <div className={styles.middle}>
          {/* Peeking, which is the pose for looking around for something that
              is not where it should be. The rabbit belongs here and pointedly
              does NOT belong on the crash boundary: this screen is the app
              working correctly on a bad address, and a bit of charm is the
              honest register for that. A crash is not charming. */}
          <Bunny pose="peek" size={150} />
          <h1 className={styles.title}>This page isn’t here</h1>
          <p className={styles.said}>
            The address doesn’t match anything in Flyleaf. Your books and everything you’ve kept
            are untouched — they’re on this device, exactly where you left them.
          </p>
          <Link to="/" className={styles.back}>
            Go to Home
          </Link>
        </div>
      </div>
    </main>
  )
}

export default Lost
