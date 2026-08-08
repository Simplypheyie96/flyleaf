/* Keeping something, and changing it afterwards.

   One sheet for both, because they are the same form with the fields already
   filled in, and because a separate "edit" screen is how the two slowly stop
   agreeing about what a keep can hold. A reader who mistypes a page, mishears
   a name or changes their mind about a suspicion comes back through this same
   door and finds everything where they left it.

   What the sheet asks for is not written here. It is read off `KIND[type].asks`
   — the one registry — so a picture asks for a picture, a character asks for a
   name and a face, and a plot thread asks how sure you are, without this file
   holding seven branching opinions about it.

   The order of the fields is the order of the thought: what kind of thing is
   this, what it is called, the thing itself, then where it came from and when.
   Everything after the first two is optional and looks it. */

import { useEffect, useId, useRef, useState } from 'react'
import Sheet from '../components/Sheet'
import LeafButton from '../components/LeafButton'
import DateField from './DateField'
import Recorder from './Recorder'
import { Avatar } from './avatars'
import { CloseIcon, CycleIcon, ImageIcon, VoiceIcon } from '../components/TabIcons'
import { todayISO } from '../components/date/dates'
import type { Book, Entry, EntryType, Stance } from '../data/db'
import { KIND, KINDS, STANCE, STANCES } from './kinds'
import { useDictation } from './dictation'
import { addKeep, editKeep } from './keeps'
import styles from './sheet.module.css'

/* The faces offered when a reader goes looking for a different one.

   Zero is the face the name draws by itself and leads the row, so the one
   already standing beside the field is the first thing in the pool rather than
   a thirteenth option hidden behind the twelve alternatives.

   Twelve, because the row has to be a set the eye can take in — two tidy rows
   of six on a phone — and because the point of showing them is that the reader
   can see the range and stop. A hundred faces is the blind cycle again with
   the scrolling made visible. */
const FACES = Array.from({ length: 12 }, (_, n) => n)

interface Props {
  open: boolean
  onClose: () => void
  book: Book
  /** The keep being changed. Absent means a new one. */
  editing?: Entry
  /** Which kind a new keep starts as — the reader has usually already said, by
      choosing from the capture menu, and being asked twice is being ignored. */
  start?: EntryType
}

