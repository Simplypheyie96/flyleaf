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

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Sheet from "../components/Sheet";
import LeafButton from "../components/LeafButton";
import DateField from "./DateField";
import Recorder from "./Recorder";
import { Avatar } from "./avatars";
import {
  CloseIcon,
  CycleIcon,
  ExpandIcon,
  ImageIcon,
  PlaceIcon,
  SearchIcon,
  VoiceIcon,
} from "../components/TabIcons";
import Longhand from "./Longhand";
import MapPicker from "./place/MapPicker";
import MapView from "./place/MapView";
import { useObjectUrl } from "./cards/shared";
import { todayISO } from "../components/date/dates";
import type { Book, Entry, EntryType, Stance } from "../data/db";
import {
  KIND,
  KINDS,
  SIDE,
  STANCE,
  STANCES,
  type Asks,
  type Side,
} from "./kinds";
import { lookUp, remembered, unreachable, warm, type Sense } from "./dictionary";
import { useDictation } from "./dictation";
import { addKeep, editKeep } from "./keeps";
import { shrink, tooBig } from "./shrink";
import styles from "./sheet.module.css";

/* The faces offered when a reader goes looking for a different one.

   Zero is the face the name draws by itself and leads the row, so the one
   already standing beside the field is the first thing in the pool rather than
   a thirteenth option hidden behind the twelve alternatives.

   Twelve, because the row has to be a set the eye can take in — two tidy rows
   of six on a phone — and because the point of showing them is that the reader
   can see the range and stop. A hundred faces is the blind cycle again with
   the scrolling made visible. */
const FACES = Array.from({ length: 12 }, (_, n) => n);

interface Props {
  open: boolean;
  onClose: () => void;
  book: Book;
  /** The keep being changed. Absent means a new one. */
  editing?: Entry;
  /** Which kind a new keep starts as — the reader has usually already said, by
      choosing from the capture menu, and being asked twice is being ignored. */
  start?: EntryType;
  /** Everything this book already holds. Used for one thing only: refusing to
      restore a draft that is a word-for-word copy of a keep the reader has
      already made. See `held` below. */
  kept?: Entry[];
}

/** IS THIS DRAFT JUST A COPY OF SOMETHING THE BOOK ALREADY HAS?

    The draft exists to catch words on their way to being lost. Words that are
    already safe in the book are not that, and handing them back is not rescuing
    anything — it is showing the reader a second copy of a thing she finished
    with and asking her to deal with it.

    It is also the sturdy half of the stale-draft fix. The other half stops the
    sheet WRITING a phantom; this stops one ever being RESTORED, whatever wrote
    it and however old it is. A reader carrying a phantom from an older build
    does not have to sit through it once before it goes, and any future variant
    of the same mistake dies here rather than reaching her.

    Strict on purpose: same kind, same words, same name, all three. Two keeps
    that merely resemble each other are two keeps. */
function held(
  d: { type?: string; text?: string; name?: string },
  kept: Entry[],
) {
  const text = (d.text ?? "").trim();
  const name = (d.name ?? "").trim();
  if (!text && !name) return false;
  return kept.some(
    (e) =>
      e.type === d.type &&
      (e.text ?? "").trim() === text &&
      (e.name ?? "").trim() === name,
  );
}

/* ── The eight, and the way in ─────────────────────────────────────────────

   The sheet used to open on a form for Quotes with the other seven kinds as a
   chip row above it, which quietly said that a quote is what you are normally
   here for and the rest are a correction. They are not: the eight are eight
   equal answers to one question, and the question comes first.

   The grid is built from KINDS rather than written out again, so a ninth kind
   added to kinds.ts lands under the right heading here without anybody
   remembering this file exists. Four to a side means each half is exactly one
   row and all eight are on screen at once — no scroll, no swipe, and the tile
   the reader touches is the colour that arrives at the top of the form. */
const GROUPS: { side: Side; kinds: EntryType[] }[] = (
  ["whisper", "ink"] as Side[]
).map((side) => ({
  side,
  kinds: KINDS.filter((type) => KIND[type].side === side),
}));

const ASK = "What are you keeping?";

