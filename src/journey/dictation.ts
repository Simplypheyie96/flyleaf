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
  onerror: (() => void) | null
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

export interface Dictation {
  supported: boolean
  listening: boolean
  toggle: () => void
  stop: () => void
}

/** Dictate into one field. `onWords` receives each finished phrase, already
    trimmed; the caller decides where in its own text to put it, because only
    the caller knows whether the field is empty or already half written. */
export function useDictation(onWords: (words: string) => void): Dictation {
  const [listening, setListening] = useState(false)
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
    /* Finished phrases only. Interim results flicker half-heard words into the
       field and then correct them, which is unpleasant to watch and worse to
       edit around. */
    it.interimResults = false

    it.onresult = (event) => {
      let said = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        if (result.isFinal) said += result[0].transcript
      }
      const words = said.trim()
      if (words) sink.current(words)
    }
    /* Any failure — no permission, no network, no service — ends the session
       quietly. The button goes back to its resting state, which is the honest
       report: it is not listening. */
    it.onerror = () => stop()
    it.onend = () => {
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

  return { supported, listening, toggle, stop }
}
