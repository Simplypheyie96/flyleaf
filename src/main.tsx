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
import './index.css'
import { applyTheme, getPref } from './theme'
import App from './App.tsx'

applyTheme(getPref())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
