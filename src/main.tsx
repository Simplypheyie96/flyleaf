import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
/* Self-hosted so the archive still reads with no network, and so the share
   canvas can draw with them without tainting.

   Both text faces were replaced because the pair before them ran tall and
   narrow. Instrument Serif and Instrument Sans share a skeleton with long
   stems, tight sidebearings and a high x-height, and a screen of it reads as
   a picket fence: every line is dense, nothing has air in it, and the eye has
   to work at a page it is supposed to linger over.

   EB Garamond is the book's voice now. It is an old-style face with wide
   round bowls, short stems and a small x-height, so the same sentence takes
   more width and less height and reads slower in the way a book reads slower.
   Source Sans 3 is the app's own voice: a humanist sans with open apertures
   and generous counters, which is what makes an 11px capital label legible
   without shouting. Both are variable, so weight is now an axis on both
   voices rather than only on the sans.

   Instrument Serif comes back, but only for the slope. EB Garamond ships no
   italic in the variable file we load, so every italic line in the app was a
   fake one — the browser shearing the roman over and calling it done, which
   costs the italic its own letterforms (the single-storey a, the entry
   strokes, the narrower set) and leaves a slanted book face instead of a
   cursive one. Instrument's italic is drawn rather than sheared, and its
   higher contrast and tighter fit are exactly what an aside wants: the
   sentence changes voice instead of changing angle. One weight and one style
   is all that is pulled in — the italic cut and nothing else — because
   Instrument is not the book's voice any more and must not be able to become
   it again by accident.

   Patrick Hand is the reader's hand and is deliberately left alone. */
import '@fontsource-variable/eb-garamond'
import '@fontsource-variable/source-sans-3'
import '@fontsource/instrument-serif/400-italic.css'
/* The roman cut, for the one upright thing set in this face: the stance on a
   plot thread's tab. See --font-stamp. */
import '@fontsource/instrument-serif/400.css'
import '@fontsource/patrick-hand'
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
if (import.meta.env.DEV) {
  seedLibrary().catch((error) => {
    console.error('The preview shelf could not be laid down.', error)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
