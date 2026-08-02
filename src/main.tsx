import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
/* Self-hosted so the archive still reads with no network, and so the share
   canvas can draw with them without tainting.

   Instrument Serif is the book's voice: one weight, one italic, and about a
   quarter narrower than a text serif at the same size, which is what lets a
   long book title sit at a readable size instead of being shrunk to fit.
   Both faces are loaded — the italic carries every quote in the app, and
   without the real file the browser would slant the upright one. Instrument
   Sans is the app's own voice and shares the family's skeleton, which is why
   it can also set the small stamped labels — dates, page numbers, counts —
   that a monospace used to. Two families, three files, one skeleton.
   Patrick Hand is the reader's hand and is deliberately left alone. */
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/instrument-sans'
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
