import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
/* Self-hosted so the archive still reads with no network, and so the share
   canvas can draw with them without tainting.

   Both text faces were replaced because the pair before them ran tall and
   narrow. Instrument Serif and Instrument Sans share a skeleton with long
   stems, tight sidebearings and a high x-height, and a screen of it reads as
   a picket fence: every line is dense, nothing has air in it, and the eye has
   to work at a page it is supposed to linger over.

   Newsreader is the book's voice, roman and italic, and it is the only serif
   here now. There were three: EB Garamond for the book, and Instrument Serif
   twice — once for every italic in the app and once for the one upright
   stamped word — because Garamond's variable file ships no italic and the
   browser was shearing the roman over to fake it. A sheared roman is not an
   italic: it loses the single-storey a, the entry strokes, the narrower set,
   everything that makes a slope read as a change of voice rather than a
   change of angle. Instrument was brought in to fix that and did, at the
   price of a masthead and its own subtitle being set in two different
   typefaces on the same card.

   Newsreader ends both problems with one family. Its italic is drawn. Its
   x-height is large enough that titles hold their colour at 460 instead of
   the 500 Garamond needed to stop looking a size down. And it was made for
   reading on a screen, which is the whole job.

   Source Sans 3 is the app's own voice and is unchanged: a humanist sans with
   open apertures and generous counters, which is what makes an 11px capital
   label legible without shouting. Patrick Hand is the reader's hand and is
   likewise left alone.

   Both serif cuts are the weight-axis files rather than the optical-size
   ones. Optical sizing is real and this app spans 11px to 34px, but the opsz
   cut is 276KB of latin against 124KB, and 150KB on first paint is a poor
   trade for a phone-first app that must open offline. The tracking tokens do
   that job by hand at the two ends that need it. */
import '@fontsource-variable/newsreader/wght.css'
import '@fontsource-variable/newsreader/wght-italic.css'
import '@fontsource-variable/source-sans-3'
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
