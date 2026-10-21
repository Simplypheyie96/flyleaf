/* /lab/keep — the pieces all three keep directions share.

   Everything here is the FIX, not the direction: whichever of A, B or C wins,
   these are what it is built on.

   - One sheet, one keyboard system. The dialog is sized to the visual
     viewport and nothing else moves: no field-into-view scroller, no polling.
     iOS scrolls to the caret inside the body on its own.
   - A writing field that grows with its words (CSS mirror, no measuring, so
     no scroll jump), inside the one scroller the sheet has.
   - More room is the same field in the same sheet, with the chrome put away —
     not a second dialog, so the caret and the keyboard never move.
   - Dictation the way the iOS keyboard does it: words land at the caret,
     replace a selection, appear while you are still speaking, and typing
     alongside it never loses either.
   - One draft per kind, media included.

   Nothing in this folder is imported by production code. */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import type { EntryType, Stance } from '../../data/db'
import { KIND, STANCE, STANCES } from '../../journey/kinds'
import { todayISO } from '../../components/date/dates'
import { CycleIcon } from '../../components/TabIcons'
import { Avatar } from '../../journey/avatars'
import { lookUp, remembered, unreachable, type Sense } from '../../journey/dictionary'
import Recorder from '../../journey/Recorder'
import prod from '../../journey/sheet.module.css'
import s from './keep.module.css'

/* ---------------------------------------------------------------- sheet --- */

export function LabSheet({
  open,
  onClose,
  label,
  roomy = false,
  focus,
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  /** More room: the panel takes the whole visible height. */
  roomy?: boolean
  /** Focused in the same task as the tap that opened the sheet, so iOS
      raises the keyboard. */
  focus?: RefObject<HTMLElement | null>
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const downOnBackdrop = useRef(false)

  useLayoutEffect(() => {
    const el = dialog.current
    if (!el) return
    if (open && !el.open) {
      el.showModal()
      focus?.current?.focus({ preventScroll: true })
    }
    if (!open && el.open) el.close()
  }, [open, focus])

  /* The single keyboard system: size the dialog to what is visible. */
  useEffect(() => {
    const vv = window.visualViewport
    const el = dialog.current
    if (!open || !vv || !el) return
    const fit = () => {
      el.style.setProperty('--vv-h', `${vv.height}px`)
      el.style.setProperty('--vv-top', `${vv.offsetTop}px`)
    }
    fit()
    vv.addEventListener('resize', fit)
    vv.addEventListener('scroll', fit)
    return () => {
      vv.removeEventListener('resize', fit)
      vv.removeEventListener('scroll', fit)
    }
  }, [open])

  /* Drag the handle down to put it away. Only the handle, so it never fights
     scrolling the body. */
  const drag = useRef<{ y: number; t: number } | null>(null)
  function onGrab(event: React.PointerEvent) {
    drag.current = { y: event.clientY, t: event.timeStamp }
    ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
  }
  function onMove(event: React.PointerEvent) {
    if (!drag.current || !panel.current) return
    const dy = Math.max(0, event.clientY - drag.current.y)
    panel.current.style.transform = `translateY(${dy}px)`
  }
  function onRelease(event: React.PointerEvent) {
    if (!drag.current || !panel.current) return
    const dy = event.clientY - drag.current.y
    const speed = dy / Math.max(1, event.timeStamp - drag.current.t)
    drag.current = null
    panel.current.style.transform = ''
    if (dy > 120 || speed > 0.6) onClose()
  }

  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onPointerDown={(event) => {
        downOnBackdrop.current = event.target === dialog.current
      }}
      onClick={(event) => {
        if (downOnBackdrop.current && event.target === dialog.current) onClose()
      }}
    >
      <div ref={panel} className={s.panel} data-roomy={roomy || undefined}>
        <div
          className={s.grab}
          onPointerDown={onGrab}
          onPointerMove={onMove}
          onPointerUp={onRelease}
          onPointerCancel={onRelease}
          aria-hidden="true"
        >
          <span />
        </div>
        {children}
      </div>
    </dialog>
  )
}

/* ---------------------------------------------------------- the writing --- */

/** A textarea that is exactly as tall as its words. The mirror carries the
    height; the textarea is laid over it. Nothing is measured. */
