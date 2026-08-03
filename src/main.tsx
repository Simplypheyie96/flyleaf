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

   Patrick Hand is the reader's hand and is deliberately left alone. */
import '@fontsource-variable/eb-garamond'
import '@fontsource-variable/source-sans-3'
import '@fontsource/patrick-hand'
import './styles/tokens.css'
import './styles/motion.css'
import './index.css'
import { applyTheme, getPref } from './theme'
/* TEMPORARY — delete this import, the call below, and src/data/seed.ts when
   previews no longer need a shelf to look at. */
import { seedLibrary } from './data/seed'
import App from './App.tsx'

applyTheme(getPref())

/* Not awaited: the shelf is a live query, so the books appear the moment they
   land rather than holding the first paint for a database write. Reported
   though — a seed that fails silently looks exactly like a seed that decided
   not to run, and the difference is worth a line in the console. */
seedLibrary().catch((error) => {
  console.error('The preview shelf could not be laid down.', error)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
