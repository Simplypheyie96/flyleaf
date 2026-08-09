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
/* TEMPORARY — delete this import, the call below, and src/data/seed.ts when
   previews no longer need a shelf to look at. Development only: five invented
   books arriving in a real reader's library on the day they install the app is
   not a demo, it is somebody else's shelf in their house. */
import { seedLibrary } from './data/seed'
/* TEMPORARY the other way round, and destructive: this clears the live app
   once, so the first test users open it the way a stranger will. Unlike the
   seed it is not compiled out of production — production is the only place it
   has any work to do. See src/data/reset.ts for when it must be deleted. */
import { clearEverything } from './data/reset'
import { startAutoSync } from './data/sync'
import App from './App.tsx'
import Boundary from './components/Boundary'

applyTheme(getPref())

/* ASK THE BROWSER NOT TO THROW THE JOURNEY AWAY.
   Everything a reader writes lives in IndexedDB on their own device, and a
   browser is free to evict that under storage pressure — Safari also clears
   unpersisted storage after seven idle days. This asks for the durable kind.
   Best-effort by design: some browsers grant it silently, some grant it once
   the app is installed to the home screen, some refuse, and none of that is
   worth a word to the reader. Export in Settings is still the real backup. */
void navigator.storage?.persist?.().catch(() => {})

/* Not awaited: the shelf is a live query, so the books appear the moment they
   land rather than holding the first paint for a database write. Reported
   though — a seed that fails silently looks exactly like a seed that decided
   not to run, and the difference is worth a line in the console. */
/* Dev and preview builds only now — the production build compiles the seed
   away, so a test user's first shelf is their own. */
seedLibrary().catch((error) => {
  console.error('The preview shelf could not be laid down.', error)
})

/* And the other direction, in production only and exactly once: whatever a
   device is carrying from the demo shelf or from testing goes, so the first
   readers start on their own empty page. Not awaited, for the same reason the
   seed is not — the shelf is a live query and drops the rows as they go. */
/* Chained onto the sweep rather than fired beside it, and this is the whole
   reason it is not one more line further up: a sync that started while the
   one-time clear was still running would export a half-emptied device and push
   THAT over the reader's Drive. Waiting costs a tick and removes the only way
   this app could destroy something. Nothing here runs for a reader who has not
   turned sync on — see data/sync.ts. */
clearEverything()
  .catch((error) => {
    console.error('The slate could not be cleared.', error)
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
