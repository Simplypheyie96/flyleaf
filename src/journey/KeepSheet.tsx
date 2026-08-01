/* Keeping something, and changing it afterwards.

   One sheet for both, because they are the same form with the fields already
   filled in, and because a separate "edit" screen is how the two slowly stop
   agreeing about what a keep can hold.

   The order of the fields is the order of the thought: what kind of thing is
   this, the thing itself, then where it came from, when, and what it is about.
   Everything after the first two is optional and looks it — a reader who just
   wants the line down should be able to type it and hit Keep without ever
   scrolling to the rest. */

import { useEffect, useRef, useState } from 'react'
import Sheet from '../components/Sheet'
import LeafButton from '../components/LeafButton'
import DateField from './DateField'
import Recorder from './Recorder'
import { CloseIcon, ImageIcon, StrandIcon } from '../components/TabIcons'
import { todayISO } from '../components/date/dates'
import type { Book, Entry, EntryType, Strand } from '../data/db'
import { KEEP } from './lexicon'
import { strandColor } from './order'
import { KIND } from './Keep'
import { addKeep, closeStrand, editKeep, openStrand } from './keeps'
import styles from './sheet.module.css'

/* The five a reader chooses between. `strand` is the sixth kind of keep but
   not the sixth button: starting or tying off something you are following is
   a different act from writing a line down, and putting it in this row would
   make it look like a formatting choice. It has its own door. */
const KINDS: EntryType[] = ['quote', 'note', 'voice', 'image', 'highlight']

/** What the sheet is doing. A strand keep can only be reached by its own
    entry points, so it is a mode rather than a type the reader can pick. */
export type Compose =
  | { as: 'keep'; editing?: Entry }
  | { as: 'strand' }
  | { as: 'tie'; strand: Strand }

interface Props {
  open: boolean
  onClose: () => void
  book: Book
  strands: Strand[]
  mode: Compose
}

