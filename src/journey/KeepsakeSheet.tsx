/* Share this journey — one picture, one set of facts.

   The journey and not the book. The book belongs to its author and there is
   nothing of the reader's in it; what this sends is the reading — when it was
   opened, what was kept, who was followed. Naming it after the book gave the
   credit to the wrong person.


   The old version of this sheet had a single answer: a card, sent as its
   plain-text setting. Which meant "send it somewhere" and "copy the text" did
   the same thing in different words, and there was no way to send a reading to
   somebody who reads in pictures.

   So: one editing surface and three outputs. The card is where the reading is
   assembled — tap a line to leave it out — and the picture and the plain text
   are that same edited set in another material. Change what the card says and
   all three change together, because three versions of one reading that
   disagree is worse than one version.

   The shape of the sheet is the second thing it got wrong. Every part of it —
   the way-picker, three fieldsets of chips, a hint — was stacked
   in one scroller with the picture pinned under them at 176px, so the thing
   being sent was the smallest item on a screen whose only job was to show it,
   and choosing a palette scrolled it out of sight. Nothing scrolls now. The
   preview takes every pixel the controls do not, the controls are one short
   fixed band beneath it, and the two ways out are under that.

   Still no model, no network and no key. The picture is drawn on a canvas from
   the reader's own keeps, and nothing anywhere in it says "Flyleaf": a keepsake
   with an app's name across the foot is an advertisement wearing somebody's
   reading as a costume. */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import Sheet from '../components/Sheet'
import LeafButton from '../components/LeafButton'
import PaperSurface from '../components/PaperSurface'
import { CheckIcon, CloseIcon, SaveIcon, ShareIcon } from '../components/TabIcons'
import type { Book, Entry } from '../data/db'
import {
  GRAINS,
  PALETTES,
  SHAPES,
  drawKeepsake,
  keepsakeOf,
  readyFonts,
  saveKeepsake,
  sendKeepsake,
  shapeWorks,
} from './keepsake'
import type { Grain, Keepsake, Look, Shape } from './keepsake'
import styles from './sheet.module.css'
import card from './keepsake.module.css'

interface Props {
  open: boolean
  onClose: () => void
  book: Book
  keeps: Entry[]
}

type Way = 'card' | 'picture' | 'text'

const WAYS: { id: Way; label: string }[] = [
  { id: 'card', label: 'Card' },
  { id: 'picture', label: 'Picture' },
  { id: 'text', label: 'Text' },
]

/** The set as text. Terms and details on their own lines rather than run
    together, because a message app wraps a long line wherever it likes and the
    whole point of the set is that it is set. */
function asText(k: Keepsake) {
  const parts = [
    `${k.title}\n${k.author}`,
    ...k.lines.map(({ term, detail }) => `${term.toUpperCase()}\n${detail}`),
  ]
  return parts.join('\n\n')
}

/** The shape hints are written as fragments, to be read after a label. Under
    the stage they are the whole line, so they are set as one. */
