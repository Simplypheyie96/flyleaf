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
import App from './App.tsx'

applyTheme(getPref())

/* Not awaited: the shelf is a live query, so the books appear the moment they
   land rather than holding the first paint for a database write. Reported
   though — a seed that fails silently looks exactly like a seed that decided
   not to run, and the difference is worth a line in the console. */
/* TEMPORARY: seeding in production too, at the owner's call — she is testing
   the live link on her phone and wants the demo shelf there to look at. The
   seed only writes into empty tables, so it cannot double up. RE-GATE THIS to
   `import.meta.env.DEV` before the app is shared beyond her: a stranger's
   first shelf must be their own, and clearing the demo rows from live devices
   is already on the launch list. */
seedLibrary().catch((error) => {
  console.error('The preview shelf could not be laid down.', error)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
