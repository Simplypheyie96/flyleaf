/* A · Write first.
   The sheet opens on a page with the caret already in it. What kind of thing
   this is sits above as one row of chips you can ignore; where it is in the
   book folds into one line under the words. */

import { useEffect, useRef, useState } from 'react'
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
  WhereFields,
  Writing,
  missing,
  useDrafts,
  useVoiceTyping,
  whereLine,
} from './parts'
import type { KeepProps } from './KeepLab'
import s from './keep.module.css'

export default function KeepA({ open, onClose, onKept, book }: KeepProps) {
  const field = useRef<HTMLTextAreaElement>(null)
  const { kind, setKind, draft, setDraft, restored, clear } = useDrafts(open)
  const [roomy, setRoomy] = useState(false)
  const [whereOpen, setWhereOpen] = useState(false)
  /* The missing thing is said only when Keep it is tapped, never up front. */
  const [nudge, setNudge] = useState(false)
  const setText = (text: string) => setDraft((d) => ({ ...d, text }))
  const voice = useVoiceTyping(field, draft.text, setText)
  const k = KIND[kind]
  const gap = missing(kind, draft)

  useEffect(() => {
    if (!open) {
      voice.stop()
      setRoomy(false)
      setWhereOpen(false)
      setNudge(false)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function pick(next: typeof kind) {
    voice.stop()
    setKind(next)
    if (KIND[next].asks.text) requestAnimationFrame(() => field.current?.focus({ preventScroll: true }))
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

      {!roomy && (
        <div className={s.chips} role="radiogroup" aria-label="What are you keeping?">
          {KINDS.map((t) => {
            const { Icon, label, hue } = KIND[t]
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={t === kind}
                className={s.kindChip}
                style={{ '--hue': `var(${hue})` } as React.CSSProperties}
                onClick={() => pick(t)}
              >
                <Icon size={16} />
                {label.replace(/s$/, '').replace('Vocabulary', 'Word')}
              </button>
            )
          })}
        </div>
      )}

      <div className={s.body}>
        {restored && !roomy && <Restored onClear={clear} />}
        {!roomy && <NameField kind={kind} draft={draft} patch={(p) => setDraft((d) => ({ ...d, ...p }))} />}
        {!roomy && <MediaField kind={kind} media={draft.media} onChange={(media) => setDraft((d) => ({ ...d, media }))} />}
        {k.asks.text && (
          <Writing
            field={field}
            kind={kind}
            label={k.asks.text.label}
            placeholder={k.asks.text.placeholder}
            value={draft.text}
            onChange={voice.typed}
            className={s.page}
          />
        )}
        {!roomy && k.asks.stance && (
          <StanceRow value={draft.stance} onChange={(stance) => setDraft((d) => ({ ...d, stance }))} />
        )}
        {!roomy && (
          <div className={s.whereFold}>
            <button
              type="button"
              className={s.whereLine}
              aria-expanded={whereOpen}
              onClick={() => setWhereOpen((o) => !o)}
            >
              <span>Where in the book</span>
              <span className={s.whereValue}>{whereLine(draft.where)}</span>
            </button>
            {whereOpen && <WhereFields where={draft.where} onChange={(where) => setDraft((d) => ({ ...d, where }))} />}
          </div>
        )}
        {voice.snag && <p className={s.snag}>{voice.snag}</p>}
      </div>

      {gap && nudge && <p className={s.hint} role="status">{gap}</p>}
      <footer className={s.foot}>
        {k.asks.text && <MicButton voice={voice} />}
        {k.asks.text && <RoomButton roomy={roomy} onToggle={() => setRoomy((r) => !r)} />}
        <button
          type="button"
          className={s.keep}
          aria-disabled={Boolean(gap)}
          onClick={() => {
            if (gap) return setNudge(true)
            voice.stop()
            onKept(kind, draft)
            clear()
          }}
        >
          Keep it
        </button>
      </footer>
    </LabSheet>
  )
}
