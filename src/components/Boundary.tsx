import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import styles from './Boundary.module.css'

/** The last page in the app.
 *
 *  A render that throws takes React's whole tree down with it and leaves a
 *  white screen. In most apps that is an annoyance. Here it is the shape of a
 *  much worse thing: everything a reader has written lives on this device, so
 *  a blank Flyleaf reads as a Flyleaf that lost it all — and reading that is
 *  enough to make somebody delete the app before the next release lands.
 *
 *  So this says the true thing, plainly: the writing is still there, this
 *  screen is not. One button, which reloads, because a fresh render is what
 *  actually fixes it. A class, because a boundary can only be a class. */
class Boundary extends Component<{ children: ReactNode }, { fell: boolean }> {
  state = { fell: false }

  static getDerivedStateFromError() {
    return { fell: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Flyleaf could not draw this screen.', error, info.componentStack)
  }

  render() {
    if (!this.state.fell) return this.props.children
    return (
      <div className={styles.fell} role="alert">
        <h1 className={styles.title}>This page would not open</h1>
        <p className={styles.said}>
          Nothing is lost — everything you have kept is still on this device. Flyleaf just could
          not draw this one screen.
        </p>
        <button type="button" className={styles.again} onClick={() => window.location.reload()}>
          Open it again
        </button>
      </div>
    )
  }
}

export default Boundary