function KeepSheet({ open, onClose, book, editing, start = 'quote' }: Props) {
  const [type, setType] = useState<EntryType>(start)
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [face, setFace] = useState(0)
  const [facing, setFacing] = useState(false)
  const [stance, setStance] = useState<Stance>('hunch')
  const [page, setPage] = useState('')
  const [chapter, setChapter] = useState('')
  const [keptOn, setKeptOn] = useState(todayISO())
  const [media, setMedia] = useState<Blob>()
  const [duration, setDuration] = useState<number>()
  const [busy, setBusy] = useState(false)
  const photo = useRef<HTMLInputElement>(null)

  /* Two fields on this sheet carry a button on their label line — the face
     swap and Dictate — so those two are labelled by reference rather than by
     being wrapped.

     A <label> that wraps its field swallows its whole subtree into the field's
     accessible name, and the browser then prunes what it swallowed: a button
     inside the wrapper renders, takes taps, and is missing from the
     accessibility tree entirely. Screen-reader users could not reach Dictate
     at all. `htmlFor` ties the word to the field without claiming everything
     standing next to it. */
  const nameId = useId()
  const textId = useId()

  /* Dictation drops finished phrases at the end of whatever is already there,
     with a space in front unless the field is empty — so a reader can type
     half a sentence, speak the rest, and not have to go back and fix the
     join. */
  const speech = useDictation((words) =>
    setText((had) => (had.trim() ? `${had.replace(/\s+$/, '')} ${words}` : words)),
  )

  /* Reset on open rather than on close: a sheet that empties itself while it
     is still sliding away does it in front of the reader. */
  useEffect(() => {
    if (!open) return
    setBusy(false)
    if (editing) {
      setType(editing.type)
      setText(editing.text ?? '')
      setName(editing.name ?? '')
      setFace(editing.face ?? 0)
      setFacing(false)
      setStance(editing.stance ?? 'hunch')
      setPage(editing.page !== undefined ? `${editing.page}` : '')
      setChapter(editing.chapter ?? '')
      setKeptOn(editing.keptOn)
      setMedia(editing.media)
      setDuration(editing.duration)
      return
    }
    setType(start)
    setText('')
    setName('')
    setFace(0)
    setFacing(false)
    setStance('hunch')
    setPage('')
    setChapter('')
    setKeptOn(todayISO())
    setMedia(undefined)
    setDuration(undefined)
  }, [open, editing, start])

  /* Listening into a sheet that has closed is listening into the room. */
  useEffect(() => {
    if (!open) speech.stop()
  }, [open, speech])

  const asks = KIND[type].asks

  /* What has to be there before the sheet will let go of it — the one thing
     the card is *of*. A picture with no picture, a character with no name and
     a quote with no line are each half a keep; everything else can follow
     later, and often does. */
  const ready = asks.name
    ? name.trim().length > 0
    : asks.media === 'image' || asks.media === 'audio'
      ? media !== undefined
      : text.trim().length > 0

  async function submit() {
    if (!ready || busy) return
    speech.stop()
    setBusy(true)
    try {
      /* Every field is stated, including the ones this kind does not use.
         `editKeep` removes the undefined ones, which is what turns a character
         into… well, nothing, since the kind cannot change once kept — but it
         is also what lets a reader clear a page number they got wrong. */
      const shared = {
        type,
        text: text.trim() || undefined,
        page: page ? Number(page) : undefined,
        chapter: chapter.trim() || undefined,
        keptOn,
        media: asks.media === 'none' ? undefined : media,
        duration: asks.media === 'audio' ? duration : undefined,
        name: asks.name ? name.trim() || undefined : undefined,
        stance: asks.stance ? stance : undefined,
        /* Zero is the face the name draws by itself, so it is stored as
           nothing at all — the field only exists on the characters whose
           reader pressed the button. */
        face: type === 'character' && face ? face : undefined,
      }
      if (editing) await editKeep(editing.id, shared)
      else await addKeep({ bookId: book.id, ...shared })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const title = editing ? `Change this ${KIND[editing.type].one}` : KIND[type].invite

  /* A label and a caption are one line; a quote, a note, a dossier and a piece
     of lore are paragraphs. */
  const longhand = asks.media === 'none' || asks.media === 'optional-image'

  const dictateButton = speech.supported && asks.text && (
    <button
      type="button"
      className={styles.dictate}
      data-on={speech.listening ? '' : undefined}
      onClick={speech.toggle}
      aria-pressed={speech.listening}
    >
      <VoiceIcon size={15} />
      {speech.listening ? 'Listening' : 'Dictate'}
    </button>
  )

  return (
    <Sheet open={open} onClose={onClose} label={title} name="keep-sheet">
      <header className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">
          <CloseIcon size={20} />
        </button>
      </header>

      <div className={styles.body}>
        {/* The kind is settled at the moment of keeping. Changing a quote into
            a character afterwards would leave a name with nowhere to have come
            from, so the row is not offered on an edit. */}
        {!editing && (
          <fieldset className={styles.group}>
            <legend className={styles.label}>What is it</legend>
            <div className={styles.chipRow} role="radiogroup" aria-label="Kind of keep">
              {KINDS.map((value) => {
                const kind = KIND[value]
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={type === value}
                    data-kind=""
                    className={styles.chip}
                    style={{ '--kind': `var(${kind.hue})` } as React.CSSProperties}
                    onClick={() => setType(value)}
                  >
                    <kind.Icon size={17} />
                    {kind.one}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        {/* The name, and — for a character — the face that name drew, standing
            beside it.

            The face belongs to this field and nowhere else: it is made out of
            what is typed in the box next to it, and it changes as the letters
            land. On its own row underneath it read as a second thing to deal
            with. Here it reads as what the field just produced.

            The reader is never asked to pick FIRST. Opening on a grid of
            strangers asks somebody who wrote down a habit rather than a face to
            decide which one is Bel before they have anything to decide with —
            so the name still draws one on its own, and it is the only face on
            screen until the reader says otherwise.

            But saying otherwise now shows them the pool. This used to hand back
            one more stranger per tap, out of a set the reader could not see:
            fine if the second face happened to be right, and a slot machine if
            it was not, because nothing on screen said whether the good one was
            one tap away or nine, or how to get back to the one two taps ago.
            The faces are cheap once the generator is in memory — the whole row
            costs less than the picture already standing beside the field — so
            they are laid out and chosen from, and the pick is a pick rather
            than a spin. */}
        {asks.name && (
          <div className={styles.label}>
            <span className={styles.labelLine}>
              <label htmlFor={nameId}>{asks.name.label}</label>
              {type === 'character' && name.trim() && (
                <button
                  type="button"
                  className={styles.faceSwap}
                  aria-expanded={facing}
                  onClick={() => setFacing(!facing)}
                >
                  <CycleIcon size={15} />
                  {facing ? 'Done' : 'Another face'}
                </button>
              )}
            </span>
            <span className={styles.nameRow}>
              <input
                id={nameId}
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={asks.name.placeholder}
                maxLength={60}
                autoFocus
              />
              {/* The chosen one stays beside the field whether the row is open
                  or shut: it is what the field just produced, and a picture
                  that jumps somewhere else the moment you go to change it is a
                  picture you have to find again afterwards. */}
              {type === 'character' && name.trim() && (
                <span className={styles.facePlate}>
                  <Avatar name={name} note={text} face={face} />
                </span>
              )}
            </span>
            {type === 'character' && name.trim() && facing && (
              <span className={styles.faceRow} role="group" aria-label="Pick a face">
                {FACES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={styles.facePick}
                    aria-label={n ? `Face ${n + 1}` : 'The face this name draws'}
                    aria-pressed={n === face}
                    onClick={() => setFace(n)}
                  >
                    <Avatar name={name} note={text} face={n} />
                  </button>
                ))}
              </span>
            )}
          </div>
        )}

        {asks.media === 'audio' && (
          <Recorder
            media={media}
            duration={duration}
            seed={editing?.id ?? book.id}
            onCapture={(blob, secs) => {
              setMedia(blob)
              setDuration(secs)
            }}
          />
        )}

        {(asks.media === 'image' || asks.media === 'optional-image') && (
          <div className={styles.recorder}>
            <input
              ref={photo}
              type="file"
              accept="image/*"
              className={styles.hidden}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setMedia(file)
              }}
            />
            <button
              type="button"
              className={styles.capture}
              data-lead="true"
              onClick={() => photo.current?.click()}
            >
              <ImageIcon size={18} />
              {media ? 'Choose another' : asks.media === 'image' ? 'Choose a picture' : 'Pin a map'}
            </button>
            <p className={styles.rowHint}>
              {media
                ? 'Ready to keep.'
                : asks.media === 'image'
                  ? 'It stays on this device.'
                  : 'Optional — without one you get a drawn field.'}
            </p>
          </div>
        )}

        {asks.text && (
          <div className={styles.label}>
            <span className={styles.labelLine}>
              <label htmlFor={textId}>{asks.text.label}</label>
              {!ready || asks.name ? null : <span className={styles.optional}>required</span>}
              {dictateButton}
            </span>
            {longhand ? (
              /* THE FIELD IS SET IN THE FACE THE KEEP WILL BE READ BACK IN.
                 sheet.module.css has carried `.penned`, the hung quotation
                 mark, and the two `[data-kind]` rules since the kinds were
                 built — and nothing ever put the attribute on the box, so
                 every kind got the same grey rectangle and all of it was dead
                 stylesheet. A quote is somebody else's sentence being copied
                 out and it is typed in the book's own serif; a note is the
                 reader's aside and it is typed in their hand. The other five
                 are notes *about* a book and keep the plain box, which is why
                 this is one attribute rather than a branch. */
              <span className={styles.penned} data-kind={type}>
                <textarea
                  id={textId}
                  className={styles.area}
                  data-kind={type}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={asks.text.placeholder}
                  autoFocus={!asks.name}
                />
              </span>
            ) : (
              <input
                id={textId}
                className={styles.input}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={asks.text.placeholder}
              />
            )}
          </div>
        )}

        {asks.stance && (
          <fieldset className={styles.group}>
            <legend className={styles.label}>How sure are you</legend>
            <div className={styles.chipRow} role="radiogroup" aria-label="How sure are you">
              {STANCES.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={stance === value}
                  data-kind=""
                  className={styles.chip}
                  style={{ '--kind': 'var(--color-thread)' } as React.CSSProperties}
                  onClick={() => setStance(value)}
                >
                  {STANCE[value].label}
                </button>
              ))}
            </div>
            <p className={styles.rowHint}>{STANCE[stance].blurb}.</p>
          </fieldset>
        )}

        {/* Per keep, never per book: the page a quote is on has nothing to do
            with the page a voice memo was recorded beside. */}
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

        <DateField label="Kept on" value={keptOn} onChange={setKeptOn} seed={book.id} />
      </div>

      <footer className={styles.foot}>
        <LeafButton className={styles.submit} onClick={submit} disabled={!ready || busy}>
          {editing ? 'Save' : 'Keep it'}
        </LeafButton>
      </footer>
    </Sheet>
  )
}

export default KeepSheet