export function Writing({
  value,
  onChange,
  field,
  placeholder,
  kind,
  label,
  className,
  onSelect,
}: {
  value: string
  onChange: (next: string) => void
  field: RefObject<HTMLTextAreaElement | null>
  placeholder: string
  kind: EntryType
  label: string
  className?: string
  onSelect?: () => void
}) {
  return (
    <div className={`${s.grow} ${className ?? ''}`} data-kind={kind} data-value={`${value} `}>
      <textarea
        ref={field}
        aria-label={label}
        value={value}
        placeholder={placeholder}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        onSelect={onSelect}
      />
    </div>
  )
}

/* ------------------------------------------------------------ dictation --- */

interface Recogniser {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  abort(): void
  stop(): void
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
}

function engine(): (new () => Recogniser) | undefined {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => Recogniser) | undefined
}

/** Joins spoken words onto what is already written the way a keyboard does:
    a space when it needs one, a capital at the start of a sentence. */
function joined(before: string, spoken: string) {
  const words = spoken.trim()
  if (!words) return ''
  const sentence = before.trim() === '' || /[.!?]\s*$/.test(before)
  const first = sentence ? words[0].toUpperCase() + words.slice(1) : words
  return (before === '' || /\s$/.test(before) ? '' : ' ') + first
}

export function useVoiceTyping(
  field: RefObject<HTMLTextAreaElement | null>,
  value: string,
  setValue: (next: string) => void,
) {
  const Engine = engine()
  const [listening, setListening] = useState(false)
  const [snag, setSnag] = useState<string>()
  const rec = useRef<Recogniser | null>(null)
  const wanted = useRef(false)
  const anchor = useRef({ before: '', after: '' })
  const latest = useRef(value)
  latest.current = value

  const begin = useCallback(
    (text: string, start: number, end: number) => {
      if (!Engine) return
      rec.current?.abort()
      anchor.current = { before: text.slice(0, start), after: text.slice(end) }
      const it = new Engine()
      it.lang = document.documentElement.lang || navigator.language
      it.continuous = true
      it.interimResults = true
      it.onresult = (event) => {
        let spoken = ''
        for (let i = 0; i < event.results.length; i += 1) spoken += event.results[i][0].transcript
        const { before, after } = anchor.current
        const words = joined(before, spoken)
        setValue(before + words + after)
        const caret = before.length + words.length
        requestAnimationFrame(() => field.current?.setSelectionRange(caret, caret))
      }
      it.onerror = (event) => {
        if (event.error === 'aborted' || event.error === 'no-speech') return
        wanted.current = false
        setSnag(
          event.error === 'not-allowed'
            ? 'The microphone is blocked for Flyleaf.'
            : 'Dictation stopped. Tap the mic to carry on.',
        )
      }
      it.onend = () => {
        if (rec.current === it) {
          rec.current = null
          setListening(false)
          wanted.current = false
        }
      }
      rec.current = it
      it.start()
      setListening(true)
    },
    [Engine, field, setValue],
  )

  const start = useCallback(() => {
    const el = field.current
    const text = latest.current
    setSnag(undefined)
    wanted.current = true
    begin(text, el?.selectionStart ?? text.length, el?.selectionEnd ?? text.length)
    el?.focus({ preventScroll: true })
  }, [begin, field])

  const stop = useCallback(() => {
    wanted.current = false
    const it = rec.current
    rec.current = null
    it?.stop()
    setListening(false)
  }, [])

  /** Typing while listening: keep everything on the page and carry on
      listening from wherever the caret is now. */
  const typed = useCallback(
    (next: string) => {
      setValue(next)
      if (!wanted.current) return
      requestAnimationFrame(() => {
        const el = field.current
        const at = el?.selectionStart ?? next.length
        begin(next, at, el?.selectionEnd ?? at)
      })
    },
    [begin, field, setValue],
  )

  useEffect(() => () => rec.current?.abort(), [])

  return { supported: Boolean(Engine), listening, snag, start, stop, typed }
}

export function MicButton({ voice }: { voice: ReturnType<typeof useVoiceTyping> }) {
  if (!voice.supported) return null
  return (
    <button
      type="button"
      className={s.tool}
      data-on={voice.listening || undefined}
      aria-pressed={voice.listening}
      onPointerDown={(event) => event.preventDefault()}
      onClick={voice.listening ? voice.stop : voice.start}
    >
      <MicIcon />
      <span>{voice.listening ? 'Listening' : 'Dictate'}</span>
    </button>
  )
}

export function RoomButton({ roomy, onToggle }: { roomy: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={s.tool}
      aria-pressed={roomy}
      onPointerDown={(event) => event.preventDefault()}
      onClick={onToggle}
    >
      {roomy ? <ShrinkIcon /> : <ExpandIcon />}
      <span>{roomy ? 'Less room' : 'More room'}</span>
    </button>
  )
}

