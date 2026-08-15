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
import { CloseIcon, CycleIcon, ImageIcon, SearchIcon, VoiceIcon } from '../components/TabIcons'
import { todayISO } from '../components/date/dates'
import type { Book, Entry, EntryType, Stance } from '../data/db'
import { KIND, KINDS, STANCE, STANCES } from './kinds'
import { lookUp, remembered, warm, type Sense } from './dictionary'
import { useDictation } from './dictation'
import { addKeep, editKeep } from './keeps'
import { shrink, tooBig } from './shrink'
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
  const [percent, setPercent] = useState('')
  const [keptOn, setKeptOn] = useState(todayISO())
  const [media, setMedia] = useState<Blob>()
  const [duration, setDuration] = useState<number>()
  const [busy, setBusy] = useState(false)
  /* The one thing that went wrong, said in the sheet rather than swallowed. */
  const [snag, setSnag] = useState<string>()
  /* The two facts the look-up brings back beside the definition. They ride
     along invisibly — the sheet never shows them — and land on the card.
     Cleared the moment the word changes, so a reworded headword can never
     keep another word's pronunciation. */
  const [phonetic, setPhonetic] = useState<string>()
  const [pos, setPos] = useState<string>()
  const [looking, setLooking] = useState(false)
  /* Said under the meaning box, not as a blocker: the pen always works. */
  const [lookSnag, setLookSnag] = useState<string>()
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

  const baseTextRef = useRef('')

  const speech = useDictation((sessionTranscript) => {
    const base = baseTextRef.current.trim()
    setText(base ? `${base} ${sessionTranscript}` : sessionTranscript)
  })

  const toggleDictation = () => {
    if (!speech.listening) {
      baseTextRef.current = text.trim()
    }
    speech.toggle()
  }

  const draftKey = `flyleaf-draft-${book.id}`

  /* Reset on open rather than on close: a sheet that empties itself while it
     is still sliding away does it in front of the reader. Restores auto-saved
     draft if one exists. */
  useEffect(() => {
    if (!open) return
    setBusy(false)
    setLooking(false)
    setLookSnag(undefined)
    if (editing) {
      setType(editing.type)
      setText(editing.text ?? '')
      setName(editing.name ?? '')
      setFace(editing.face ?? 0)
      setFacing(false)
      setStance(editing.stance ?? 'hunch')
      setPage(editing.page !== undefined ? `${editing.page}` : '')
      setChapter(editing.chapter ?? '')
      setPercent(editing.percent !== undefined ? `${editing.percent}` : '')
      setKeptOn(editing.keptOn)
      setMedia(editing.media)
      setDuration(editing.duration)
      setPhonetic(editing.phonetic)
      setPos(editing.pos)
      return
    }
    const saved = localStorage.getItem(draftKey)
    if (saved) {
      try {
        const d = JSON.parse(saved)
        setType(d.type ?? start)
        setText(d.text ?? '')
        setName(d.name ?? '')
        setPage(d.page ?? '')
        setChapter(d.chapter ?? '')
        setPercent(d.percent ?? '')
        setKeptOn(d.keptOn ?? todayISO())
        setStance(d.stance ?? 'hunch')
        setFace(0)
        setFacing(false)
        setMedia(undefined)
        setDuration(undefined)
        setPhonetic(d.phonetic)
        setPos(d.pos)
        return
      } catch {}
    }
    setType(start)
    setText('')
    setName('')
    setFace(0)
    setFacing(false)
    setStance('hunch')
    setPage('')
    setChapter('')
    setPercent('')
    setKeptOn(todayISO())
    setMedia(undefined)
    setDuration(undefined)
    setPhonetic(undefined)
    setPos(undefined)
  }, [open, editing, start, draftKey])

  /* Auto-save unsaved draft to localStorage so no words are ever lost */
  useEffect(() => {
    if (!editing && (text.trim() || name.trim() || page || chapter || percent)) {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ type, text, name, page, chapter, percent, keptOn, stance, phonetic, pos }),
        )
      } catch {}
    }
  }, [draftKey, editing, type, text, name, page, chapter, percent, keptOn, stance, phonetic, pos])

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

  /* The button beside Dictate on a vocabulary keep. One fetch, no queue: the
     reader pressed it, so the sheet either fills the box in a moment or says
     in one line that the pen still works. The definition lands in the meaning
     box as ordinary text — fully theirs to rewrite — and the pronunciation and
     part of speech appear under the word, which is where they will sit on the
     card. Nothing the look-up learns is hidden from the person who asked. */
  function fill(sense: Sense | undefined) {
    if (sense) {
      setText(sense.meaning)
      setPhonetic(sense.phonetic)
      setPos(sense.pos)
    } else {
      setLookSnag('The dictionary has not heard of it — write it in your own words.')
    }
  }

  async function lookItUp() {
    const word = name.trim()
    if (!word || looking) return
    setLookSnag(undefined)

    /* The usual case, once the warm-up below has done its job: the answer is
       already here and the boxes fill in this very click, with the button never
       having said "Looking…" at all. Deliberately not routed through the
       promise — awaiting one that has already settled still costs a render, and
       a spinner that appears and vanishes between two frames is worse than no
       spinner, because the eye catches the flicker and not the word. */
    const here = remembered(word)
    if (here) {
      fill(here.sense)
      return
    }

    setLooking(true)
    try {
      fill(await lookUp(word))
    } catch {
      setLookSnag('Couldn’t reach the dictionary — write it in your own words.')
    } finally {
      setLooking(false)
    }
  }

  /* Fetch the word before anybody asks for it. A reader who has finished
     typing a headword is a beat away from either writing the meaning
     themselves or pressing the button, and the second of those is the one that
     used to cost a second of staring — so the sheet spends that beat on the
     network instead of on nothing. If they write their own meaning, the answer
     is simply never collected and the only thing spent is one request the free
     shelf would have served anyway.

     Half a second of stillness, not a keystroke: this fires when the typing
     stops, so "susurrus" is one request rather than eight. Vocabulary only —
     no other kind has a word to look up — and never while an answer is already
     on the card, since that word has plainly been asked about already. */
  useEffect(() => {
    if (!open || type !== 'vocabulary') return
    const word = name.trim()
    if (word.length < 2 || phonetic || pos) return
    const t = setTimeout(() => warm(word), 500)
    return () => clearTimeout(t)
  }, [open, type, name, phonetic, pos])

  async function submit() {
    if (!ready || busy) return
    speech.stop()
    setSnag(undefined)
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
        percent: percent ? Math.min(100, Math.max(0, Number(percent))) : undefined,
        keptOn,
        media: asks.media === 'none' ? undefined : media,
        duration: asks.media === 'audio' ? duration : undefined,
        name: asks.name ? name.trim() || undefined : undefined,
        stance: asks.stance ? stance : undefined,
        /* Zero is the face the name draws by itself, so it is stored as
           nothing at all — the field only exists on the characters whose
           reader pressed the button. */
        face: type === 'character' && face ? face : undefined,
        /* Only ever set by the look-up, and cleared the moment the word is
           retyped, so what lands here always belongs to the headword above. */
        phonetic: type === 'vocabulary' ? phonetic || undefined : undefined,
        pos: type === 'vocabulary' ? pos || undefined : undefined,
      }
      if (editing) await editKeep(editing.id, shared)
      else await addKeep({ bookId: book.id, ...shared })
      localStorage.removeItem(draftKey)
      onClose()
    } catch {
      /* A write can fail — the device is out of room, or the browser is in a
         private window that will not keep anything. The sheet stays open with
         every word still in it, because the one thing worse than not saving is
         not saving quietly. */
      setSnag('That would not save. Your device may be out of room — the words are still here, so try again.')
    } finally {
      setBusy(false)
    }
  }

  const title = editing ? `Change this ${KIND[editing.type].one}` : KIND[type].invite

  /* A label and a caption are one line; a quote, a note, a dossier and a piece
     of lore are paragraphs. */
  const longhand = asks.media === 'none' || asks.media === 'optional-image'

  /* Vocabulary's second way to answer the meaning field. It sits with Dictate
     on the label line because the two are the same offer — "you don't have to
     type this" — and disables rather than hides while there is no word yet,
     so the affordance is learnable before it is usable. */
  const lookUpButton = type === 'vocabulary' && asks.text && (
    <button
      type="button"
      className={styles.lookUp}
      onClick={lookItUp}
      disabled={!name.trim() || looking}
    >
      <SearchIcon size={15} />
      {looking ? 'Looking…' : 'Look it up'}
    </button>
  )

  /* Not on vocabulary: its meaning field already has Look it up, and two ways
     to not-type one field is one offer too many. */
  const dictateButton = type !== 'vocabulary' && speech.supported && asks.text && (
    <button
      type="button"
      className={styles.dictate}
      data-on={speech.listening ? '' : undefined}
      onClick={toggleDictation}
      aria-pressed={speech.listening}
    >
      <VoiceIcon size={15} />
      {speech.listening ? 'Listening' : (speech.snag ?? 'Dictate')}
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
                onChange={(e) => {
                  setName(e.target.value)
                  /* A retyped headword keeps nothing of the old one's look-up:
                     a card must never say another word's pronunciation. */
                  if (type === 'vocabulary') {
                    setPhonetic(undefined)
                    setPos(undefined)
                    setLookSnag(undefined)
                  }
                }}
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
            {/* What the dictionary said the word sounds like, under the word
                itself. It used to ride along invisibly and only appear once
                the card was drawn, which meant the reader pressed Look it up,
                watched one box fill, and had no way of knowing the sheet had
                also learned how to say it. Shown here it is both a receipt —
                the look-up found *this* word — and the more useful half of
                what a dictionary is for. Under the word rather than under the
                meaning, because a pronunciation belongs to the headword.

                Read-only on purpose: it is the dictionary's own notation, and
                a text field would invite a reader to correct IPA they did not
                write. Retyping the word clears it, above. */}
            {type === 'vocabulary' && (phonetic || pos) && (
              <span className={styles.saying}>
                {phonetic && <span className={styles.said}>{phonetic}</span>}
                {pos && <span className={styles.part}>{pos}</span>}
              </span>
            )}
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
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setSnag(undefined)
                if (tooBig(file)) {
                  setSnag('That picture is very large. Try a photo rather than a scan or a raw file.')
                  return
                }
                setMedia(await shrink(file))
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
              {/* The two other ways to answer travel as one piece, so that on
                  a phone too narrow for the whole line they land together on
                  their own line rather than one above the other. */}
              {(lookUpButton || dictateButton) && (
                <span className={styles.labelActs}>
                  {lookUpButton}
                  {dictateButton}
                </span>
              )}
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
            {/* The look-up failing is a shrug, not an error: one quiet line
                that hands the job back to the pen, never a blocker. */}
            {lookSnag && (
              <p className={styles.lookHint} role="status">
                {lookSnag}
              </p>
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

        {/* Per keep, never per book: location can be page, chapter, or percentage progress. */}
        <fieldset className={styles.group}>
          <legend className={styles.label}>
            <span className={styles.labelLine}>
              Where in the book <span className={styles.optional}>optional</span>
            </span>
          </legend>
          <div className={styles.pair}>
            <label className={styles.label}>
              <span className={styles.labelLine}>Page</span>
              <input
                className={styles.input}
                inputMode="numeric"
                placeholder="e.g. 142"
                value={page}
                onChange={(e) => setPage(e.target.value.replace(/\D/g, ''))}
              />
            </label>
            <label className={styles.label}>
              <span className={styles.labelLine}>Chapter</span>
              <input
                className={styles.input}
                placeholder="e.g. 4"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
              />
            </label>
            <label className={styles.label}>
              <span className={styles.labelLine}>Progress %</span>
              <input
                className={styles.input}
                inputMode="numeric"
                placeholder="e.g. 45"
                value={percent}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '')
                  if (!val || Number(val) <= 100) setPercent(val)
                }}
              />
            </label>
          </div>
        </fieldset>

        <DateField label="Kept on" value={keptOn} onChange={setKeptOn} seed={book.id} />
      </div>

      <footer className={styles.foot}>
        {snag && (
          <p className={styles.snag} role="alert">
            {snag}
          </p>
        )}
        <LeafButton className={styles.submit} onClick={submit} disabled={!ready || busy}>
          {editing ? 'Save' : 'Keep it'}
        </LeafButton>
      </footer>
    </Sheet>
  )
}

export default KeepSheet
