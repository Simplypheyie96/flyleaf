import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
/* Self-hosted so the archive still reads with no network. Instrument Serif
   ships one weight and one italic — that is the whole family, so nothing here
   may ask it for a bold. */
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
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