/* --------------------------------------------------------------- drafts --- */

export interface Where {
  page: string
  chapter: string
  percent: string
  keptOn: string
}

export interface Draft {
  text: string
  name: string
  stance?: Stance
  media?: { url: string; label: string; blob?: Blob; duration?: number }
  /** Which of the twelve faces a character's name draws; 0 is its own. */
  face?: number
  phonetic?: string
  pos?: string
  where: Where
}

export const blank = (): Draft => ({
  text: '',
  name: '',
  where: { page: '', chapter: '', percent: '', keptOn: todayISO() },
})

/* One per kind, for the life of the tab. Production keeps these in
   localStorage per book per kind; the lab only has to show the behaviour. */
const drafts = new Map<EntryType, Draft>()
let lastKind: EntryType = 'note'

export function useDrafts(open: boolean) {
  const [kind, setKindState] = useState<EntryType>(lastKind)
  const [draft, setDraftState] = useState<Draft>(() => drafts.get(lastKind) ?? blank())
  /* Said once, when an earlier draft is brought back — not while typing. */
  const [restored, setRestored] = useState(false)

  const load = useCallback((k: EntryType) => {
    const found = drafts.get(k)
    setDraftState(found ?? blank())
    setRestored(Boolean(found) && !isEmpty(found!))
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    setKindState(lastKind)
    load(lastKind)
  }, [open, load])

  const setDraft = useCallback(
    (update: (d: Draft) => Draft) =>
      setDraftState((d) => {
        const next = update(d)
        drafts.set(kind, next)
        return next
      }),
    [kind],
  )

  const setKind = useCallback(
    (next: EntryType) => {
      lastKind = next
      setKindState(next)
      load(next)
    },
    [load],
  )

  const clear = useCallback(() => {
    drafts.delete(kind)
    setDraftState(blank())
    setRestored(false)
  }, [kind])

  return { kind, setKind, draft, setDraft, restored, clear }
}

export function isEmpty(d: Draft) {
  return !d.text.trim() && !d.name.trim() && !d.media
}

/** What has to be there before Keep it works, per kind. */
export function missing(kind: EntryType, d: Draft): string | undefined {
  const asks = KIND[kind].asks
  if (asks.media === 'image' && !d.media) return 'Add a picture to keep'
  if (asks.media === 'audio' && !d.media) return 'Record something to keep'
  if (asks.name && !d.name.trim()) return `Give it ${asks.name.label.toLowerCase()}`
  if (asks.text && !asks.name && asks.media === 'none' && !d.text.trim()) return 'Write something to keep'
  return undefined
}

export function whereLine(w: Where) {
  const bits = [
    w.page && `p. ${w.page}`,
    w.chapter && (/^\d+$/.test(w.chapter) ? `Ch. ${w.chapter}` : w.chapter),
    w.percent && `${w.percent}%`,
    w.keptOn === todayISO() ? 'Today' : formatDay(w.keptOn),
  ].filter(Boolean)
  return bits.join(' · ')
}

