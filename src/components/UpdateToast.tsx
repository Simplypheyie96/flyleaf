import { useRegisterSW } from 'virtual:pwa-register/react'
import GlassSurface from './GlassSurface'
import LeafButton from './LeafButton'
import styles from './Toast.module.css'

/** How often an open copy of Flyleaf asks the server whether a newer build
    exists. An hour is far more often than we ship and still costs one
    conditional request that is almost always a 304. */
const UPDATE_EVERY_MS = 60 * 60 * 1000

/** SHIP THIS ONE WITHOUT KNOCKING.
 *
 *  Flip to true for a release that changes nothing a reader is in the middle
 *  of — a layout tidy-up, a control that went away — and the notice below
 *  never appears. Flip it back to false, which is the standing default, for
 *  anything a reader would want to be told about: a fix she is waiting on, a
 *  feature, anything that changes what her data does.
 *
 *  It suppresses the ASKING, not the delivering. A quiet release still
 *  installs, still takes over on the next start, and Settings' "Check for
 *  updates" still finds it and says so — the reader who goes looking is never
 *  told she is up to date when she is not. The only thing that changes is that
 *  Flyleaf stops interrupting to say so.
 *
 *  The owner's word on it, and the reason this is a switch rather than a
 *  deletion: "let this reflect silently without alerting the users … but don't
 *  disturb them this time with a refresh prompt." This time. */
const QUIET_RELEASE = true

/** The thing that actually gets a new build onto the reader's device.

    Registration is in prompt mode (see vite.config.ts), so a newer worker
    installs, waits, and announces itself here rather than swapping in silently.
    But it can only find out there is one to install after the
    browser re-fetches sw.js, and the browser does that on navigation. An
    installed PWA resumed from the home screen does not navigate: iOS suspends
    the app and hands it back on the same document it froze, so the check never
    runs and the copy on the phone can sit on a build from months ago having
    never once been told a newer one exists. Shipping a fix and watching a
    device stay broken is not a caching curiosity, it is the fix not being
    delivered.

    So we ask, rather than wait to be told: once at startup, every time the app
    comes back to the foreground — the moment that matters, because it is the
    one an installed PWA has instead of a page load — and on a slow interval
    for a copy left open all day. `update()` is a conditional request against
    sw.js; when nothing has shipped it is a 304, no worker installs, and the
    reader sees nothing at all.

    The notice below is the whole point of prompt mode: it is the only moment
    at which a reader learns that the thing they are looking at has changed,
    and the owner asked for it back in those words — "i always want that
    prompt". It briefly went away in favour of a silent autoUpdate, which
    answered a complaint she never made: the prompt was not unwanted, it was
    LATE.

    QUIET_RELEASE below is not a retreat from that. "Always" is about releases
    worth announcing, and it turns out not every release is one — a prompt for
    a change the reader cannot even see teaches her that the prompt is noise,
    which is how a genuinely important one comes to be ignored. The switch
    spends the interruption only when there is something to say. Default is
    still to say it.

    IT MUST BE MOUNTED ON EVERY SCREEN, and that is the actual fix rather than
    a tidy-up. The hook above registers the worker as a side effect of this
    component existing, so any screen that does not render it is a screen on
    which Flyleaf cannot notice a new build at all. It used to be rendered
    inside the notice dock's route check, which bailed on a book journey and on
    the journal — so a reader who spends her time reading was reloading a page
    with no update machinery running on it, over and over, and nothing was ever
    going to happen. See the note in App's Dock: this one notice renders
    unconditionally and the other three keep their route check. */
function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return

      // Only when the tab is actually in front. A background check costs a
      // request no one is waiting on, and on iOS a suspended app cannot
      // service one anyway.
      const check = () => {
        if (document.visibilityState === 'visible') void registration.update()
      }

      /* A QUIET RELEASE STILL HAS TO ARRIVE.

         Suppressing the notice on its own would not be silent, it would be
         stuck: in prompt mode a finished worker holds at `waiting` until
         something tells it to take over, and a plain reload does not reliably
         do that — the outgoing page is still a client for the moment the new
         one is registering. The reader would reload, see no change, and reload
         again, which is a worse interruption than the notice we removed.

         So on a quiet release the hand-over happens at STARTUP, before the
         reader has looked at anything: let the waiting worker in and reload
         once, immediately. Nothing is lost because nothing has been done yet,
         and the app the reader actually arrives at is the new one.

         Deliberately not mid-session. Taking over under a page that has been
         open for an hour would swap the files beneath it — a lazily-loaded
         screen tapped after that can 404 on a chunk the new build no longer
         has. Mid-session, a quiet release simply waits for the next start.

         The sessionStorage flag is the loop guard. If the hand-over does not
         actually stick — an old browser, a worker that goes redundant — this
         reloads exactly once and then leaves the reader alone rather than
         cycling her through a boot loop she cannot escape. */
      const QUIETLY_TOOK = 'flyleaf-quiet-update'
      if (QUIET_RELEASE && registration.waiting && !sessionStorage.getItem(QUIETLY_TOOK)) {
        sessionStorage.setItem(QUIETLY_TOOK, '1')
        navigator.serviceWorker.addEventListener('controllerchange', () =>
          window.location.reload(),
        )
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        return
      }

      check()
      window.setInterval(check, UPDATE_EVERY_MS)
      document.addEventListener('visibilitychange', check)
      // Neither listener is torn down on purpose: this component is mounted
      // once for the lifetime of the app, and registration happens once
      // inside it, so there is no second copy to leak.
    },
  })

  /* The hook stays mounted and keeps checking either way — it is what
     registers the worker at all, and Settings' recheck reads the registration
     it creates. Only the knock is withheld. */
  if (QUIET_RELEASE || !needRefresh) return null
  return (
    <div className={styles.toast} role="status">
      <GlassSurface>
        <div className={styles.body}>
          <p className={styles.message}>
            A new version of Flyleaf is ready. Refresh to use it — nothing you
            have written is affected.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.quiet}
              onClick={() => setNeedRefresh(false)}
            >
              Later
            </button>
            {/* AND IF NOTHING HAPPENS, RELOAD ANYWAY.

                `updateServiceWorker(true)` tells the waiting worker to take
                over and reloads when the browser says it has. That is two
                things that can silently not happen: the waiting worker may
                already be gone (the notice outlives it — dismiss nothing, leave
                the tab open an hour, and the button is now addressed to a
                worker that has been replaced), and `controllerchange` does not
                fire at all if this page was never under a controller, which is
                every hard-reloaded desktop tab. Either way the reader presses
                Refresh and the app just sits there — "i am even clicking on
                refresh on desktop and it's not responding or working".

                So the press promises a reload rather than a handover. The
                worker gets its moment; if the page is still here after it, we
                reload ourselves, which delivers the new build regardless. */}
            <LeafButton
              className={styles.compact}
              onClick={() => {
                void Promise.resolve(updateServiceWorker(true)).catch(() => {})
                window.setTimeout(() => window.location.reload(), 1500)
              }}
            >
              Refresh
            </LeafButton>
          </div>
        </div>
      </GlassSurface>
    </div>
  )
}

export default UpdateToast