function sentence(s: string) {
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}.`
}

function KeepsakeSheet({ open, onClose, book, keeps }: Props) {
  const [way, setWay] = useState<Way>('card')
  /* Terms the reader has tapped out of the card. By term rather than by index
     so the choice survives a keep being added while the sheet is open. */
  const [omit, setOmit] = useState<Set<string>>(new Set())
  const [shape, setShape] = useState<Shape>('colophon')
  const [paletteId, setPaletteId] = useState(PALETTES[0].id)
  const [grain, setGrain] = useState<Grain>('plain')
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const [done, setDone] = useState<'' | 'shared' | 'saved'>('')

  const plate = useRef<HTMLCanvasElement>(null)

  const base = useMemo(() => keepsakeOf(book, keeps), [book, keeps])

  /* What every output is made of: the card minus whatever was tapped out. One
     object, three renderings. */
  const made = useMemo<Keepsake>(
    () => ({ ...base, lines: base.lines.filter((l) => !omit.has(l.term)) }),
    [base, omit],
  )

  const look = useMemo<Look>(
    () => ({ shape, palette: PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0], grain }),
    [shape, paletteId, grain],
  )

  const text = useMemo(() => asText(made), [made])
  const shapes = SHAPES.filter((s) => shapeWorks(made, s.id))
  const empty = base.lines.length === 0 && !base.line && base.tally.length === 0
  const hint = SHAPES.find((s) => s.id === shape)?.hint ?? ''

  /* A different book is a different reading: the lines left out of the last one
     mean nothing here. */
  useEffect(() => {
    setOmit(new Set())
  }, [book.id])

  useEffect(() => {
    if (!open) return
    setCopied(false)
    setDone('')
  }, [open])

  /* The plain text follows the card until the reader starts typing into it —
     editing the text is the last word, but toggling a line is a new starting
     point and has to show up. */
  useEffect(() => {
    setDraft(text)
  }, [text])

  /* A shape with nothing left to put in it stops being offered, so the picture
     can't end up drawing an empty plate the moment somebody taps out the last
     line it needed. */
  useEffect(() => {
    if (shapeWorks(made, shape)) return
    const next = SHAPES.find((s) => shapeWorks(made, s.id))
    if (next) setShape(next.id)
  }, [made, shape])

  /* Canvas takes no font it has not been told to load, and the first paint
     after opening would otherwise be set in Times. */
  useEffect(() => {
    if (!open || way !== 'picture') return
    let alive = true
    void (async () => {
      await readyFonts()
      if (alive && plate.current) drawKeepsake(plate.current, made, look)
    })()
    return () => {
      alive = false
    }
  }, [open, way, made, look])

  /** Anything that changes what would be sent invalidates "Copied" and "Sent".
      A tick left standing next to a card that has since been edited is a lie
      about what is on the clipboard. */
  function touched() {
    setCopied(false)
    setDone('')
  }

  function toggle(term: string) {
    setOmit((prev) => {
      const next = new Set(prev)
      if (!next.delete(term)) next.add(term)
      return next
    })
    touched()
  }

  async function copy(what: string) {
    try {
      await navigator.clipboard.writeText(what)
      setCopied(true)
    } catch {
      /* Clipboard refused — an insecure origin, or a browser that wants a
         closer gesture. The words are on screen and selectable either way. */
    }
  }

  async function sendWords(what: string) {
    try {
      if (navigator.share) await navigator.share({ text: what, title: book.title })
      else await copy(what)
    } catch {
      /* Cancelled. */
    }
  }

  async function sendPicture() {
    if (!plate.current) return
    const went = await sendKeepsake(plate.current, book.title)
    if (went !== 'cancelled') setDone(went)
  }

  async function savePicture() {
    if (!plate.current) return
    await saveKeepsake(plate.current, book.title)
    setDone('saved')
  }

  const words = way === 'text' ? draft : text

  return (
    <Sheet open={open} onClose={onClose} label="Share this journey" name="keepsake" fill={!empty}>
      <header className={styles.head}>
        <h2 className={styles.title}>Share this journey</h2>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">
          <CloseIcon size={20} />
        </button>
      </header>

      {empty ? (
        <div className={styles.body}>
          <p className={styles.quiet}>
            There is nothing to send yet. Give this book a day it was opened, or keep
            something from it, and this fills itself in.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.compose}>
            {/* The stage. Whichever way is chosen, the thing that would be sent
                is here at the size of the sheet — not a thumbnail of it under
                the controls that make it. */}
            <div className={way === 'card' ? `${styles.stage} ${styles.fades}` : styles.stage}>
              {way === 'card' && (
                <PaperSurface onGlass className={card.card}>
                  <p className={card.bookTitle}>{book.title}</p>
                  <p className={card.author}>{book.author}</p>
                  <span className={card.rule} aria-hidden="true" />
                  <ul className={card.set}>
                    {base.lines.map(({ term, detail }) => (
                      <li key={term}>
                        <button
                          type="button"
                          className={card.line}
                          aria-pressed={!omit.has(term)}
                          onClick={() => toggle(term)}
                        >
                          <span className={card.term}>{term}</span>
                          <span className={card.detail}>{detail}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </PaperSurface>
              )}

              {way === 'picture' && (
                <div className={card.frame}>
                  <canvas
                    ref={plate}
                    className={card.plate}
                    role="img"
                    aria-label={`A picture of your reading of ${book.title}`}
                  />
                </div>
              )}

              {way === 'text' && (
                <textarea
                  className={`${styles.area} ${styles.write}`}
                  aria-label="The text, yours to edit"
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    setCopied(false)
                  }}
                />
              )}
            </div>

            {/* One line about what is on the stage. It used to be a paragraph
                per way plus a hint under the shape chips — four blocks of
                explanation on a screen that shows you the answer. */}
            <p className={styles.caption}>
              {way === 'card' && 'The whole reading, set small. Tap any line to leave it out.'}
              {way === 'picture' && sentence(hint)}
              {way === 'text' && 'The same lines as words, yours to edit before they go.'}
            </p>

            <div className={styles.band}>
              {/* Three materials, one reading. Named rather than drawn, because
                  "a picture" and "plain text" are not things a glyph can say —
                  and set in one track, because three answers to one question
                  are one control. */}
              <div className={styles.segment} role="radiogroup" aria-label="How to send it">
                {WAYS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={way === id}
                    className={styles.segmentItem}
                    onClick={() => {
                      setWay(id)
                      touched()
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* The printer's spec for the plate: what it shows, what it is
                  printed in, what it is printed on. Along one line rather than
                  stacked in three labelled boxes — those were 200px of a sheet
                  that had none to spare, and the picture paid for all of it. */}
              {way === 'picture' && (
                <div className={styles.rail}>
                  <fieldset className={styles.railGroup} role="radiogroup" aria-label="What it shows">
                    <span className={styles.railLabel} aria-hidden="true">
                      Shape
                    </span>
                    {shapes.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        role="radio"
                        aria-checked={shape === s.id}
                        className={styles.chip}
                        onClick={() => {
                          setShape(s.id)
                          touched()
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </fieldset>

                  <span className={styles.railSep} aria-hidden="true" />

                  <fieldset className={styles.railGroup} role="radiogroup" aria-label="Colours">
                    <span className={styles.railLabel} aria-hidden="true">
                      Colour
                    </span>
                    {PALETTES.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        role="radio"
                        aria-checked={paletteId === p.id}
                        aria-label={p.label}
                        className={styles.swatchPick}
                        style={
                          { '--swatch-paper': p.paper, '--swatch-core': p.accent } as CSSProperties
                        }
                        onClick={() => {
                          setPaletteId(p.id)
                          touched()
                        }}
                      >
                        <span className={card.swatch} aria-hidden="true" />
                      </button>
                    ))}
                  </fieldset>

                  <span className={styles.railSep} aria-hidden="true" />

                  <fieldset className={styles.railGroup} role="radiogroup" aria-label="Paper">
                    <span className={styles.railLabel} aria-hidden="true">
                      Paper
                    </span>
                    {GRAINS.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        role="radio"
                        aria-checked={grain === g.id}
                        className={styles.chip}
                        onClick={() => {
                          setGrain(g.id)
                          touched()
                        }}
                      >
                        {g.label}
                      </button>
                    ))}
                  </fieldset>
                </div>
              )}
            </div>
          </div>

          {/* Two ways out, the same size, on every way. Sending and keeping are
              both real answers, and on a laptop — where there is no system share
              sheet — the second one is the only one that does anything. */}
          <footer className={styles.footRow}>
            {way === 'picture' ? (
              <>
                <LeafButton onClick={sendPicture}>
                  <ShareIcon size={18} />
                  {done === 'shared' ? 'Sent' : 'Send it somewhere'}
                </LeafButton>
                <button type="button" className={styles.capture} onClick={savePicture}>
                  {done === 'saved' ? <CheckIcon size={18} /> : <SaveIcon size={18} />}
                  {done === 'saved' ? 'Saved' : 'Save the picture'}
                </button>
              </>
            ) : (
              <>
                <LeafButton onClick={() => sendWords(words)} disabled={!words.trim()}>
                  <ShareIcon size={18} />
                  Send it somewhere
                </LeafButton>
                <button
                  type="button"
                  className={styles.capture}
                  onClick={() => copy(words)}
                  disabled={!words.trim()}
                >
                  {copied ? <CheckIcon size={18} /> : null}
                  {copied ? 'Copied' : 'Copy the text'}
                </button>
              </>
            )}
          </footer>
        </>
      )}
    </Sheet>
  )
}

export default KeepsakeSheet
