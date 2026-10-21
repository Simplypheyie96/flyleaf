/* C · Write on the card.
   No form at all: the sheet holds the paper card this will become, and you
   write on it. The kinds are tabs along its top edge; where in the book is a
   row of stamps along the bottom, each one opening in place when tapped.
   Keeping it presses the card down. */

import { useEffect, useRef, useState } from 'react'
import PaperSurface from '../../components/PaperSurface'
import { KIND, KINDS } from '../../journey/kinds'
import {
  CloseIcon,
  LabSheet,
  MediaField,
  MicButton,
  NameField,
  Restored,
  RoomButton,
  StanceRow,
  Writing,
  formatDay,
  missing,
  useDrafts,
  useVoiceTyping,
  type Where,
} from './parts'
import type { KeepProps } from './KeepLab'
import { todayISO } from '../../components/date/dates'
import s from './keep.module.css'

const STAMPS: { key: keyof Where; label: string; show: (v: string) => string; numeric?: boolean }[] = [
  { key: 'page', label: 'Page', show: (v) => `p. ${v || '—'}`, numeric: true },
  { key: 'chapter', label: 'Chapter', show: (v) => (v ? (/^\d+$/.test(v) ? `Ch. ${v}` : v) : 'Ch. —') },
  { key: 'percent', label: 'Percent', show: (v) => `${v || '—'}%`, numeric: true },
  { key: 'keptOn', label: 'Kept on', show: (v) => (v === todayISO() ? 'Today' : formatDay(v)) },
]

export default function KeepC({ open, onClose, onKept, book }: KeepProps) {
  const field = useRef<HTMLTextAreaElement>(null)
  const { kind, setKind, draft, setDraft, restored, clear } = useDrafts(open)
  const [roomy, setRoomy] = useState(false)
  const [nudge, setNudge] = useState(false)
  const [stamp, setStamp] = useState<keyof Where | null>(null)
  const [pressing, setPressing] = useState(false)
  const setText = (text: string) => setDraft((d) => ({ ...d, text }))
  const voice = useVoiceTyping(field, draft.text, setText)
  const k = KIND[kind]
  const gap = missing(kind, draft)

  useEffect(() => {
    if (!open) {
      voice.stop()
      setRoomy(false)
      setNudge(false)
      setStamp(null)
      setPressing(false)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function pick(next: typeof kind) {
    voice.stop()
    setStamp(null)
    setKind(next)
    if (KIND[next].asks.text) requestAnimationFrame(() => field.current?.focus({ preventScroll: true }))
  }

  function keep() {
    if (gap) return setNudge(true)
    voice.stop()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setPressing(true)
    window.setTimeout(
      () => {
        onKept(kind, draft)
        clear()
        setPressing(false)
      },
      reduce ? 0 : 420,
    )
  }

  return (
    <LabSheet open={open} onClose={onClose} label={k.invite} roomy={roomy} focus={field}>
      <header className={s.head}>
        <p className={s.from}>
          Keeping from <em>{book}</em>
        </p>
        <button type="button" className={s.iconBtn} aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </button>
      </header>

      <div className={s.body}>
        {restored && !roomy && <Restored onClear={clear} />}
        {!roomy && (
          <div className={s.tabs} role="radiogroup" aria-label="What are you keeping?">
            {KINDS.map((t) => {
              const { Icon, label, hue } = KIND[t]
              const on = t === kind
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={label.replace(/s$/, '').replace('Vocabulary', 'Word')}
                  className={s.tab}
                  style={{ '--hue': `var(${hue})` } as React.CSSProperties}
                  onClick={() => pick(t)}
                >
                  <Icon size={16} />
                  {on && <span>{label.replace(/s$/, '').replace('Vocabulary', 'Word')}</span>}
                </button>
              )
            })}
          </div>
        )}

        <PaperSurface tone={k.tone} onGlass className={s.card} data-pressing={pressing ? "" : undefined}>
          <NameField
            kind={kind}
            draft={draft}
            patch={(p) => setDraft((d) => ({ ...d, ...p }))}
            className={s.cardName}
          />
          {!roomy && (
            <MediaField kind={kind} media={draft.media} onChange={(media) => setDraft((d) => ({ ...d, media }))} />
          )}
          {k.asks.text && (
            <Writing
              field={field}
              kind={kind}
              label={k.asks.text.label}
              placeholder={k.asks.text.placeholder}
              value={draft.text}
              onChange={voice.typed}
              className={s.cardText}
            />
          )}
          {!roomy && k.asks.stance && (
            <StanceRow value={draft.stance} onChange={(stance) => setDraft((d) => ({ ...d, stance }))} />
          )}
          {!roomy && (
            <div className={s.stamps} role="group" aria-label="Where in the book">
              {STAMPS.map(({ key, label, show, numeric }) =>
                stamp === key ? (
                  <input
                    key={key}
                    autoFocus
                    className={s.stampEdit}
                    aria-label={label}
                    type={key === 'keptOn' ? 'date' : 'text'}
                    max={key === 'keptOn' ? todayISO() : undefined}
                    inputMode={numeric ? 'numeric' : undefined}
                    value={draft.where[key]}
                    onChange={(event) =>
                      setDraft((d) => ({ ...d, where: { ...d.where, [key]: event.target.value } }))
                    }
                    onBlur={() => setStamp(null)}
                    onKeyDown={(event) => event.key === 'Enter' && setStamp(null)}
                  />
                ) : (
                  <button
                    key={key}
                    type="button"
                    className={s.stamp}
                    aria-label={`${label}: ${draft.where[key] || 'not set'}`}
                    data-set={draft.where[key] ? true : undefined}
                    onClick={() => setStamp(key)}
                  >
                    {show(draft.where[key])}
                  </button>
                ),
              )}
            </div>
          )}
        </PaperSurface>
        {voice.snag && <p className={s.snag}>{voice.snag}</p>}
      </div>

      {gap && nudge && (
        <p className={s.hint} role="status">
          {gap}
        </p>
      )}
      <footer className={s.foot}>
        {k.asks.text && <MicButton voice={voice} />}
        {k.asks.text && <RoomButton roomy={roomy} onToggle={() => setRoomy((r) => !r)} />}
        <button type="button" className={s.keep} aria-disabled={Boolean(gap)} onClick={keep}>
          Keep it
        </button>
      </footer>
    </LabSheet>
  )
}
