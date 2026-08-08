/* Share one keep — the same press, a smaller subject.

   The share button on a keep used to hand the system a paragraph of plain
   text and nothing else, while the button at the top of the same screen
   handed it a printed picture with four papers to choose from. Two shares,
   two different qualities of gift, for no reason anybody could have explained
   to a reader.

   So this is `KeepsakeSheet` for a single keep: one stage showing exactly what
   would be sent, one row for how loud it is set, one row for what it is
   printed on, and the plain words still one tap away for the places a picture
   cannot go. The drawing is in `plate.ts`; this file only asks the two
   questions and hands the canvas to the system sheet.

   It stays mounted with the keep it was last opened on, so the picture does
   not blink out from under the closing animation. */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import Sheet from '../components/Sheet'
import LeafButton from '../components/LeafButton'
import { CheckIcon, CloseIcon, ShareIcon } from '../components/TabIcons'
import type { Book, Entry } from '../data/db'
import { KIND } from './kinds'
import { PALETTES, readyFonts, sendKeepsake } from './keepsake'
import { CUTS, coverOf, cutWorks, drawPlate, firstCut, pictureOf, plateOf } from './plate'
import type { Cast, Cut } from './plate'
import { shareText } from './share'
import styles from './sheet.module.css'
import card from './keepsake.module.css'

interface Props {
  open: boolean
  onClose: () => void
  /** The keep being shared. Null before the first share of a session — the
      sheet holds the last one it was given so the close animation has
      something to close over. */
  keep: Entry | null
  book: Book
}

/** The shape hints are written as fragments, to be read after a label. Under
    the stage they are the whole line, so they are set as one. */
