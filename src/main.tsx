import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/playfair-display'
import '@fontsource-variable/playfair-display/wght-italic.css'
import '@fontsource-variable/karla'
import '@fontsource/courier-prime'
import '@fontsource/architects-daughter'
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