/** "the recording", "the name and the pronunciation", "a, b and c". */
function listed(parts: string[]) {
  if (parts.length < 3) return parts.join(" and ");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** What a change of kind has nowhere to put.

    The kind of a keep is no longer fixed once it is kept — a quote that was
    really a note is two taps from being one. But a note has nowhere to keep a
    recording and a quote has nowhere to keep a headword, so some of what is on
    the keep genuinely goes when the kind does.

    Said before the save rather than discovered after it. The reader is one tap
    from putting the old kind back, and the only thing that makes that tap
    findable is knowing there was something to put back. */
function letGo(
  was: EntryType,
  asks: Asks,
  has: {
    media?: Blob;
    name: string;
    phonetic?: string;
    pos?: string;
    pin?: Entry["pin"];
    stance: boolean;
  },
): string[] {
  const gone: string[] = [];
  if (has.media && asks.media === "none")
    gone.push(was === "voice" ? "the recording" : "the picture");
  if (has.name.trim() && !asks.name)
    gone.push(was === "vocabulary" ? "the word itself" : "the name");
  /* Only worth its own clause when the name it belongs to is staying — a
     dropped headword takes its pronunciation with it without being told. */
  if ((has.phonetic || has.pos) && asks.name)
    gone.push("the pronunciation");
  if (has.pin && asks.media !== "optional-image")
    gone.push("its place on the map");
  if (has.stance && !asks.stance) gone.push("how sure you were");
  return gone;
}

/** The kind's colour, as a custom property the whole subtree can mix against. */
function hue(type: EntryType) {
  return { "--kind": `var(${KIND[type].hue})` } as React.CSSProperties;
}

function Chevron({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 6.5 8 10.5 12 6.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* The way back to the eight, on the detail step only.

   IT IS NOT A DUPLICATE OF THE BAND'S OWN MENU, AND THAT IS THE POINT. The
   name in the band opens the eight in place, which is faster and keeps what has
   already been typed — but it is a control the reader has to notice before it
   can help them, and a reader who has just landed on a form is reading the
   form. This is the affordance they already know: the arrow at the top left of
   a screen they went into.

   Beside the close disc rather than instead of it, because they are not the
   same errand. Back means "wrong kind"; the X means "not now". */
function BackIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9.5 4 5.5 8 9.5 12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* One component, used twice: as the sheet's opening question, and as the menu
   the band's own name opens.

   That is deliberate rather than thrifty. The list behind a dropdown is
   normally the OS picker's, which cannot be styled and arrives as a grey wheel
   over a paper sheet; ours is the same eight squares the reader chose from ten
   seconds ago, in the app's own material, with each kind's colour on its glyph.

   `land` puts the keyboard on the first tile as these mount. It is set only
   when the reader pressed Back, never when the sheet first opens: coming back
   from a form, the control they just used is gone, and without this the focus
   ring would fall to nothing inside a dialog it cannot leave. */
function Kinds({
  current,
  onPick,
  entering,
  land,
}: {
  current?: EntryType;
  onPick: (type: EntryType, rect: DOMRect) => void;
  entering?: boolean;
  land?: boolean;
}) {
  return (
    <div className={styles.groups}>
      {GROUPS.map((group, groupAt) => (
        <section key={group.side} className={styles.kindGroup}>
          <div className={styles.groupHead}>
            <h3 className={styles.groupLabel}>{SIDE[group.side].label}</h3>
            <p className={styles.groupBlurb}>{SIDE[group.side].blurb}</p>
          </div>
          <div className={styles.grid}>
            {group.kinds.map((type, at) => {
              const kind = KIND[type];
              return (
                <button
                  key={type}
                  type="button"
                  autoFocus={land && groupAt === 0 && at === 0}
                  className={`${styles.tile} ${entering ? styles.enter : ""}`}
                  aria-pressed={current ? type === current : undefined}
                  data-on={type === current ? "" : undefined}
                  /* The stagger counts across both rows rather than restarting
                     under the second heading, so the eight arrive as one hand
                     laying them out. */
                  style={
                    {
                      ...hue(type),
                      "--at": groupAt * group.kinds.length + at,
                    } as React.CSSProperties
                  }
                  onClick={(event) =>
                    onPick(type, event.currentTarget.getBoundingClientRect())
                  }
                >
                  <kind.Icon size={22} />
                  {kind.label}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/* What the tapped tile becomes: the same tint and the same glyph, run full
   width across the top of the form, so the colour under the thumb is the colour
   that arrives at the top. The kind's name is the control rather than a
   heading, and that is the whole navigation of this step — the wrong answer is
   where the right one gets picked. */
function Band({
  type,
  open,
  onToggle,
  bandRef,
  pickRef,
  sub,
}: {
  type: EntryType;
  open: boolean;
  onToggle: () => void;
  bandRef: React.RefObject<HTMLDivElement | null>;
  pickRef: React.RefObject<HTMLButtonElement | null>;
  /* The line under the name. On a new keep it is the kind's invitation; on an
     edit the reader is not being invited to keep anything, so it says what the
     control above it is for instead. */
  sub?: string;
}) {
  const kind = KIND[type];
  return (
    <div ref={bandRef} className={styles.kindBand} style={hue(type)}>
      <kind.Icon size={22} />
      <span className={styles.bandText}>
        <button
          ref={pickRef}
          type="button"
          className={styles.bandPick}
          aria-expanded={open}
          aria-label={`${kind.label} — change what you are keeping`}
          onClick={onToggle}
        >
          <span className={styles.bandName}>{kind.label}</span>
          <Chevron />
        </button>
        <span className={styles.bandInvite}>{sub ?? kind.invite}</span>
      </span>
    </div>
  );
}

function KeepSheet({
  open,
  onClose,
  book,
  editing,
  start = "quote",
  kept = [],
}: Props) {
  const [type, setType] = useState<EntryType>(start);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [face, setFace] = useState(0);
  const [facing, setFacing] = useState(false);
  const [stance, setStance] = useState<Stance>("hunch");
  const [page, setPage] = useState("");
  const [chapter, setChapter] = useState("");
  const [percent, setPercent] = useState("");
  const [keptOn, setKeptOn] = useState(todayISO());
  const [media, setMedia] = useState<Blob>();
  /* The name of the file the reader handed over, kept for the length of the
     sheet and never stored on the keep. It exists for one reason: a picture is
     the only thing on this sheet whose arrival the reader cannot otherwise
     confirm. Saying "IMG_4417.HEIC" back to them names the exact file they
     picked out of a roll of near-identical ones — the thumbnail proves
     something arrived, the name proves it was the right something.
     `undefined` for a picture that came back out of the database on an edit,
     where there is no filename to have kept. */
  const [mediaName, setMediaName] = useState<string>();
  /* DID THE READER ACTUALLY TOUCH THE PICTURE?

     On an edit the stored blob is read out of the database into `media` and,
     if nothing guards it, written straight back on save. On WebKit that round
     trip is not free: a blob handed out of IndexedDB and put back can leave
     the stored one dead, and the keep comes back a broken image — a reader who
     only fixed a typo loses the photograph.

     So a picture is only ever written when this says the reader changed it.
     Untouched, the `media` key is left off the patch entirely, and `editKeep`
     leaves what is already stored alone. A ref, not state: nothing on screen
     depends on it, and it must not cause a render mid-edit. */
  const touchedMedia = useRef(false);
  const [duration, setDuration] = useState<number>();
  const [busy, setBusy] = useState(false);
  /* The one thing that went wrong, said in the sheet rather than swallowed. */
  const [snag, setSnag] = useState<string>();
  /* The two facts the look-up brings back beside the definition. They ride
     along invisibly — the sheet never shows them — and land on the card.
     Cleared the moment the word changes, so a reworded headword can never
     keep another word's pronunciation. */
  const [phonetic, setPhonetic] = useState<string>();
  const [pos, setPos] = useState<string>();
  const [looking, setLooking] = useState(false);
  /* Said under the meaning box, not as a blocker: the pen always works.

     It carries WHICH of three things happened as well as the sentence, because
     they are not the same news and they used to read as the same news — one
     faint grey line, in the same size and colour as every field label on the
     sheet, under a box that had not changed. A *miss* is the shelves answering
     and having nothing: write it yourself. *Gone* is nothing answering at all:
     the word may well be in there, try again in a moment. *Found* is good news
     with a caveat — a meaning came back, but filed under a different headword
     than the one that was typed. Told apart and given a ground of their own,
     none of the three can be mistaken for a label the sheet was always
     showing. */
  const [lookSnag, setLookSnag] = useState<{
    tone: "found" | "miss" | "gone";
    line: string;
  }>();
  const photo = useRef<HTMLInputElement>(null);
  /* A place's spot on the real world, and whether the map is currently open to
     choose it. Separate states because a reader can open the map, look, and
     close it again without pinning anything — the map being up is not a
     half-made pin. */
  const [pin, setPin] = useState<Entry["pin"]>();
  const [picking, setPicking] = useState(false);
  /* Whether the writing has been given the whole screen. Not a mode and not a
     second draft — it is one boolean deciding how big the same `text` is being
     shown. See Longhand.tsx. */
  const [room, setRoom] = useState(false);

  /* ── Which step the sheet is on ──────────────────────────────────────────
     `settled` is false only while the reader has not yet said what they are
     keeping. An edit arrives with the answer already given, and a restored
     draft belongs to somebody who was mid-sentence — neither of them should be
     asked the question again.

     `choosing` is the band's own menu, open over the form. It is a different
     state from `picking`, which is the map: two things can be open on this
     sheet and neither of them is the other. */
  const [settled, setSettled] = useState(false);
  const [choosing, setChoosing] = useState(false);
  /* Whether the eight are on screen because Back was pressed rather than
     because the sheet just opened. Only the keyboard can tell the difference,
     and only the keyboard needs to — see `land` on Kinds. */
  const [came, setCame] = useState(false);
  /* The rectangle of the tile that was tapped, kept only long enough for the
     band to fly out of it. */
  const from = useRef<DOMRect | null>(null);
  const band = useRef<HTMLDivElement>(null);
  const pick = useRef<HTMLButtonElement>(null);

  /* The chosen photograph, as something an `img` can be pointed at. Through the
     hook rather than inline, so the handle is released when the sheet closes
     instead of one being minted on every render. */
  const printUrl = useObjectUrl(media);

  /* Two fields on this sheet carry a button on their label line — the face
     swap and Dictate — so those two are labelled by reference rather than by
     being wrapped.

     A <label> that wraps its field swallows its whole subtree into the field's
     accessible name, and the browser then prunes what it swallowed: a button
     inside the wrapper renders, takes taps, and is missing from the
     accessibility tree entirely. Screen-reader users could not reach Dictate
     at all. `htmlFor` ties the word to the field without claiming everything
     standing next to it. */
  const nameId = useId();
  const textId = useId();
  const mediaId = useId();

  const baseTextRef = useRef("");

  const speech = useDictation((sessionTranscript) => {
    const base = baseTextRef.current.trim();
    setText(base ? `${base} ${sessionTranscript}` : sessionTranscript);
  });

  const toggleDictation = () => {
    if (!speech.listening) {
      baseTextRef.current = text.trim();
    }
    speech.toggle();
  };

  const draftKey = `flyleaf-draft-${book.id}`;

  /* Reset on open rather than on close: a sheet that empties itself while it
     is still sliding away does it in front of the reader. Restores auto-saved
     draft if one exists. */
  useEffect(() => {
    if (!open) return;
    setBusy(false);
    setLooking(false);
    setLookSnag(undefined);
    /* The map is never what a sheet opens on, edit or not. A keep that already
       has a pin opens showing the pin, and re-picking is a thing the reader
       asks for. */
    setPicking(false);
    setChoosing(false);
    setCame(false);
    from.current = null;
    /* Every opening starts untouched, whatever the last one did. */
    touchedMedia.current = false;
    if (editing) {
      /* An edit is never asked the question — the answer is already on the
         keep — but it does get the band, because the answer can be wrong. A
         line typed into the quote box that was really a note used to be a
         retyping job; now it is the same two taps a new keep would take. */
      setSettled(true);
      setType(editing.type);
      setText(editing.text ?? "");
      setName(editing.name ?? "");
      setFace(editing.face ?? 0);
      setFacing(false);
      setStance(editing.stance ?? "hunch");
      setPage(editing.page !== undefined ? `${editing.page}` : "");
      setChapter(editing.chapter ?? "");
      setPercent(editing.percent !== undefined ? `${editing.percent}` : "");
      setKeptOn(editing.keptOn);
      setMedia(editing.media);
      /* A stored picture arrives as a blob and nothing else — the name it had
         on the phone was never part of the keep. The row says so rather than
         inventing one. */
      setMediaName(undefined);
      setDuration(editing.duration);
      setPhonetic(editing.phonetic);
      setPos(editing.pos);
      setPin(editing.pin);
      return;
    }
    /* WHAT, IF ANYTHING, IS WORTH RESTORING.

       A stored draft is only handed back if it survives two questions: is it
       readable at all, and is it actually unsaved work? Anything that fails
       either one is deleted here and now — not shown once, not kept for next
       time — and the sheet falls through to blank, which is what the reader
       reached for. `held` answers the second question; see the note on it.

       `kept` is read here but is deliberately not a dependency of this effect.
       It is a new array on every render of the journey, so listing it would
       reset the sheet — wiping whatever the reader is in the middle of typing —
       every time anything in the book changed. The effect only runs when the
       sheet opens, and on that render `kept` is already current. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let draft: any = null;
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (held(d, kept)) localStorage.removeItem(draftKey);
        else draft = d;
      } catch {
        localStorage.removeItem(draftKey);
      }
    }
    if (draft) {
      const d = draft as Record<string, string | undefined>;
      /* Mid-sentence, so the question is behind them. */
      setSettled(true);
      setType((d.type as EntryType) ?? start);
      setText(d.text ?? "");
      setName(d.name ?? "");
      setPage(d.page ?? "");
      setChapter(d.chapter ?? "");
      setPercent(d.percent ?? "");
      setKeptOn(d.keptOn ?? todayISO());
      setStance((d.stance as Stance) ?? "hunch");
      setFace(0);
      setFacing(false);
      setMedia(undefined);
      setMediaName(undefined);
      setDuration(undefined);
      setPhonetic(d.phonetic);
      setPos(d.pos);
      /* A pin is not carried in the draft, for the same reason a photograph is
         not: what the draft exists to rescue is typing. */
      setPin(undefined);
      return;
    }
    /* A blank sheet is the only one that asks the question. */
    setSettled(false);
    setType(start);
    setText("");
    setName("");
    setFace(0);
    setFacing(false);
    setStance("hunch");
    setPage("");
    setChapter("");
    setPercent("");
    setKeptOn(todayISO());
    setMedia(undefined);
    setMediaName(undefined);
    setDuration(undefined);
    setPhonetic(undefined);
    setPos(undefined);
    setPin(undefined);
  }, [open, editing, start, draftKey]);

  /* Auto-save unsaved draft to localStorage so no words are ever lost.

     A CLOSED SHEET MUST NEVER WRITE ONE, and that guard is the whole of this
     fix. The fields are not emptied when the sheet closes — see the note above,
     a sheet that empties itself while it is still sliding away does it in front
     of the reader — so for the entire time the sheet is shut, this component is
     still holding the last entry's words. Every other effect in the file is
     already gated on `open` for exactly that reason; this one was not.

     What that cost, in the order it happened: a reader changes an entry and
     presses Save. `submit` writes it to the book and deletes the draft, then
     calls `onClose`, which sets `editing` back to null. `editing` is a
     dependency here, so this effect fired one beat after the draft was deleted,
     found `!editing` newly true and `text` still full of the entry she had just
     finished with, and wrote it all straight back. The next time she reached for
     a blank sheet she got that entry again, looking for all the world like she
     was still editing it. Dismissing an edit without saving did the same thing.

     `open` is deliberately NOT in the dependency list, and removing it is not a
     tidy-up — it is the difference between the fix working and not. Listed, this
     effect would also run on the commit where the sheet OPENS, and on that one
     commit reset-on-open has only QUEUED its clears: the fields still hold the
     last entry. It would read those, call them unsaved work, and write the very
     draft we are here to prevent. Unlisted, the effect only ever runs when a
     field actually changes, and it reads whatever `open` is at that moment —
     which is all the guard needs. */
  useEffect(() => {
    if (!open || editing) return;
    /* AN EMPTIED SHEET IS AN INSTRUCTION.

       A reader who selects her words and deletes them has said, as plainly as
       the interface allows, that she does not want them. Leaving the last
       draft sitting in storage because there is nothing new to overwrite it
       with turns that into the opposite: she clears the sheet, closes it,
       comes back, and the words she just deleted are waiting for her. Empty
       does not mean "nothing to save", it means "throw away what was there". */
    if (!(text.trim() || name.trim() || page || chapter || percent)) {
      try {
        localStorage.removeItem(draftKey);
      } catch {}
      return;
    }
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          type,
          text,
          name,
          page,
          chapter,
          percent,
          keptOn,
          stance,
          phonetic,
          pos,
        }),
      );
    } catch {}
  }, [
    draftKey,
    editing,
    type,
    text,
    name,
    page,
    chapter,
    percent,
    keptOn,
    stance,
    phonetic,
    pos,
  ]);

  /* Listening into a sheet that has closed is listening into the room. */
  useEffect(() => {
    if (!open) speech.stop();
  }, [open, speech]);

  /* And a writing page cannot outlive the form it was writing into. Escape
     closes the topmost dialog first, so this almost never fires — but "almost
     never" is how a full-screen box ends up on a phone with nothing behind
     it. */
  useEffect(() => {
    if (!open) setRoom(false);
  }, [open]);

  /* Shutting the band's menu is two things, not one: the eight go away, and
     whoever was standing among them has to be put back somewhere. They are
     unmounted, so a keyboard reader who was three tiles in would otherwise be
     left on the document body — still inside the dialog, with nothing focused
     and Tab starting again from the top. Every route out of the menu comes
     through here so none of them can forget the second half. */
  const shut = useCallback(() => {
    setChoosing(false);
    pick.current?.focus();
  }, []);

  /* Escape shuts the menu before it shuts the sheet, which is the order a
     reader means it in: the last thing they opened is the first thing that
     should go.

     ON THE DOCUMENT, IN THE CAPTURE PHASE, AND NOT ON A WRAPPER ROUND THE MENU.
     Safari does not focus a button when you tap it, so after opening this menu
     with a thumb the key event fires on the body, misses any handler hung
     inside the sheet, and the whole thing shuts.

     `preventDefault` rather than only `stopPropagation`: the sheet is a real
     <dialog> opened modally, so closing on Escape is the platform's own default
     and not anything listening in our code. */
  useEffect(() => {
    if (!choosing) return;
    function guard(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      shut();
    }
    document.addEventListener("keydown", guard, true);
    return () => document.removeEventListener("keydown", guard, true);
  }, [choosing, shut]);

  /* The band, flying out of the tile that was tapped. Transform and opacity
     only, a quarter of a second, and nothing at all under reduced motion. */
  useLayoutEffect(() => {
    const el = band.current;
    const rect = from.current;
    from.current = null;
    if (!el || !rect) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const to = el.getBoundingClientRect();
    if (!to.width || !to.height) return;
    el.animate(
      [
        {
          transform: `translate(${rect.left - to.left}px, ${rect.top - to.top}px) scale(${
            rect.width / to.width
          }, ${rect.height / to.height})`,
          opacity: 0.55,
        },
        { transform: "none", opacity: 1 },
      ],
      { duration: 260, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" },
    );
    /* `choosing` is in here so that choosing the kind the band already shows
       still flies — the reader tapped a tile and something has to come of it,
       even when the answer did not change. */
  }, [settled, type, choosing]);

  /* Answering the question, from either the opening grid or the band's menu.
     Whatever has been typed stays typed — a reader who realises their quote was
     really a note should not be made to write it twice — but anything that
     belongs to the kind being left behind goes with it. */
  function choose(next: EntryType, rect?: DOMRect) {
    if (rect) from.current = rect;
    setType(next);
    setSettled(true);
    setCame(false);
    if (next !== "vocabulary") {
      setPhonetic(undefined);
      setPos(undefined);
    }
    setLookSnag(undefined);
    if (next !== "place") {
      setPin(undefined);
      setPicking(false);
    }
  }

  const asks = KIND[type].asks;

  /* What has to be there before the sheet will let go of it — the one thing
     the card is *of*. A picture with no picture, a character with no name and
     a quote with no line are each half a keep; everything else can follow
     later, and often does. */
  const ready = asks.name
    ? name.trim().length > 0
    : asks.media === "image" || asks.media === "audio"
      ? media !== undefined
      : text.trim().length > 0;

  /* Only on an edit, and only once the kind has actually been changed: a new
     keep has nothing saved to lose. */
  const gone =
    editing && type !== editing.type
      ? letGo(editing.type, asks, {
          media,
          name,
          phonetic,
          pos,
          pin,
          stance: editing.stance !== undefined,
        })
      : [];

  /* The button beside Dictate on a vocabulary keep. One fetch, no queue: the
     reader pressed it, so the sheet either fills the box in a moment or says
     in one line that the pen still works. The definition lands in the meaning
     box as ordinary text — fully theirs to rewrite — and the pronunciation and
     part of speech appear under the word, which is where they will sit on the
     card. Nothing the look-up learns is hidden from the person who asked. */
  function fill(sense: Sense | undefined) {
    if (sense) {
      setText(sense.meaning);
      setPhonetic(sense.phonetic);
      setPos(sense.pos);
      /* No shelf had the exact spelling, so this meaning belongs to a headword
         the reader did not type. Said out loud in the same quiet line a miss
         would use: the entry keeps their word, and they can see at a glance
         whether the one that answered is really the same word. */
      if (sense.from)
        setLookSnag({
          tone: "found",
          line: `Found under “${sense.from}” — edit if that isn’t the sense you meant.`,
        });
    } else {
      setLookSnag({
        tone: "miss",
        line: "No dictionary here has this word — write the meaning in your own words.",
      });
    }
  }

  async function lookItUp() {
    const word = name.trim();
    if (!word || looking) return;
    setLookSnag(undefined);

    /* The usual case, once the warm-up below has done its job: the answer is
       already here and the boxes fill in this very click, with the button never
       having said "Looking…" at all. Deliberately not routed through the
       promise — awaiting one that has already settled still costs a render, and
       a spinner that appears and vanishes between two frames is worse than no
       spinner, because the eye catches the flicker and not the word. */
    const here = remembered(word);
    if (here) {
      fill(here.sense);
      return;
    }

    setLooking(true);
    try {
      fill(await lookUp(word));
    } catch (err) {
      setLookSnag(
        unreachable(err)
          ? {
              tone: "gone",
              line: "No dictionary answered — you may be offline. Try again in a moment, or write the meaning yourself.",
            }
          : {
              tone: "gone",
              line: "The look-up went wrong. Try again, or write the meaning yourself.",
            },
      );
    } finally {
      setLooking(false);
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
    if (!open || type !== "vocabulary") return;
    const word = name.trim();
    if (word.length < 2 || phonetic || pos) return;
    const t = setTimeout(() => warm(word), 500);
    return () => clearTimeout(t);
  }, [open, type, name, phonetic, pos]);

  async function submit() {
    if (!ready || busy) return;
    speech.stop();
    setSnag(undefined);
    setBusy(true);
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
        percent: percent
          ? Math.min(100, Math.max(0, Number(percent)))
          : undefined,
        keptOn,
        media: asks.media === "none" ? undefined : media,
        duration: asks.media === "audio" ? duration : undefined,
        name: asks.name ? name.trim() || undefined : undefined,
        stance: asks.stance ? stance : undefined,
        /* Zero is the face the name draws by itself, so it is stored as
           nothing at all — the field only exists on the characters whose
           reader pressed the button. */
        face: type === "character" && face ? face : undefined,
        /* Only ever set by the look-up, and cleared the moment the word is
           retyped, so what lands here always belongs to the headword above. */
        phonetic: type === "vocabulary" ? phonetic || undefined : undefined,
        pos: type === "vocabulary" ? pos || undefined : undefined,
        /* Only a place can hold one, and only the map can set it. */
        pin: asks.media === "optional-image" ? pin : undefined,
      };
      if (editing) {
        /* The picture is left out of the patch unless the reader changed it.
           See `touchedMedia`: writing back a blob that came out of the
           database is what breaks the stored one on WebKit, and an edit that
           never went near the picture has no business rewriting it. Deleting
           the key rather than passing undefined, because to `editKeep`
           undefined means "clear this", which is the opposite. */
        const patch = { ...shared };
        /* Unless the kind changed to one with nowhere to keep it, in which
           case `undefined` is exactly what is meant and the blob goes. */
        if (!touchedMedia.current && asks.media !== "none")
          delete (patch as { media?: Blob }).media;
        await editKeep(editing.id, patch);
      }
      else await addKeep({ bookId: book.id, ...shared });
      localStorage.removeItem(draftKey);
      onClose();
    } catch {
      /* A write can fail — the device is out of room, or the browser is in a
         private window that will not keep anything. The sheet stays open with
         every word still in it, because the one thing worse than not saving is
         not saving quietly. */
      setSnag(
        "That would not save. Your device may be out of room — the words are still here, so try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  /* `type`, not `editing.type`: once the reader has changed the kind, the
     header names the thing they are about to save rather than the thing it
     used to be. */
  const title = editing ? `Change this ${KIND[type].one}` : KIND[type].invite;

  /* A label and a caption are one line; a quote, a note, a dossier and a piece
     of lore are paragraphs. */
  const longhand = asks.media === "none" || asks.media === "optional-image";

  /* Vocabulary's second way to answer the meaning field. It sits with Dictate
     on the label line because the two are the same offer — "you don't have to
     type this" — and disables rather than hides while there is no word yet,
     so the affordance is learnable before it is usable. */
  const lookUpButton = type === "vocabulary" && asks.text && (
    <button
      type="button"
      className={styles.lookUp}
      onClick={lookItUp}
      disabled={!name.trim() || looking}
      aria-busy={looking}
    >
      {/* The word alone changing to "Looking…" was the whole of the old
          feedback, and on a control the eye has already left it is nothing at
          all: the reader presses, a word they are not reading swaps, and the
          sheet looks like it ignored them. A turning ring in place of the
          magnifier puts the movement where the finger just was, so a slow
          shelf reads as an answer on its way rather than as a dead button. */}
      {looking ? (
        <span className={styles.lookSpin} aria-hidden="true" />
      ) : (
        <SearchIcon size={15} />
      )}
      {looking ? "Looking…" : "Look it up"}
    </button>
  );

  /* Not on vocabulary: its meaning field already has Look it up, and two ways
     to not-type one field is one offer too many. */
  const dictateButton = type !== "vocabulary" &&
    speech.supported &&
    asks.text && (
      <button
        type="button"
        className={styles.dictate}
        data-on={speech.listening ? "" : undefined}
        onClick={toggleDictation}
        aria-pressed={speech.listening}
      >
        <VoiceIcon size={15} />
        {speech.listening ? "Listening" : (speech.snag ?? "Dictate")}
      </button>
    );

  /* THE FIELD'S OWN CORNER HANDLE — the answer to "it's difficult to write and
     edit when the view port is tiny."

     It lives INSIDE the box, in the trailing bottom corner, and that is a
     correction. It began on the label row beside Dictate, where it was a third
     pill in a line that had 83.5px left to give: the moment it grew its word
     the row wrapped and shoved the field 34px down the screen, mid-sentence.
     The fix at the time was to shrink the word until it fit. This is the better
     fix — a control that is not in the flow cannot push anything, whatever it
     says. It also puts the handle where the meaning already is: on the box it
     resizes, in the corner a box is grabbed by, rather than in a row of things
     that ANSWER the field.

     It is there from the start rather than appearing when the writing gets
     long. A control that arrives partway through a sentence steals the eye at
     the exact moment the reader is composing, and one that opened the big
     screen by itself would steal the caret — which is worse, because a caret
     that moves without being asked loses the reader their place mid-word.

     What DOES change is how loudly it asks. Icon alone while the box is still
     big enough for what is in it; past about four lines — the point where the
     7.5rem box starts scrolling under a keyboard, and so the first moment the
     offer is worth anything — it says what it does. */
  const roomy = text.length > 160 || text.split("\n").length > 3;

  const roomButton = longhand && asks.text && (
    <button
      type="button"
      className={styles.room}
      data-loud={roomy ? "" : undefined}
      /* Spoken and shown are now the same two words. On the label row the
         visible half had to be shortened to "Room" to fit the line, which left
         a control whose name a screen reader read differently from the one on
         screen. Out of the flow there is nothing to fit, so the compromise goes
         back. */
      aria-label="More room"
      onClick={() => setRoom(true)}
    >
      <ExpandIcon size={15} />
      <span className={styles.roomWord}>More room</span>
    </button>
  );

  /* ── The sheet, in two steps ────────────────────────────────────────────────
     The row of eight chips this replaces asked the reader to answer the most
     consequential question on the sheet — what am I keeping? — in the smallest
     type on it, at the top of a form that was already asking four other things.
     Eight equal chips also said nothing about what the eight ARE, so a reader
     hunting for "where I'd put a word I just learned" had to read all of them.

     Split in two, each step has one job. First: the question, asked once, in
     eight squares grouped under the two halves of a reading journal. Then: the
     form for that one kind, with the answer carried across as the band at the
     top — which is also where it gets changed, so nothing is one-way.

     An edit skips step one — the answer is already on the keep — and opens
     on the form. It still gets the band, so a misfiled keep is corrected where
     it is read rather than deleted and written again. What the new kind has no
     room for is said out loud first; see `gone` below. */
  const closeButton = (
    <button
      type="button"
      className={styles.iconButton}
      onClick={onClose}
      aria-label="Close"
    >
      <CloseIcon size={20} />
    </button>
  );

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        label={settled ? title : ASK}
        name="keep-sheet"
      >
        {!settled ? (
          <>
            <header className={styles.head}>
              <h2 className={styles.title}>Keep something</h2>
              {closeButton}
            </header>
            <div className={styles.body}>
              <p className={styles.ask}>{ASK}</p>
              <Kinds entering land={came} onPick={choose} />
            </div>
          </>
        ) : (
          <>
            <header className={styles.head}>
              {/* Back goes to the eight; the X drops the whole sheet. Two different
              errands, so two different controls — and the reader chooses which
              one they meant rather than finding out afterwards. */}
              {!editing && (
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label="Back to what you are keeping"
                  onClick={() => {
                    setChoosing(false);
                    setCame(true);
                    setSettled(false);
                  }}
                >
                  <BackIcon size={18} />
                </button>
              )}
              <h2 className={styles.title}>{title}</h2>
              {closeButton}
            </header>

            <Band
              type={type}
              open={choosing}
              onToggle={() => (choosing ? shut() : setChoosing(true))}
              bandRef={band}
              pickRef={pick}
              sub={editing ? "Change what this is" : undefined}
            />

            <div className={styles.body}>
              {/* Changing kind from the band. The form is HIDDEN rather than
              unmounted, so everything already typed is still there when the
              reader comes back to it — including, on the same-kind case, the
              exact caret position they left. */}
              {choosing && (
                <Kinds
                  current={type}
                  onPick={(next, rect) => {
                    choose(next, rect);
                    shut();
                  }}
                />
              )}

              <div hidden={choosing} className={styles.formHost}>
                {/* What this change costs, before it is paid. `status` rather
              than `alert`: it is the consequence of something the reader just
              did on purpose, not an error, and it reads out after the field
              they are on rather than interrupting it. */}
                {gone.length > 0 && (
                  <p className={styles.letGo} role="status">
                    Saved as a {KIND[type].one}, this lets go of {listed(gone)}.
                  </p>
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
                      {type === "character" && name.trim() && (
                        <button
                          type="button"
                          className={styles.faceSwap}
                          aria-expanded={facing}
                          onClick={() => setFacing(!facing)}
                        >
                          <CycleIcon size={15} />
                          {facing ? "Done" : "Another face"}
                        </button>
                      )}
                    </span>
                    <span className={styles.nameRow}>
                      <input
                        id={nameId}
                        className={styles.input}
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          /* A retyped headword keeps nothing of the old one's look-up:
                       a card must never say another word's pronunciation. */
                          if (type === "vocabulary") {
                            setPhonetic(undefined);
                            setPos(undefined);
                            setLookSnag(undefined);
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
                      {type === "character" && name.trim() && (
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
                    {type === "vocabulary" && (phonetic || pos) && (
                      <span className={styles.saying}>
                        {phonetic && (
                          <span className={styles.said}>{phonetic}</span>
                        )}
                        {pos && <span className={styles.part}>{pos}</span>}
                      </span>
                    )}
                    {type === "character" && name.trim() && facing && (
                      <span
                        className={styles.faceRow}
                        role="group"
                        aria-label="Pick a face"
                      >
                        {FACES.map((n) => (
                          <button
                            key={n}
                            type="button"
                            className={styles.facePick}
                            aria-label={
                              n ? `Face ${n + 1}` : "The face this name draws"
                            }
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

                {asks.media === "audio" && (
                  <Recorder
                    media={media}
                    duration={duration}
                    seed={editing?.id ?? book.id}
                    onCapture={(blob, secs) => {
                      touchedMedia.current = true;
                      setMedia(blob);
                      setDuration(secs);
                    }}
                  />
                )}

                {/* The picture chooser, shared by the kinds that are *of* a picture and
              by the place kind's second offer below. Declared once here so the
              same input serves both. */}
                {(asks.media === "image" ||
                  asks.media === "optional-image") && (
                  <input
                    ref={photo}
                    type="file"
                    accept="image/*"
                    className={styles.hidden}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setSnag(undefined);
                      if (tooBig(file)) {
                        setSnag(
                          "That picture is very large. Try a photo rather than a scan or a raw file.",
                        );
                        return;
                      }
                      touchedMedia.current = true;
                      setMedia(await shrink(file));
                      setMediaName(file.name);
                    }}
                  />
                )}

                {/* ── The picture ──────────────────────────────────────────────
                THE FRAME IS GONE, AND ITS ABSENCE IS THE FIX. This used to be
                a bordered, padded panel holding one pill and one line of grey
                text — a field's worth of chrome around the smallest job on the
                sheet, which made it the largest object on it. A button under a
                label is what this always was; now that is what it looks like,
                and the label above does the grouping the border was doing
                badly.

                And once a picture WAS chosen, the only thing that changed was
                the pill's own label, from "Choose a picture" to "Choose
                another" — four words the reader has no reason to re-read. So
                the commonest question a picture field gets asked, did that
                work, had its answer hidden inside the button that asked the
                question. Now the answer is the picture itself, under its
                corners, with the file's own name beside a tick: the thumbnail
                proves something arrived and the name proves it was the right
                one out of a roll of near-identical shots. */}
                {asks.media === "image" && (
                  <div className={styles.media}>
                    <span className={styles.label} id={mediaId}>
                      Picture
                    </span>

                    {media ? (
                      <div className={styles.kept}>
                        {printUrl && (
                          <span className={styles.mount}>
                            <img
                              className={styles.print}
                              src={printUrl}
                              alt=""
                            />
                          </span>
                        )}
                        <p className={styles.keptWord}>
                          <span className={styles.tick} aria-hidden="true" />
                          <span className={styles.keptName}>
                            {mediaName ?? "Picture added."}
                          </span>
                        </p>
                        <div className={styles.keptActs}>
                          <button
                            type="button"
                            className={styles.capture}
                            onClick={() => photo.current?.click()}
                          >
                            <ImageIcon size={17} />
                            Change it
                          </button>
                          <button
                            type="button"
                            className={styles.capture}
                            onClick={() => {
                              touchedMedia.current = true;
                              setMedia(undefined);
                              setMediaName(undefined);
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className={styles.offers} aria-describedby={mediaId}>
                          <button
                            type="button"
                            className={styles.capture}
                            data-lead="true"
                            onClick={() => photo.current?.click()}
                          >
                            <ImageIcon size={17} />
                            Choose a picture
                          </button>
                        </div>
                        <p className={styles.rowHint}>
                          It stays on this device.
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* WHERE IT IS — a place's one optional extra, offered two ways.

              A location in a novel is either somewhere you can find on a map or
              somewhere that only exists in the book, and the reader is the only
              one who knows which. So the section offers both and prefers
              neither: pin it on a map, or mount a picture of it. Choosing one
              puts what was chosen on the page in place of the offer, because the
              proof of a pin is the map and the proof of a photograph is the
              photograph — a line of text saying "pinned" is the app asking to be
              believed. */}
                {asks.media === "optional-image" && (
                  <fieldset className={styles.group}>
                    <legend className={styles.label}>
                      <span className={styles.labelLine}>
                        Where it is{" "}
                        <span className={styles.optional}>optional</span>
                      </span>
                    </legend>

                    {picking ? (
                      <MapPicker
                        start={pin}
                        named={name}
                        onPin={(spot) => {
                          setPin(spot);
                          setPicking(false);
                        }}
                        onCancel={() => setPicking(false)}
                      />
                    ) : (
                      <div
                        className={styles.recorder}
                        data-mounted={pin || media ? "" : undefined}
                      >
                        {pin && <MapView {...pin} className={styles.pinned} />}
                        {printUrl && !pin && (
                          <span className={styles.mount}>
                            <img
                              className={styles.print}
                              src={printUrl}
                              alt=""
                            />
                          </span>
                        )}
                        <div className={styles.offers}>
                          <button
                            type="button"
                            className={styles.capture}
                            data-lead={pin || media ? undefined : "true"}
                            onClick={() => setPicking(true)}
                          >
                            <PlaceIcon size={18} />
                            {pin ? "Move the pin" : "Pin it on a map"}
                          </button>
                          <button
                            type="button"
                            className={styles.capture}
                            onClick={() => photo.current?.click()}
                          >
                            <ImageIcon size={18} />
                            {media ? "Choose another" : "Add a picture"}
                          </button>
                        </div>
                        <p className={styles.rowHint}>
                          {pin
                            ? (pin.label ?? "Pinned on the map.")
                            : media
                              ? /* The file's own name, for the same reason as the
                                   picture row above: "Ready to keep." says a
                                   picture is there and nothing about WHICH. */
                                (mediaName ?? "Picture added.")
                              : "Without either you get a drawn field."}
                        </p>
                      </div>
                    )}
                  </fieldset>
                )}

                {asks.text && (
                  <div className={styles.label}>
                    <span className={styles.labelLine}>
                      <label htmlFor={textId}>{asks.text.label}</label>
                      {!ready || asks.name ? null : (
                        <span className={styles.optional}>required</span>
                      )}
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
                        {/* In the box, not above it. `.penned` is the positioned
                      parent and the mark stands in its trailing bottom corner;
                      the field buys that corner back with end padding, so the
                      writing never reaches it. */}
                        {roomButton}
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
                    {/* The look-up coming back empty is still a shrug rather than an
                  error — the pen always works — but it has to be a shrug the
                  reader can SEE. This used to be set in the same faint grey as
                  every field label on the sheet, at the same size, in the same
                  label column, directly under a box that had not changed: a
                  sentence with nothing about it saying it was new. Readers
                  pressed the button, read nothing, and concluded the button
                  was broken. Given a tinted ground and a mark of its own it is
                  unmistakably an answer to what was just pressed, without ever
                  becoming an alarm. */}
                    {lookSnag && (
                      <p
                        className={styles.lookNote}
                        data-tone={lookSnag.tone}
                        role="status"
                      >
                        <span className={styles.lookMark} aria-hidden="true">
                          {lookSnag.tone === "found"
                            ? "✓"
                            : lookSnag.tone === "miss"
                              ? "?"
                              : "!"}
                        </span>
                        {lookSnag.line}
                      </p>
                    )}
                    {/* Said out loud the moment the request goes out, since a
                  spinning ring says nothing to a screen reader. */}
                    {looking && (
                      <p className={styles.hidden} role="status">
                        Looking the word up…
                      </p>
                    )}
                  </div>
                )}

                {asks.stance && (
                  <fieldset className={styles.group}>
                    <legend className={styles.label}>How sure are you</legend>
                    <div
                      className={styles.chipRow}
                      role="radiogroup"
                      aria-label="How sure are you"
                    >
                      {STANCES.map((value) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={stance === value}
                          data-kind=""
                          className={styles.chip}
                          style={
                            {
                              "--kind": "var(--color-thread)",
                            } as React.CSSProperties
                          }
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
                      Where in the book{" "}
                      <span className={styles.optional}>optional</span>
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
                        onChange={(e) =>
                          setPage(e.target.value.replace(/\D/g, ""))
                        }
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
                          const val = e.target.value.replace(/\D/g, "");
                          if (!val || Number(val) <= 100) setPercent(val);
                        }}
                      />
                    </label>
                  </div>
                </fieldset>

                <DateField
                  label="Kept on"
                  value={keptOn}
                  onChange={setKeptOn}
                  seed={book.id}
                />
              </div>
            </div>

            <footer className={styles.foot} hidden={choosing}>
              {snag && (
                <p className={styles.snag} role="alert">
                  {snag}
                </p>
              )}
              <LeafButton
                className={styles.submit}
                onClick={submit}
                disabled={!ready || busy}
              >
                {editing ? "Save" : "Keep it"}
              </LeafButton>
            </footer>
          </>
        )}
      </Sheet>

      {/* Outside the sheet, not inside it. Both are dialogs in the top layer, so
          this still paints above — but a textarea nested in the sheet's DOM
          would bubble its focus up to the sheet's own keep-the-field-in-view
          listener, which would then scroll the form nobody is looking at. */}
      {asks.text && longhand && (
        <Longhand
          open={room}
          onClose={() => setRoom(false)}
          /* The way back. Caret at the end of the words, the same place this
             page puts it on the way in — a reader who was writing a second ago
             is returned to writing, and the keyboard never leaves. Longhand
             calls this the instant its dialog closes; it says why there. */
          back={() => {
            const box = document.getElementById(textId)
            if (!(box instanceof HTMLTextAreaElement)) return
            box.focus()
            const end = box.value.length
            box.setSelectionRange(end, end)
          }}
          kind={type}
          label={asks.text.label}
          placeholder={asks.text.placeholder}
          value={text}
          onChange={setText}
        />
      )}
    </>
  );
}

export default KeepSheet;