export function formatDay(iso: string) {
  if (!iso) return ''
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/* ----------------------------------------------------- shared form bits --- */

/* The faces offered when a reader goes looking for a different one, as in
   production: zero is the face the name draws by itself. */
const FACES = Array.from({ length: 12 }, (_, n) => n)

/** The name line. A character's name draws its face beside the field, with
    Another face opening the twelve to pick from; a word gets Look it up. Both
    are production's own pieces, imported rather than redrawn. */
export function NameField({
  kind,
  draft,
  patch,
  className,
}: {
  kind: EntryType
  draft: Draft
  patch: (p: Partial<Draft>) => void
  className?: string
}) {
  const asks = KIND[kind].asks.name
  const [facing, setFacing] = useState(false)
  const [looking, setLooking] = useState(false)
  const [snag, setSnag] = useState('')
  if (!asks) return null
  const name = draft.name
  const character = kind === 'character' && name.trim()

  function fill(sense: Sense | undefined) {
    if (!sense) return setSnag('No dictionary here has this word. Write the meaning in your own words.')
    patch({ text: sense.meaning, phonetic: sense.phonetic, pos: sense.pos })
    if (sense.from) setSnag(`Found under “${sense.from}”. Edit if that isn’t the sense you meant.`)
  }
  async function lookItUp() {
    const word = name.trim()
    if (!word || looking) return
    setSnag('')
    const here = remembered(word)
    if (here) return fill(here.sense)
    setLooking(true)
    try {
      fill(await lookUp(word))
    } catch (err) {
      setSnag(
        unreachable(err)
          ? 'No dictionary answered. You may be offline. Try again in a moment, or write the meaning yourself.'
          : 'The look-up went wrong. Try again, or write the meaning yourself.',
      )
    } finally {
      setLooking(false)
    }
  }

  return (
    <div className={s.nameBlock}>
      <span className={prod.nameRow}>
        <input
          className={`${s.name} ${className ?? ''}`}
          aria-label={asks.label}
          placeholder={asks.placeholder}
          value={name}
          maxLength={60}
          enterKeyHint="next"
          onChange={(event) => {
            const next = event.target.value
            /* A retyped headword keeps nothing of the old one's look-up. */
            patch(kind === 'vocabulary' ? { name: next, phonetic: undefined, pos: undefined } : { name: next })
            if (kind === 'vocabulary') setSnag('')
          }}
        />
        {character && (
          <span className={prod.facePlate}>
            <Avatar name={name} note={draft.text} face={draft.face ?? 0} />
          </span>
        )}
      </span>
      {character && (
        <button type="button" className={prod.faceSwap} aria-expanded={facing} onClick={() => setFacing(!facing)}>
          <CycleIcon size={15} />
          {facing ? 'Done' : 'Another face'}
        </button>
      )}
      {character && facing && (
        <span className={prod.faceRow} role="group" aria-label="Pick a face">
          {FACES.map((n) => (
            <button
              key={n}
              type="button"
              className={prod.facePick}
              aria-label={n ? `Face ${n + 1}` : 'The face this name draws'}
              aria-pressed={n === (draft.face ?? 0)}
              onClick={() => patch({ face: n })}
            >
              <Avatar name={name} note={draft.text} face={n} />
            </button>
          ))}
        </span>
      )}
      {kind === 'vocabulary' && (draft.phonetic || draft.pos) && (
        <span className={prod.saying}>
          {draft.phonetic && <span className={prod.said}>{draft.phonetic}</span>}
          {draft.pos && <span className={prod.part}>{draft.pos}</span>}
        </span>
      )}
      {kind === 'vocabulary' && name.trim() && (
        <button type="button" className={prod.lookUp} disabled={looking} onClick={lookItUp}>
          {looking ? 'Looking…' : 'Look it up'}
        </button>
      )}
      {snag && <p className={s.snag}>{snag}</p>}
    </div>
  )
}

export function StanceRow({ value, onChange }: { value?: Stance; onChange: (v: Stance) => void }) {
  return (
    <div className={s.stance} role="radiogroup" aria-label="How sure are you?">
      {STANCES.map((st) => (
        <button
          key={st}
          type="button"
          role="radio"
          aria-checked={value === st}
          className={s.chip}
          onClick={() => onChange(st)}
        >
          {STANCE[st].label}
        </button>
      ))}
    </div>
  )
}

/** Picture or voice. The voice recorder is production's own Recorder, orb
    and trace included; the picture stays on this device. */
export function MediaField({
  kind,
  media,
  onChange,
}: {
  kind: EntryType
  media?: Draft['media']
  onChange: (m: Draft['media']) => void
}) {
  const asks = KIND[kind].asks.media

  if (asks === 'audio')
    return (
      <Recorder
        media={media?.blob}
        duration={media?.duration}
        seed={1}
        onCapture={(blob, secs) =>
          onChange({ url: URL.createObjectURL(blob), label: 'Voice memo', blob, duration: secs })
        }
      />
    )

  if (asks === 'image' || asks === 'optional-image') {
    return (
      <div className={s.media}>
        {media ? (
          <>
            <img className={s.photo} src={media.url} alt="" />
            <button type="button" className={s.link} onClick={() => onChange(undefined)}>
              Remove picture
            </button>
          </>
        ) : (
          <label className={s.pick}>
            <ImageAddIcon />
            <span>{asks === 'image' ? 'Choose a picture' : 'Add a picture (optional)'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onChange({ url: URL.createObjectURL(file), label: file.name })
              }}
            />
          </label>
        )}
      </div>
    )
  }
  return null
}

/** Page, chapter, percent, day — the same four in every direction. */
export function WhereFields({ where, onChange }: { where: Where; onChange: (w: Where) => void }) {
  const set = (key: keyof Where) => (event: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...where, [key]: event.target.value })
  return (
    <div className={s.whereGrid}>
      <label>
        <span>Page</span>
        <input inputMode="numeric" pattern="[0-9]*" value={where.page} onChange={set('page')} placeholder="—" />
      </label>
      <label>
        <span>Chapter</span>
        <input value={where.chapter} onChange={set('chapter')} placeholder="—" />
      </label>
      <label>
        <span>%</span>
        <input inputMode="numeric" pattern="[0-9]*" value={where.percent} onChange={set('percent')} placeholder="—" />
      </label>
      <label className={s.whereDay}>
        <span>Kept on</span>
        <input type="date" max={todayISO()} value={where.keptOn} onChange={set('keptOn')} />
      </label>
    </div>
  )
}