function KeepSheet({ open, onClose, book, strands, mode }: Props) {
  const editing = mode.as === 'keep' ? mode.editing : undefined

  const [type, setType] = useState<EntryType>('quote')
  const [text, setText] = useState('')
  const [page, setPage] = useState('')
  const [chapter, setChapter] = useState('')
  const [keptOn, setKeptOn] = useState(todayISO())
  const [motifs, setMotifs] = useState<string[]>([])
  const [motif, setMotif] = useState('')
  const [strandId, setStrandId] = useState<number>()
  const [media, setMedia] = useState<Blob>()
  const [duration, setDuration] = useState<number>()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const photo = useRef<HTMLInputElement>(null)

  /* Reset on open rather than on close: a sheet that empties itself while it
     is still sliding away does it in front of the reader. */
  useEffect(() => {
    if (!open) return
    setBusy(false)
    setMotif('')
    setName('')
    if (editing) {
      setType(editing.type)
      setText(editing.text ?? '')
      setPage(editing.page !== undefined ? `${editing.page}` : '')
      setChapter(editing.chapter ?? '')
      setKeptOn(editing.keptOn)
      setMotifs(editing.motifs ?? [])
      setStrandId(editing.strandId)
      setMedia(editing.media)
      setDuration(editing.duration)
      return
    }
    setType(mode.as === 'keep' ? 'quote' : 'strand')
    setText('')
    setPage('')
    setChapter('')
    setKeptOn(todayISO())
    setMotifs([])
    setStrandId(mode.as === 'tie' ? mode.strand.id : undefined)
    setMedia(undefined)
    setDuration(undefined)
  }, [open, editing, mode])

  const running = strands.filter((s) => !s.closedAt)

  function addMotif() {
    const word = motif.trim()
    if (!word || motifs.includes(word)) {
      setMotif('')
      return
    }
    setMotifs([...motifs, word])
    setMotif('')
  }

  function pickPhoto(file: File | undefined) {
    if (!file) return
    setMedia(file)
  }

  /* What has to be there before the sheet will let go of it. A picture with
     no picture and a strand with no name are both half a keep. */
  const ready =
    mode.as === 'strand'
      ? name.trim().length > 0
      : mode.as === 'tie'
        ? true
        : type === 'image' || type === 'voice'
          ? media !== undefined || text.trim().length > 0
          : text.trim().length > 0

  async function submit() {
    if (!ready || busy) return
    setBusy(true)
    try {
      if (mode.as === 'strand') {
        await openStrand(book.id, name.trim(), text.trim(), keptOn, strands)
      } else if (mode.as === 'tie') {
        await closeStrand(mode.strand, text.trim(), keptOn)
      } else {
        const shared = {
          type,
          text: text.trim() || undefined,
          page: page ? Number(page) : undefined,
          chapter: chapter.trim() || undefined,
          keptOn,
          motifs: motifs.length ? motifs : undefined,
          strandId,
          media,
          duration,
        }
        if (editing) await editKeep(editing.id, shared)
        else await addKeep({ bookId: book.id, ...shared })
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const title =
    mode.as === 'strand'
      ? 'Start a strand'
      : mode.as === 'tie'
        ? `Tie off ${mode.strand.name}`
        : editing
          ? `Change this ${KEEP[editing.type].one}`
          : 'Keep something'

  return (
    <Sheet open={open} onClose={onClose} label={title} name="keep-sheet">
      <header className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">
          <CloseIcon size={20} />
        </button>
      </header>

      <div className={styles.body}>
        {mode.as === 'keep' && !editing && (
          <fieldset className={styles.group}>
            <legend className={styles.label}>What is it</legend>
            <div className={styles.chipRow} role="radiogroup" aria-label="Kind of keep">
              {KINDS.map((value) => {
                const { label, Icon } = KIND[value]
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={type === value}
                    className={styles.chip}
                    onClick={() => setType(value)}
                  >
                    <Icon size={17} />
                    {label}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        {mode.as === 'strand' && (
          <label className={styles.label}>
            What are you following
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Trees as characters"
              maxLength={60}
              autoFocus
            />
          </label>
        )}

        {mode.as === 'tie' && (
          <p className={styles.blurb}>
            The braid stops here. Everything already tied to{' '}
            <strong>{mode.strand.name}</strong> stays where it is.
          </p>
        )}

        {type === 'voice' ? (
          <>
            <Recorder
              media={media}
              duration={duration}
              seed={editing?.id ?? book.id}
              onCapture={(blob, secs) => {
                setMedia(blob)
                setDuration(secs)
              }}
            />
            <label className={styles.label}>
              <span className={styles.labelLine}>
                A line about it <span className={styles.optional}>optional</span>
              </span>
              <input
                className={styles.input}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
          </>
        ) : type === 'image' ? (
          <>
            <div className={styles.recorder}>
              <input
                ref={photo}
                type="file"
                accept="image/*"
                className={styles.hidden}
                onChange={(e) => pickPhoto(e.target.files?.[0])}
              />
              <button
                type="button"
                className={styles.capture}
                data-lead="true"
                onClick={() => photo.current?.click()}
              >
                <ImageIcon size={18} />
                {media ? 'Choose another' : 'Choose a picture'}
              </button>
              {media && <p className={styles.rowHint}>Ready to keep.</p>}
            </div>
            <label className={styles.label}>
              <span className={styles.labelLine}>
                Caption <span className={styles.optional}>optional</span>
              </span>
              <input
                className={styles.input}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="The page I kept turning back to"
              />
            </label>
          </>
        ) : (
          <label className={styles.label}>
            <span className={styles.labelLine}>
              {mode.as === 'keep' ? KIND[type].label : 'Where it landed'}
              {mode.as !== 'keep' && <span className={styles.optional}>optional</span>}
            </span>
            <textarea
              className={styles.area}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                mode.as === 'strand'
                  ? 'Why you started watching for it.'
                  : mode.as === 'tie'
                    ? 'What it came to.'
                    : type === 'note'
                      ? 'Your own words.'
                      : 'The line, as the book has it.'
              }
              autoFocus={mode.as === 'keep'}
            />
          </label>
        )}

        {mode.as === 'keep' && (
          <div className={styles.pair}>
            <label className={styles.label}>
              <span className={styles.labelLine}>
                Page <span className={styles.optional}>optional</span>
              </span>
              <input
                className={styles.input}
                inputMode="numeric"
                value={page}
                onChange={(e) => setPage(e.target.value.replace(/\D/g, ''))}
              />
            </label>
            <label className={styles.label}>
              <span className={styles.labelLine}>
                Chapter <span className={styles.optional}>optional</span>
              </span>
              <input
                className={styles.input}
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
              />
            </label>
          </div>
        )}

        <DateField
          label="Kept on"
          value={keptOn}
          onChange={setKeptOn}
          seed={book.id}
        />

        {mode.as === 'keep' && (
          <>
            <fieldset className={styles.group}>
              <legend className={styles.label}>
                <span className={styles.labelLine}>
                  Motifs <span className={styles.optional}>what it’s about</span>
                </span>
              </legend>
              {motifs.length > 0 && (
                <div className={styles.chipRow}>
                  {motifs.map((word) => (
                    <button
                      key={word}
                      type="button"
                      className={styles.chip}
                      aria-checked="true"
                      role="checkbox"
                      onClick={() => setMotifs(motifs.filter((m) => m !== word))}
                    >
                      {word}
                      <CloseIcon size={14} />
                    </button>
                  ))}
                </div>
              )}
              <div className={styles.addRow}>
                <input
                  className={styles.input}
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    addMotif()
                  }}
                  placeholder="grief, the sea, mothers"
                  maxLength={32}
                />
                <button
                  type="button"
                  className={styles.chip}
                  onClick={addMotif}
                  disabled={!motif.trim()}
                >
                  Add
                </button>
              </div>
            </fieldset>

            {running.length > 0 && (
              <fieldset className={styles.group}>
                <legend className={styles.label}>
                  <span className={styles.labelLine}>
                    Strand <span className={styles.optional}>optional</span>
                  </span>
                </legend>
                <div className={styles.chipRow} role="radiogroup" aria-label="Tie to a strand">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={strandId === undefined}
                    className={styles.chip}
                    onClick={() => setStrandId(undefined)}
                  >
                    Loose
                  </button>
                  {running.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={strandId === s.id}
                      data-strand=""
                      className={styles.chip}
                      style={{ '--strand': strandColor(s.hue) } as React.CSSProperties}
                      onClick={() => setStrandId(s.id)}
                    >
                      <span className={styles.swatch} aria-hidden="true" />
                      {s.name}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
          </>
        )}
      </div>

      <footer className={styles.foot}>
        <LeafButton className={styles.submit} onClick={submit} disabled={!ready || busy}>
          {mode.as === 'strand' ? (
            <>
              <StrandIcon size={18} />
              Start it
            </>
          ) : mode.as === 'tie' ? (
            'Tie it off'
          ) : editing ? (
            'Save'
          ) : (
            'Keep it'
          )}
        </LeafButton>
      </footer>
    </Sheet>
  )
}

export default KeepSheet
