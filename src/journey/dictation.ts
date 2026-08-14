/* Speaking instead of typing.

   This is not the voice memo. A memo is a recording the reader keeps — the
   sound is the thing. Dictation is a way of getting words into a text field
   with your hands full of book, and what it leaves behind is text: a quote
   read aloud off the page becomes a quote card, indistinguishable from one
   that was typed.

   It uses the browser's own speech recognition, which costs nothing and asks
   for no key. Where the browser has none — Firefox, and any WebView with the
   service stripped out — `supported` comes back false and the caller simply
   does not draw the button. Nothing degrades, because typing was always
   there. */

import { useCallback, useEffect, useRef, useState } from 'react'

/* The DOM lib has no types for this API, so here is the little of it we use.
   Deliberately minimal: anything more would be inventing a specification. */
interface SpeechResult {
  isFinal: boolean
  0: { transcript: string }
}

interface SpeechResultEvent {
  resultIndex: number
  results: { length: number; [index: number]: SpeechResult }
}

interface SpeechRecogniser {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((event: SpeechResultEvent) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
}

type SpeechCtor = new () => SpeechRecogniser

function ctor(): SpeechCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor
    webkitSpeechRecognition?: SpeechCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

/* The few failures worth a word. Silence after silence is normal — a reader
   who opened the mic and said nothing does not need to be told so — but a
   blocked microphone or an unreachable service looks identical to "it heard
   me and wrote nothing" unless the button says otherwise. */
function explain(error: string | undefined): string | undefined {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Mic blocked'
    case 'network':
      /* A "network" failure while the browser says it is online is not the
         reader's connection — it is a Chromium fork (Arc, Dia, Brave) that
         exposes the speech API without shipping the speech service behind
         it. Telling that reader to check their wifi sends them chasing a
         problem they do not have. */
      return navigator.onLine ? 'Not in this browser' : 'No connection'
    case 'audio-capture':
      return 'No microphone'
    default:
      return undefined
  }
}

export interface Dictation {
  supported: boolean
  listening: boolean
  /** A short reason the last session failed, for the button to show in place
      of "Dictate". Cleared the next time the reader toggles the mic. */
  snag: string | undefined
  toggle: () => void
  stop: () => void
}

/** Dictate into one field. `onWords` receives each finished phrase, already
    trimmed; the caller decides where in its own text to put it, because only
    the caller knows whether the field is empty or already half written. */
export function useDictation(onWords: (words: string) => void): Dictation {
  const [listening, setListening] = useState(false)
  const [snag, setSnag] = useState<string | undefined>(undefined)
  const engine = useRef<SpeechRecogniser | null>(null)

  /* The callback lives in a ref so a parent re-rendering on every keystroke —
     which is exactly what a controlled text field does — cannot tear down and
     restart the recogniser mid-sentence. */
  const sink = useRef(onWords)
  sink.current = onWords

  const supported = ctor() !== undefined

  const stop = useCallback(() => {
    engine.current?.stop()
    engine.current = null
    setListening(false)
  }, [])

  const toggle = useCallback(() => {
    setSnag(undefined)
    if (engine.current) {
      stop()
      return
    }
    const Recogniser = ctor()
    if (!Recogniser) return

    const it = new Recogniser()
    /* The page's language, not a hard-coded one: a reader keeping a Yorùbá
       novel should not have to dictate it in English. */
    it.lang = document.documentElement.lang || navigator.language
    it.continuous = true
    /* Interim results are requested but never shown. On paper only the final
       results matter; in practice iOS Safari — the platform most Flyleaf
       readers hold — often never marks anything final at all, so a session
       that ignores interim text listens attentively and writes nothing.
       Instead the freshest interim reading waits in `pending`, finals replace
       it as they arrive, and whatever is still pending when the session ends
       is written then. Chrome's flicker never reaches the field; Safari's
       words never get lost. */
    it.interimResults = true

    it.onresult = (event) => {
      let sessionTranscript = ''
      for (let i = 0; i < event.results.length; i += 1) {
        sessionTranscript += event.results[i][0].transcript + ' '
      }
      const words = sessionTranscript.trim()
      if (words) sink.current(words)
    }

    it.onerror = (event) => {
      if (engine.current !== it) return
      setSnag(explain(event?.error))
      stop()
    }

    it.onend = () => {
      if (engine.current !== it) return
      engine.current = null
      setListening(false)
    }

    engine.current = it
    it.start()
    setListening(true)
  }, [stop])

  /* A recogniser left running after its sheet closes keeps the microphone
     indicator lit, which reads as the app listening in on the reader. */
  useEffect(() => stop, [stop])

  return { supported, listening, snag, toggle, stop }
}
