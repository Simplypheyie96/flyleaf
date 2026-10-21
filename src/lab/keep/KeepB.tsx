/* B · Pick, then a full page.
   First the question — what are you keeping? — as eight tiles in their two
   families. Then the sheet becomes one tall page for that kind, at the same
   height it already was, so nothing jumps. Where in the book is always in
   view under the words; Keep it is pinned. */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { EntryType } from '../../data/db'
import { KIND, KINDS, SIDE, type Side } from '../../journey/kinds'
import {
  BackIcon,
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
} from './parts'
import type { KeepProps } from './KeepLab'
import s from './keep.module.css'

const SIDES: Side[] = ['whisper', 'ink']

export default function KeepB({ open, onClose, onKept, book }: KeepProps) {
  const field = useRef<HTMLTextAreaElement>(null)
  const first = useRef<HTMLButtonElement>(null)
  const { kind, setKind, draft, setDraft, restored, clear } = useDrafts(open)
  const [chosen, setChosen] = useState(false)
  const [roomy, setRoomy] = useState(false)
  const [nudge, setNudge] = useState(false)
  const setText = (text: string) => setDraft((d) => ({ ...d, text }))
  const voice = useVoiceTyping(field, draft.text, setText)
  const k = KIND[kind]
  const gap = missing(kind, draft)

  useEffect(() => {
    if (!open) {
      voice.stop()
      setChosen(false)
      setRoomy(false)
      setNudge(false)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Focus the page in the same task as the tile tap, so the keyboard comes. */
  useLayoutEffect(() => {
    if (chosen) (field.current ?? undefined)?.focus({ preventScroll: true })
  }, [chosen, kind])

  function choose(t: EntryType) {
    setKind(t)
    setChosen(true)
  }

  return (
    <LabSheet open={open} onClose={onClose} label="Keep something" roomy={roomy} focus={first}>
      {!chosen ? (
        <>
          <header className={s.head}>
            <h2 className={s.title}>What are you keeping?</h2>
            <button type="button" className={s.iconBtn} aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </button>
          </header>
          <div className={s.body}>
            {SIDES.map((side) => (
              <section key={side} className={s.family}>
                <h3 className={s.familyName}>
                  {SIDE[side].label}
                  <span> · {SIDE[side].blurb}</span>
                </h3>
                <div className={s.tiles}>
                  {KINDS.filter((t) => KIND[t].side === side).map((t, i) => {
                    const { Icon, label, invite, hue } = KIND[t]
                    return (
                      <button
                        key={t}
                        ref={side === 'whisper' && i === 0 ? first : undefined}
                        type="button"
                        className={s.tile}
                        style={{ '--hue': `var(${hue})` } as React.CSSProperties}
                        onClick={() => choose(t)}
                      >
                        <span className={s.tileIcon}>
                          <Icon size={20} />
                        </span>
                        <span className={s.tileName}>{label.replace(/s$/, '').replace('Vocabulary', 'Word')}</span>
                        <span className={s.tileInvite}>{invite}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : (
        <>
          <header className={s.head}>
            <button
              type="button"
              className={s.iconBtn}
              aria-label="Choose another kind"
              onClick={() => {
                voice.stop()
                setRoomy(false)
                setNudge(false)
                setChosen(false)
              }}
            >
              <BackIcon />
            </button>
            <h2 className={s.title} style={{ '--hue': `var(${k.hue})` } as React.CSSProperties}>
              <span className={s.titleIcon}>
                <k.Icon size={18} />
              </span>
              {k.invite}
            </h2>
            <button type="button" className={s.iconBtn} aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </button>
          </header>
          <div className={s.body}>
            {restored && !roomy && <Restored onClear={clear} />}
            {!roomy && (
              <NameField kind={kind} draft={draft} patch={(p) => setDraft((d) => ({ ...d, ...p }))} />
            )}
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
                className={s.page}
              />
            )}
            {!roomy && k.asks.stance && (
              <StanceRow value={draft.stance} onChange={(stance) => setDraft((d) => ({ ...d, stance }))} />
            )}
            {!roomy && (
              <fieldset className={s.where}>
                <legend>Where in the book · {book}</legend>
                <WhereFields where={draft.where} onChange={(where) => setDraft((d) => ({ ...d, where }))} />
              </fieldset>
            )}
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
        </>
      )}
    </LabSheet>
  )
}
