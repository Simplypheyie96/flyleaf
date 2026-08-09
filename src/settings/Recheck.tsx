import { useState } from 'react'
import styles from './Recheck.module.css'

/* "IS THERE A NEWER FLYLEAF, AND CAN I HAVE IT NOW."
   ═════════════════════════════════════════════════

   A new build announces itself — see UpdateToast, and registerType in
   vite.config.ts. This is not the delivery mechanism and does not replace it.
   It is the ANSWER ON DEMAND, for the reader who does not want to wait to be
   told: she is hunting for a fix, she wants to know NOW whether it has reached
   her, and "keep the app open and one will turn up" is not an answer.

   Without it, a reader cannot tell "it has not reached me yet" from "it
   reached me and did not work" — two problems with completely different next
   steps — and the version at the foot of Settings just sits there not moving.

   So the version is stated above, and this asks the server outright and says
   what came back.

   So: ask, and then say what came back. Three outcomes, all of them stated —
   there is already a newer build and here is the button that takes it; there
   is not, this is the latest; or the check itself could not run. None of them
   leaves "keep reloading" as the reader's next move.

   WHY IT TALKS TO THE REGISTRATION DIRECTLY rather than sharing the hook in
   UpdateToast. `useRegisterSW` registers a worker as a side effect of being
   mounted, and mounting a second copy of it inside Settings would mean two
   registrations racing over one scope. `getRegistration()` reads the one that
   already exists and changes nothing. */

type State =
  | { at: 'idle' }
  | { at: 'checking' }
  | { at: 'latest' }
  | { at: 'ready'; reg: ServiceWorkerRegistration }
  | { at: 'failed' }

/** A worker that has finished installing and is holding at `waiting` is the
    new build, sitting there asking to be let in. `installing` is the same
    build a moment earlier, so we wait for it to finish rather than reporting
    "you are up to date" to someone who is seconds away from not being. */
function settled(reg: ServiceWorkerRegistration) {
  if (reg.waiting) return Promise.resolve(true)
  const sw = reg.installing
  if (!sw) return Promise.resolve(false)
  return new Promise<boolean>((resolve) => {
    sw.addEventListener('statechange', () => {
      if (sw.state === 'installed') resolve(true)
      /* redundant means it was discarded — usually because it turned out to be
         byte-identical to the running one. Nothing new, and saying so is the
         truthful answer. */
      if (sw.state === 'redundant') resolve(false)
    })
  })
}

function Recheck() {
  const [state, setState] = useState<State>({ at: 'idle' })

  const check = async () => {
    setState({ at: 'checking' })
    try {
      const reg = await navigator.serviceWorker?.getRegistration()
      if (!reg) {
        setState({ at: 'failed' })
        return
      }
      await reg.update()
      setState(
        (await settled(reg)) ? { at: 'ready', reg } : { at: 'latest' },
      )
    } catch {
      setState({ at: 'failed' })
    }
  }

  /* The waiting worker will not take over while the old one still controls a
     page, so it has to be told to stand down. `controllerchange` is the moment
     the new one is actually in charge, and reloading before it fires would
     just load the old build again. The timeout is a floor, not a plan: if the
     event never comes, a reload is still better than a button that did
     nothing visible. */
  const take = () => {
    const state2 = state
    if (state2.at !== 'ready') return
    navigator.serviceWorker.addEventListener('controllerchange', () =>
      window.location.reload(),
    )
    state2.reg.waiting?.postMessage({ type: 'SKIP_WAITING' })
    window.setTimeout(() => window.location.reload(), 2500)
  }

  if (state.at === 'ready') {
    return (
      <div className={styles.wrap}>
        <p className={styles.said}>A newer version is ready.</p>
        <button type="button" className={styles.action} onClick={take}>
          Install it and reload
        </button>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.action}
        onClick={check}
        disabled={state.at === 'checking'}
      >
        {state.at === 'checking' ? 'Checking…' : 'Check for updates'}
      </button>
      {state.at === 'latest' && (
        <p className={styles.said}>This is the latest version.</p>
      )}
      {state.at === 'failed' && (
        <p className={styles.said}>
          Unable to check. Open flyleaf.cc in a browser tab and reload it once.
        </p>
      )}
    </div>
  )
}

export default Recheck
