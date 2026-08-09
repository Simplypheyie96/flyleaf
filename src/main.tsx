import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
/* Self-hosted so the archive still reads with no network, and so the share
   canvas can draw with them without tainting.

   THREE FAMILIES, AND EACH ONE HAS A JOB IT DOES NOT SHARE.

   A previous pass collapsed the whole app onto one face, because the pass
   before THAT had four fighting — a display serif, a text sans, a monospace
   for labels, a script for the name. One face fixed the noise and cost the
   app its voice: an archive of what somebody underlined in a novel was set
   entirely in interface type, and the reader's own sentences looked like
   settings rows.

   The fix is not a count, it is a rule — and the rule is about ROLE, not size:

   EB GARAMOND NAMES THINGS. Headings, and only headings: page titles, section
   labels, book titles, card titles, the reader's name. A book has a face and
   it is this one — old-style, modelled, a real drawn italic — so the things
   the app names come out looking like the spine of something rather than a
   field in a form.

   QUICKSAND SAYS THINGS. Everything that is read as words rather than scanned
   as a name: body copy, all the text inside a card, and every piece of
   interface furniture — labels, buttons, tabs, counts, dates, fields, chips,
   hints. Geometric, rounded, low-contrast, with an x-height tall enough to
   survive a 375px phone, which is exactly what a paragraph on a small screen
   needs and exactly what an old-style serif does not have.

   A serif set of headings over a rounded-sans body is a deliberate contrast
   pairing. The failure this replaced was the opposite instinct — serif for
   anything long, sans for anything small — which put an old-style face at 13px
   in card captions where it simply goes muddy.

   KALAM stays exactly where it was: what the reader writes into a note. A
   journal has a hand in it; that is the whole conceit of a flyleaf. A pen
   rather than a marker — even stroke, no bounce, legible down a paragraph —
   at 300 and 400 only, because a heavy hand becomes a novelty face. Notes
   only. Not the reader's name: an app printing a handle is not handwriting.

   Weight axes only, no optical-size cuts: those files are more than double the
   bytes and the tracking tokens do that job by hand at the two ends that need
   it. Quicksand ships no italic at all, which is fine — every italic in the
   app is editorial, so it was always Garamond's to draw. This app must open
   offline on a phone. */
import '@fontsource-variable/quicksand/wght.css'
import '@fontsource-variable/eb-garamond/wght.css'
import '@fontsource-variable/eb-garamond/wght-italic.css'
import '@fontsource/kalam/300.css'
import '@fontsource/kalam/400.css'
import './styles/tokens.css'
import './styles/motion.css'
import './index.css'
import { applyTheme, getPref } from './theme'
/* The demo shelf is gone. What remains is the sweep that takes it back off
   devices that were seeded before it went — see data/seed.ts. */
import { unseed } from './data/seed'
/* There was a one-time production wipe here (data/reset.ts). It has shipped and
   run, so it is gone: it decided whether to fire by reading a localStorage
   stamp, and Safari drops localStorage for an app left unopened for a week. On
   the day that stamp went missing from a real reader's phone, the wipe would
   have taken their whole journal with it. */
import { startAutoSync } from './data/sync'
import { watchIdle } from './data/lock'
import App from './App.tsx'
import Boundary from './components/Boundary'

applyTheme(getPref())

/* A journal that only asks for its code on a cold start is barely locked: a
   phone handed over mid-session is already open, and closing the app on a
   phone usually does not end the page. This re-shuts it when Flyleaf has been
   away for a couple of minutes. Registered at boot rather than from the lock
   screen, because the lock screen is not mounted while the app is unlocked and
   that is precisely when the app is being put down. Does nothing at all on a
   device with no code on it. */
watchIdle()

/* ASK THE BROWSER NOT TO THROW THE JOURNEY AWAY.
   Everything a reader writes lives in IndexedDB on their own device, and a
   browser is free to evict that under storage pressure — Safari also clears
   unpersisted storage after seven idle days. This asks for the durable kind.
   Best-effort by design: some browsers grant it silently, some grant it once
   the app is installed to the home screen, some refuse, and none of that is
   worth a word to the reader. Export in Settings is still the real backup. */
void navigator.storage?.persist?.().catch(() => {})

/* The props first, and BEFORE any sync can start — a device still carrying the
   old demo shelf must take it off, and leave the headstones that stop it
   arriving back down from Drive, before it pushes anything up. Not awaited by
   the render: the shelf is a live query and drops the rows as they go.

   Sync waits for it rather than starting beside it: a sync that began while the
   sweep was still running would export a half-emptied device and push THAT over
   the reader's Drive. Waiting costs a tick and removes the only way this app
   could destroy something. Nothing here runs for a reader who has not turned
   sync on — see data/sync.ts. */
unseed()
  .catch((error: unknown) => {
    console.error('The demo shelf could not be swept.', error)
  })
  .finally(() => {
    startAutoSync()
  })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Boundary>
      <App />
    </Boundary>
  </StrictMode>,
)
