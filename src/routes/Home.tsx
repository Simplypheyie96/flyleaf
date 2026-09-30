import { Fragment, useEffect, useState } from "react";
import Bunny from "../rabbit/Bunny";
import Face from "../components/Face";
import Sparkle from "../components/Sparkle";
import PaperSurface from "../components/PaperSurface";
import { type Book, type EntryType } from "../data/db";
import {
  useFurthestPages,
  useKeepTotal,
  useKindTally,
  useLibrary,
  useQuoteIds,
  useWords,
} from "../data/useLibrary";
import { useAllSittings } from "../data/sittings";
import { getFace, getHandle } from "../data/reader";
import { KIND, KINDS } from "../journey/kinds";
import Draw, { PREVIEW_BARE, PREVIEW_FIRST } from "./home/Draw";
import Drawer, { drawerHas, weekOf } from "./home/Drawer";
import Nook from "./home/nook/Nook";
import Shelf from "./home/Shelf";
import pageStyles from "./page.module.css";
import styles from "./Home.module.css";

/* Home, on the reader's own shelf.

   It ran on sample data until now — a fixed book and three invented memories
   — which was right while the store was being built and is a lie the moment
   the reader has a shelf of their own. Everything on this screen is now read
   from Dexie: the book they are in the middle of, the last few things they
   kept, and the count under the cover.

   THE GREETING IS THE ONE HANDWRITTEN THING. The brief asks for a personal
   hand on the greeting so the app opens like a journal rather than a
   dashboard; the name is the only place it appears, because handwriting used
   twice stops being a signature. A reader who skipped the name gets the
   greeting without one, which reads perfectly well. */