export function Restored({ onClear }: { onClear: () => void }) {
  return (
    <p className={s.restored}>
      Your draft from earlier.{' '}
      <button type="button" className={s.link} onClick={onClear}>
        Start over
      </button>
    </p>
  )
}

/* ---------------------------------------------------------------- icons --- */
/* Remix Icon, line set, normalised to 1em and currentColor. */

const svg = { width: '1em', height: '1em', viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true } as const

export const MicIcon = () => (
  <svg {...svg}>
    <path d="M11.9998 3C10.3429 3 8.99976 4.34315 8.99976 6V10C8.99976 11.6569 10.3429 13 11.9998 13C13.6566 13 14.9998 11.6569 14.9998 10V6C14.9998 4.34315 13.6566 3 11.9998 3ZM11.9998 1C14.7612 1 16.9998 3.23858 16.9998 6V10C16.9998 12.7614 14.7612 15 11.9998 15C9.23833 15 6.99976 12.7614 6.99976 10V6C6.99976 3.23858 9.23833 1 11.9998 1ZM3.05469 11H5.07065C5.55588 14.3923 8.47329 17 11.9998 17C15.5262 17 18.4436 14.3923 18.9289 11H20.9448C20.4837 15.1716 17.1714 18.4839 12.9998 18.9451V23H10.9998V18.9451C6.82814 18.4839 3.51584 15.1716 3.05469 11Z" />
  </svg>
)
export const ExpandIcon = () => (
  <svg {...svg}>
    <path d="M20 3H22V9H20V5H16V3H20ZM4 3H8V5H4V9H2V3H4ZM20 19V15H22V21H16V19H20ZM4 19H8V21H2V15H4V19Z" />
  </svg>
)
export const ShrinkIcon = () => (
  <svg {...svg}>
    <path d="M18 7H22V9H16V3H18V7ZM8 9H2V7H6V3H8V9ZM18 17V21H16V15H22V17H18ZM8 15V21H6V17H2V15H8Z" />
  </svg>
)
export const CloseIcon = () => (
  <svg {...svg}>
    <path d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z" />
  </svg>
)
export const BackIcon = () => (
  <svg {...svg}>
    <path d="M7.82843 10.9999H20V12.9999H7.82843L13.1924 18.3638L11.7782 19.778L4 11.9999L11.7782 4.22168L13.1924 5.63589L7.82843 10.9999Z" />
  </svg>
)
export const ImageAddIcon = () => (
  <svg {...svg}>
    <path d="M21 15V18H24V20H21V23H19V20H16V18H19V15H21ZM21.0082 3C21.556 3 22 3.44495 22 3.9934V13H20V5H4V18.999L14 9L17 12V14.829L14 11.8284L6.827 19H14V21H2.9918C2.44405 21 2 20.5551 2 20.0066V3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082ZM8 7C9.10457 7 10 7.89543 10 9C10 10.1046 9.10457 11 8 11C6.89543 11 6 10.1046 6 9C6 7.89543 6.89543 7 8 7Z" />
  </svg>
)
export const ArrowDownIcon = () => (
  <svg {...svg}>
    <path d="M11.9999 13.1714L16.9497 8.22168L18.3639 9.63589L11.9999 15.9999L5.63599 9.63589L7.0502 8.22168L11.9999 13.1714Z" />
  </svg>
)
export const SearchIcon = () => (
  <svg {...svg}>
    <path d="M18.031 16.6168L22.3137 20.8995L20.8995 22.3137L16.6168 18.031C15.0769 19.263 13.124 20 11 20C6.032 20 2 15.968 2 11C2 6.032 6.032 2 11 2C15.968 2 20 6.032 20 11C20 13.124 19.263 15.0769 18.031 16.6168ZM16.0247 15.8748C17.2475 14.6146 18 12.8956 18 11C18 7.1325 14.8675 4 11 4C7.1325 4 4 7.1325 4 11C4 14.8675 7.1325 18 11 18C12.8956 18 14.6146 17.2475 15.8748 16.0247L16.0247 15.8748Z" />
  </svg>
)
