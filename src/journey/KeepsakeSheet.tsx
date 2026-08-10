/* Share this journey — one picture, made out of what you kept.

   The journey and not the book. The book belongs to its author and there is
   nothing of the reader's in it; what this sends is the reading — when it was
   opened, what was kept, who was followed. Naming it after the book gave the
   credit to the wrong person.

   This sheet used to offer three materials: a card, a picture, and the plain
   text, with the card doubling as an editing surface where any fact could be
   tapped out of the set. Three renderings of one reading, kept in step with
   each other.

   It is one now, because the other two were answers to a question nobody
   asked. The card was the picture with the drawing taken out — the same facts,
   set in HTML — and nobody wants the version of a keepsake that can't be sent
   as one. The plain text is what "Copy the words" hands over, which is a
   button and not a mode. And the tap-a-line editing was a fifth control on a
   screen already carrying four, guarding against an embarrassment ("BEEN TO —
   2 places") that was never embarrassing. What is left is the thing anybody
   would actually send.

   So: one picture, and two questions about it. What it shows, and what it is
   printed on. Both are a single row, both are on screen at once, and neither
   scrolls sideways — the old rail packed three labelled fieldsets into one
   horizontal scroller, which on a phone meant the colours and the papers sat
   off the right-hand edge with nothing to say they were there at all.

   Still no model, no network and no key. The picture is drawn on a canvas from
   the reader's own keeps, and nothing anywhere in it says "Flyleaf": a keepsake
   with an app's name across the foot is an advertisement wearing somebody's
   reading as a costume. */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import Sheet from '../components/Sheet'
import LeafButton from '../components/LeafButton'
import { CheckIcon, CloseIcon, ShareIcon } from '../components/TabIcons'
import type { Book, Entry } from '../data/db'
import {
  PALETTES,
  SHAPES,
  drawKeepsake,
  keepsakeOf,
  readyFonts,
  sendKeepsake,
  shapeWorks,
} from './keepsake'
import type { Keepsake, Look, Shape } from './keepsake'
import styles from './sheet.module.css'
import card from './keepsake.module.css'

interface Props {
  open: boolean
  onClose: () => void
  book: Book
  keeps: Entry[]
}

/** The same reading as words, for wherever a picture won't go. Terms and
    details on their own lines rather than run together, because a message app
    wraps a long line wherever it likes and the whole point of a set is that it
    is set. */
function asText(k: Keepsake) {
  const parts = [`${k.title}\n${k.author}`]
  if (k.impression) parts.push(`HOW I FELT:\n${k.impression}`)
  if (k.line) parts.push(`“${k.line.text}”`)
  parts.push(...k.lines.map(({ term, detail }) => `${term.toUpperCase()}\n${detail}`))
  return parts.join('\n\n')
}

/** The shape hints are written as fragments, to be read after a label. Under
    the stage they are the whole line, so they are set as one. */
function sentence(s: string) {
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}.`
}

function KeepsakeSheet({ open, onClose, book, keeps }: Props) {
  const [shape, setShape] = useState<Shape>('colophon')
  const [paletteId, setPaletteId] = useState(PALETTES[0].id)
  const [copied, setCopied] = useState(false)
  const [done, setDone] = useState<'' | 'shared' | 'saved'>('')

  const plate = useRef<HTMLCanvasElement>(null)

  const made = useMemo(() => keepsakeOf(book, keeps), [book, keeps])

  const look = useMemo<Look>(
    () => ({ shape, palette: PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0] }),
    [shape, paletteId],
  )

  const shapes = SHAPES.filter((s) => shapeWorks(made, s.id))
  const empty = made.lines.length === 0 && !made.line && !made.impression
  const hint = SHAPES.find((s) => s.id === shape)?.hint ?? ''

  useEffect(() => {
    if (!open) return
    setCopied(false)
    setDone('')
  }, [open])

  /* A shape with nothing left to put in it stops being offered, so the picture
     can't end up drawing an empty plate. */
  useEffect(() => {
    if (shapeWorks(made, shape)) return
    const next = SHAPES.find((s) => shapeWorks(made, s.id))
    if (next) setShape(next.id)
  }, [made, shape])

  /* Canvas takes no font it has not been told to load, and the first paint
     after opening would otherwise be set in Times. */
  useEffect(() => {
    if (!open) return
    let alive = true
    void (async () => {
      await readyFonts()
      if (alive && plate.current) drawKeepsake(plate.current, made, look)
    })()
    return () => {
      alive = false
    }
  }, [open, made, look])

  /** Anything that changes what would be sent invalidates "Copied" and "Sent".
      A tick left standing next to a picture that has since been redrawn is a
      lie about what is on the clipboard. */
  function touched() {
    setCopied(false)
    setDone('')
  }

  async function copyWords() {
    try {
      await navigator.clipboard.writeText(asText(made))
      setCopied(true)
    } catch {
      /* Clipboard refused — an insecure origin, or a browser that wants a
         closer gesture. Nothing is lost; the picture is still the way out. */
    }
  }

  async function sendPicture() {
    if (!plate.current) return
    const went = await sendKeepsake(plate.current, book.title)
    if (went !== 'cancelled') setDone(went)
  }

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
            {/* The stage. The thing that would be sent, at the size of the
                sheet — not a thumbnail of it under the controls that make it. */}
            <div className={styles.stage}>
              <div className={card.frame}>
                <canvas
                  ref={plate}
                  className={card.plate}
                  role="img"
                  aria-label={`A picture of your reading of ${book.title}`}
                />
              </div>
            </div>

            {/* One line about what is on the stage, which is the shape's own
                hint. It used to sit under a row of chips as a fourth block of
                explanation on a screen that shows you the answer. */}
            <p className={styles.caption}>{sentence(hint)}</p>

            <div className={styles.band}>
              {/* What it shows. Unlabelled: the caption under the picture is
                  already saying what the chosen one does, and a word reading
                  "Shape" above three named shapes explains nothing twice. */}
              <div className={styles.rail} role="radiogroup" aria-label="What the picture shows">
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
              </div>

              {/* What it is printed on. This one keeps its label, because four
                  coloured discs on their own are a question rather than an
                  answer — and because "Paper" is what the choice actually is:
                  the stock and the ink that goes on it, not a theme. */}
              <div className={styles.rail} role="radiogroup" aria-label="Paper">
                <span className={styles.railLabel} aria-hidden="true">
                  Paper
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
              </div>
            </div>
          </div>

          {/* Two ways out, the same size. The picture is the point, so it goes
              first; the words are for the places a picture can't go — a plain
              text field, a note to yourself, somebody who reads by ear. There
              is no separate "Save" any more: on a phone the system sheet has
              saving in it, and on a laptop, where there is no system sheet,
              sending IS saving, and the button says so once it has. */}
          <footer className={styles.footRow}>
            <LeafButton onClick={sendPicture}>
              {done ? <CheckIcon size={18} /> : <ShareIcon size={18} />}
              {done === 'shared' ? 'Sent' : done === 'saved' ? 'Saved' : 'Send the picture'}
            </LeafButton>
            <button type="button" className={styles.capture} onClick={copyWords}>
              {copied ? <CheckIcon size={18} /> : null}
              {copied ? 'Copied' : 'Copy the words'}
            </button>
          </footer>
        </>
      )}
    </Sheet>
  )
}

export default KeepsakeSheet