function partOfDay() {
  const hour = new Date().getHours();
  if (hour < 5) return "Still awake";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** The book to put at the top: the one being read, and failing that the one
    most recently shelved. Started-and-unfinished is the real answer; a reader
    who has not said either way still has a book they added last night.

    IT CAN COME BACK EMPTY, and that is a fix rather than a gap. The last
    fallback used to be `books[0]` — any book at all — which meant a reader who
    had finished everything on their shelf was shown a book they had closed,
    under a heading that said they were currently reading it. Between the shelf
    and the heading, the heading is the thing that has to stay true: no
    unfinished book, no book here. What goes in its place is a state, not a
    blank — see `Idle` below. */
function inTheMiddleOf(books: Book[]): Book | undefined {
  const reading = books.filter((book) => !book.finishedOn);
  const started = reading.filter((book) => book.startedOn);
  return started[0] ?? reading[0];
}

/* BETWEEN BOOKS. A shelf with books on it and nothing open on any of them.

   It is the one state on Home that is genuinely a pause rather than a lack:
   this reader has finished things. So it does not get the language of an empty
   screen, and it does not get a drawing of a book — it gets the rabbit sitting
   up and looking at the heading directly above it, which is the whole reason
   the pose is called `think`. The creature's eyeline runs UP out of the card
   and lands on the words "Currently reading", so the picture and the heading
   are one sentence: *nothing, yet, and we are both waiting on it.*

   Paper rather than a dashed leaf. This is the same slot the hero card lives
   in, and swapping the material as well as the contents would make the section
   look like it had been replaced instead of emptied. */
function Idle() {
  return (
    <PaperSurface rotate={-0.4} className={styles.idle}>
      <Bunny pose="think" size={126} />
      <p className={styles.idleLine}>Nothing open right now.</p>
      <p className={styles.idleHint}>
        Whatever you start next will sit here, with everything you keep from it
        one tap behind the cover.
      </p>
      <button
        type="button"
        className={styles.idleAct}
        onClick={() => {
          window.dispatchEvent(new CustomEvent("flyleaf-find-book", { detail: "" }));
        }}
      >
        Pick the next one
      </button>
    </PaperSurface>
  );
}

/** ❧ — the page's section divider, drawn BETWEEN rows that rendered and
    nowhere else. See the Decisions log: it is a page divider, not card
    furniture. */
function Ornament() {
  return (
    <div className={styles.ornament} aria-hidden="true">
      <span className={styles.ornRule} />
      <span className={styles.ornMark}>❧︎</span>
      <span className={styles.ornRule} />
    </div>
  );
}

/** WHAT YOU HAVE BEEN KEEPING — the reader's own portrait, at the foot.

    It is about the reader rather than about a book, which makes it a closing
    line and not an opening one, so it is the LAST row, on the sky, with no
    frame: one bar in the kinds' own hues, and a legend under it. */
function Keeping({ mix, kept }: { mix: { kind: EntryType; count: number }[]; kept: number }) {
  return (
    <section className={styles.loose} aria-labelledby="keeping">
      <div className={styles.head}>
        <h2 id="keeping" className={styles.headName}>
          What you have been keeping
        </h2>
        <p className={styles.headMeta}>{kept} kept</p>
      </div>
      <div
        className={styles.bar}
        role="img"
        aria-label={mix.map(({ kind, count }) => `${count} ${KIND[kind].many}`).join(", ")}
      >
        {mix.map(({ kind, count }, i) => (
          <span
            key={kind}
            className={styles.band}
            style={
              { "--kind": `var(${KIND[kind].hue})`, "--i": i, flexGrow: count } as React.CSSProperties
            }
          />
        ))}
      </div>
      <ul className={styles.legend}>
        {mix.map(({ kind, count }) => (
          <li
            key={kind}
            className={styles.key}
            style={{ "--kind": `var(${KIND[kind].hue})` } as React.CSSProperties}
          >
            <span className={styles.dot} aria-hidden="true" />
            {count} {count === 1 ? KIND[kind].one : KIND[kind].many}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Home() {
  const books = useLibrary();
  const [name, setName] = useState(getHandle);
  const [face, setFace] = useState(getFace);

  useEffect(() => {
    const sync = () => {
      setName(getHandle());
      setFace(getFace());
    };
    window.addEventListener("flyleaf-reader", sync);
    return () => window.removeEventListener("flyleaf-reader", sync);
  }, []);

  /* `undefined` is Dexie still opening. A shelf must not flash its own empty
     state on the way in — the same rule the Library keeps. */
  const shelf = books ?? [];
  const settled = books !== undefined;
  const book = inTheMiddleOf(shelf);
  /* Every book still open, the freshest first — the deck's pages, in the order
     `inTheMiddleOf` would have picked them.

     UNFINISHED IS THE TEST, NOT STARTED, and it has to match `inTheMiddleOf`
     exactly or books fall down the gap between them: a reader with two books
     going, one shelved without a start date, was once shown one and told
     nothing about the other. */
  const open = book
    ? [book, ...shelf.filter((b) => !b.finishedOn && b.id !== book.id)]
    : [];
  const byId = new Map(shelf.map((b) => [b.id, b]));
  const firstRun = PREVIEW_FIRST || (settled && shelf.length === 0);

  /* What the reader has, under their name. Two counts and a middot — the
     smallest line on the page, and the only one on Home carrying a number
     about them rather than about a book.

     It is nothing until there is something: a masthead that greets you by
     name and then reports "0 books · 0 kept" is the app telling a first-time
     reader they have failed at it before they have started. The first run has
     its own card for that, with a field to do something about it.

     IT ALSO WAITS ON THE KEEPS, not just on the books, and that is a fix for a
     real contradiction rather than a preference. The card below decides it is
     a first run from the drawer being empty; this line decided it from the
     shelf being empty. Shelve five books without keeping anything and the two
     disagreed on screen — a tally reporting five books directly above a card
     asking "what are you reading right now?", which reads as the app having
     forgotten what it just said. Nothing kept, nothing counted: one state,
     one voice. */
  const shelved = shelf.length;
  const total = useKeepTotal();
  const size =
    !firstRun && shelved > 0 && total
      ? `${shelved} ${shelved === 1 ? "book" : "books"} · ${total} kept`
      : null;

  /* What the rows below are made of. Every hook runs on every render, in the
     same order, whichever rows end up drawn. */
  const openIds = open.map((b) => b.id);
  const far = useFurthestPages(openIds);
  const closed = shelf
    .filter((b) => b.finishedOn)
    .sort((a, b) => (b.finishedOn! < a.finishedOn! ? -1 : b.finishedOn! > a.finishedOn! ? 1 : 0));
  const words = useWords() ?? [];
  const week = weekOf(useAllSittings() ?? []);
  const mix = useKindTally(KINDS) ?? [];
  const quoteIds = useQuoteIds();
  /* Nothing kept yet, so nothing dominates. The wash falls back to the quote
     hue rather than to grey — a Home should still be in colour. */
  const dominant = mix[0]?.kind ?? "quote";

  /* THE ROWS, AND THEN THE ❧ BETWEEN THEM. Every emptiness test lives here
     rather than inside the rows, because a row that returns null renders no
     element and the divider above it would be left ruling off a gap. Filter
     first, interleave second.

     Draw's own gates are mirrored exactly: it shows its first-keep card on a
     shelf with nothing kept, a line when there is a quote to pull, and
     nothing at all when there are keeps but no quote among them. */
  const drawShows =
    quoteIds !== undefined && total !== undefined && (total === 0 || quoteIds.length > 0);
  const rows = [
    <section key="reading" aria-labelledby="currently-reading">
      {book && !PREVIEW_BARE ? (
        <Shelf books={open} closed={closed.slice(0, 3)} far={far} />
      ) : (
        /* BETWEEN BOOKS keeps its own tab over the paper it sits on. */
        <div className={styles.stage}>
          <h2 id="currently-reading" className={styles.tab}>
            Currently reading
          </h2>
          <Idle />
        </div>
      )}
    </section>,
    drawShows ? (
      <Draw key="kept" books={byId} reading={book} name="A line you kept" />
    ) : null,
    drawerHas({ words, week, closed }) ? (
      <Drawer key="drawer" words={words} week={week} closed={closed} />
    ) : null,
    /* Not about their library at all, and that is the point — somewhere to
       sit rather than another thing to read. See home/nook/. */
    <Nook key="nook" open={open} />,
    mix.length && total ? <Keeping key="keeping" mix={mix} kept={total} /> : null,
  ].filter(Boolean) as React.ReactElement[];

  return (
    <main className={pageStyles.page}>
      {/* ONE COLUMN AT EVERY WIDTH — and this was tried the other way.

          A desktop pass paired "Currently reading" and "Look what fell out"
          side by side, on nothing better than the fact that two cards fit.
          The owner's verdict killed it, and the reasoning is the layout's own:
          the two cards below them — the nook and the clock — stayed stacked,
          so the page read as one row of two, then a stack, with no rule a
          reader could infer for which pairs and which does not. Home is a
          short vertical list of four unlike things. A wider screen makes the
          list more comfortable to read, not a grid. */}
      <div
        className={styles.column}
        style={{ "--dominant": `var(${KIND[dominant].hue})` } as React.CSSProperties}
      >
        {/* The dominant kind, washed faintly behind the whole page: the one
            place the reader's own mix touches the atmosphere. */}
        <span className={styles.wash} aria-hidden="true" />
        {/* A NAME-PLATE: three lines of type, and the face across from them.

            The words are stacked because the hour and the name do different
            jobs and could not share a size on one line — 13 for the hour, 24 in
            the serif for the name, and a third line of plain fact under it. And
            the face sits at the far edge rather than in front of them, so the
            block reads as a plate with a portrait mounted on it. With one line
            of type that arrangement left a hole in the middle of the row; with
            three there is enough weight on the leading side to hold the span.

            The third line is the smallest thing here and the only number: it
            says how much of this is theirs. A greeting is pleasant and says
            nothing, and it was the whole masthead. */}
        <header className={styles.masthead}>
          <div className={styles.greeting}>
            <p className={styles.hello}>
              {name ? `${partOfDay()},` : `${partOfDay()}.`}
            </p>
            {name && <p className={styles.who}>{name}</p>}
            {size && <p className={styles.tally}>{size}</p>}
          </div>
          {/* Decorative: the name is right beside it, so alt text here would
              read the reader out twice. A reader who skipped the picker gets
              no disc rather than a placeholder one. */}
          {face && (
            <span className={styles.portrait}>
              <Face seed={face} size={48} />
              <Sparkle className={`${styles.sparkle} ${styles.sparkleMast}`} />
            </span>
          )}
        </header>

        {firstRun ? (
          /* NO "CURRENTLY READING" ON A SHELF WITH NOTHING ON IT. It was
             rendering above the first-run card, which is the app telling a
             reader who has never used it what they are in the middle of. A
             first run has one thing on it: the question, and the field to
             answer it in. (It also replaces a thin "Your shelf is waiting"
             card that said the same thing with less to do about it.) */
          <Draw books={byId} opening />
        ) : (
          /* `settled` and not `book`: the section has to render whether or not
             there is a book in progress, because "nothing open" is a state of
             this section rather than a reason to delete it. What must not
             render is the guess made while Dexie is still opening — a shelf
             must not flash its own empty state on the way in. */
          settled &&
          rows.map((row, i) => (
            <Fragment key={row.key}>
              {i ? <Ornament /> : null}
              {row}
            </Fragment>
          ))
        )}

        {/* THE TOUR IS GONE FROM HERE, and it is not moving further down the
            page either. Onboarding happens at the door — Welcome, two panels,
            once, before this screen is ever reached — and a nine-step tour
            card living on Home was a second onboarding for a reader who had
            already been onboarded. Home is the reader's own shelf, not a
            place the app explains itself. (Owner's call; it overrides 07's
            guided-discovery card.) */}
      </div>
    </main>
  );
}

export default Home;