function sentence(s: string) {
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}.`
}

function PlateSheet({ open, onClose, keep, book }: Props) {
  /* Null until the reader taps one. The cut is not stored, it is chosen: a
      keep that has just finished decoding its photograph wants to be showing
      the photograph, and an initial state written at mount cannot know that
      yet. So the chosen one wins if it still works, and otherwise the keep
      decides for itself. */
  const [picked, setPicked] = useState<Cut | null>(null)
  const [paletteId, setPaletteId] = useState(PALETTES[0].id)
  const [copied, setCopied] = useState(false)
  const [done, setDone] = useState<'' | 'shared' | 'saved'>('')
  /* Three states, not two: undefined while the blob is still decoding, null
     for a keep that has no picture or whose picture would not decode. Without
     the third the mount cut would blink into the row a frame after the sheet
     opened, on the one kind of keep that is mostly picture. */
  const [picture, setPicture] = useState<ImageBitmap | null | undefined>(undefined)
  /* The book's jacket, for the head of the sheet. Two states rather than
     three: unlike the keep's own picture it decides no cut and hides no
     control, so the plate draws its board and quietly swaps the photograph in
     when one arrives. */
  const [cover, setCover] = useState<ImageBitmap | null>(null)

  const canvas = useRef<HTMLCanvasElement>(null)
  const last = useRef<Entry | null>(null)
  if (keep) last.current = keep
  const shown = keep ?? last.current

  const made = useMemo(
    () => (shown ? plateOf(shown, book, picture ?? null, cover) : null),
    [shown, book, picture, cover],
  )

  /* Offered while the picture is still coming, so the row does not change
     shape under the reader's thumb. Until it lands the plate draws the words
     instead — a cut that fills itself in is better than one that appears. */
  const coming = Boolean(shown?.media?.type.startsWith('image/')) && picture === undefined
  const cuts = made
    ? CUTS.filter((c) => (c.id === 'mount' ? coming || cutWorks(made, c.id) : cutWorks(made, c.id)))
    : []

  const opensOn: Cut = coming ? 'mount' : made ? firstCut(made) : 'said'
  const cut = picked && cuts.some((c) => c.id === picked) ? picked : opensOn

  const cast = useMemo<Cast>(
    () => ({ cut, palette: PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0] }),
    [cut, paletteId],
  )

  const hint = CUTS.find((c) => c.id === cut)?.hint ?? ''

  /* The picture belongs to the keep, so it is decoded once per keep rather
     than once per repaint — and closed again when the sheet moves on, because
     an ImageBitmap holds its pixels until it is told not to. */
  useEffect(() => {
    if (!shown) return
    let alive = true
    let mine: ImageBitmap | null = null
    setPicture(undefined)
    void (async () => {
      const bitmap = await pictureOf(shown)
      if (!alive) {
        bitmap?.close()
        return
      }
      mine = bitmap
      setPicture(bitmap)
    })()
    return () => {
      alive = false
      mine?.close()
    }
  }, [shown])

  /* The jacket belongs to the BOOK, not to the keep, so it is fetched once per
     book and survives the reader moving from one keep to the next. Keyed on
     the URLs rather than on the array, which callers rebuild on every render.
     A miss costs nothing: the plate has already drawn its own board. */
  const sources = book.covers?.join('\n') ?? ''
  useEffect(() => {
    let alive = true
    let mine: ImageBitmap | null = null
    setCover(null)
    void (async () => {
      const bitmap = await coverOf(book)
      if (!alive) {
        bitmap?.close()
        return
      }
      mine = bitmap
      setCover(bitmap)
    })()
    return () => {
      alive = false
      mine?.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources])

  /* A fresh keep is a fresh question: which cut suits it, and has anything
     been sent yet. The paper is left where the reader put it — that is a
     preference, not a property of the keep. */
  useEffect(() => {
    if (!open) return
    setPicked(null)
    setCopied(false)
    setDone('')
  }, [open, shown])

  /* Canvas takes no font it has not been told to load, and the first paint
     after opening would otherwise be set in Times. */
  useEffect(() => {
    if (!open || !made) return
    let alive = true
    void (async () => {
      await readyFonts()
      if (alive && canvas.current) drawPlate(canvas.current, made, cast)
    })()
    return () => {
      alive = false
    }
  }, [open, made, cast])

  /** Anything that changes what would be sent invalidates "Copied" and "Sent".
      A tick left standing next to a picture that has since been redrawn is a
      lie about what is on the clipboard. */
  function touched() {
    setCopied(false)
    setDone('')
  }

  async function copyWords() {
    if (!shown) return
    try {
      await navigator.clipboard.writeText(shareText(shown, book))
      setCopied(true)
    } catch {
      /* Clipboard refused — an insecure origin, or a browser that wants a
         closer gesture. Nothing is lost; the picture is still the way out. */
    }
  }

  async function sendPicture() {
    if (!canvas.current) return
    const went = await sendKeepsake(canvas.current, book.title)
    if (went !== 'cancelled') setDone(went)
  }

  const one = shown ? KIND[shown.type].one : 'keep'
  const label = `Share this ${one}`

  return (
    <Sheet open={open} onClose={onClose} label={label} name="plate" fill={Boolean(made)}>
      <header className={styles.head}>
        <h2 className={styles.title}>{label}</h2>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">
          <CloseIcon size={20} />
        </button>
      </header>

      {made && (
        <>
          <div className={styles.compose}>
            {/* The stage. The thing that would be sent, at the size of the
                sheet — not a thumbnail of it under the controls that make it. */}
            <div className={styles.stage}>
              <div className={card.frame}>
                <canvas
                  ref={canvas}
                  className={card.plate}
                  role="img"
                  aria-label={`A picture of this ${one}, from ${book.title}`}
                />
              </div>
            </div>

            <p className={styles.caption}>{sentence(hint)}</p>

            <div className={styles.band}>
              {/* How loud it is set. Unlabelled: the caption above is already
                  saying what the chosen one does, and one keep with a picture
                  of it on screen does not need a word reading "Style". */}
              <div className={styles.rail} role="radiogroup" aria-label="What the picture shows">
                {cuts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={cut === c.id}
                    className={styles.chip}
                    onClick={() => {
                      setPicked(c.id)
                      touched()
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* The same four papers as the journey's keepsake, and the same
                  word for them. A reader who has picked Dusk once should find
                  it here under the name they learnt. */}
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

          {/* The picture is the point, so it goes first; the words are for the
              places a picture can't go — a plain text field, a note to
              yourself, somebody who reads by ear. */}
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

export default PlateSheet
