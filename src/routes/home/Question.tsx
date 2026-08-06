/* TONIGHT'S QUESTION — the home screen as a prompt rather than a record.

   The other two directions show you something. This one asks you something,
   and that is the whole difference: A and B are surfaces you bring writing to,
   and this is a screen that starts the writing itself.

   The problem it is aimed at is the one the brief names — a reader arrives,
   the page is empty, and they do not know where to start. Every empty state in
   this app so far has answered that with an instruction ("Add the first book
   you want to remember"), which tells someone what to press and nothing at all
   about what to think. A question does the opposite. "Who has changed the most
   so far?" cannot be answered with a tap, and answering it in a sentence
   produces exactly the thing this app exists to keep.

   Three decisions worth stating:

     · ONE question, not a list of prompts. A list is a form. The moment there
       are five of them the reader is choosing rather than answering, and
       choosing is the work they came here to avoid.

     · It says why it asked. A question out of nowhere is a quiz; a question
       that says "you have kept three things about Aunt Bel and none since page
       160" is the app having been paying attention. On a first run there is
       nothing to have noticed, so it says that instead, plainly.

     · The answer to the LAST one is under it, in the reader's own hand. That
       closes the loop on the same screen — you can see that answering these
       makes something, rather than being told it will.

   The risk, stated honestly: a prompt that misses is worse than no prompt. A
   question about a character in a book you have not reached yet, or one you
   have already answered twice, makes the app feel like it is guessing. That is
   a store problem rather than a layout one, but it is the thing that would
   sink this direction, so it should not be discovered late.

   Sample content until the entry store lands. Invented, as everything in
   `data/sample.ts` is. */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import PaperSurface from '../../components/PaperSurface'
import LeafButton from '../../components/LeafButton'
import { KIND } from '../../journey/kinds'
import { count } from '../../journey/lexicon'
import styles from './Question.module.css'

const BOOK = {
  id: '111111',
  title: 'The Lantern Season',
  author: 'A. Winters',
  page: 214,
  pages: 502,
}

/** A question and the reason it was asked. The reason is not decoration — see
    the header: without it the screen is a quiz. */
interface Ask {
  text: string
  because: string
}

const ASKS: Ask[] = [
  {
    text: 'Who has changed the most so far?',
    because: 'You have kept four people out of this book and nothing about any of them since page 160.',
  },
  {
    text: 'What do you still not believe?',
    because: 'Two of your open threads are eleven days old.',
  },
  {
    text: 'Which line would you read out loud?',
    because: 'You have not kept a quote from this one yet.',
  },
]

/* The questions a reader with no books sees. They cannot be about a book, so
   they are about reading — which is the only thing known about someone who has
   just opened this app. */
const FIRST_ASK: Ask = {
  text: 'What are you reading right now?',
  because: 'Every evening this asks you one thing about your book. Answering it is how a memory gets kept.',
}

/* What answering one produces, shown as the thing it becomes. Deliberately a
   note rather than a quote: a quote is copied out of the book, and the point
   here is that the words are the reader's own. */
const ANSWERED = {
  ask: 'What did you underline today?',
  answer:
    'The bit where Bel says the lamp keeps itself. She meant it as a joke and nobody laughed.',
  when: 'last night',
}

function Question({ empty }: { empty: boolean }) {
  /* Which question is on the card. Cycled rather than randomised so pressing
     "ask me something else" twice never lands on the same one, and so the lab
     shows the same first card on every reload. */
  const [turn, setTurn] = useState(0)
  const ask = empty ? FIRST_ASK : ASKS[turn % ASKS.length]
  const note = KIND.note

  return (
    <div className={styles.tonight}>
      <PaperSurface tone="thread" rotate={-0.7} className={styles.card}>
        <p className={styles.kicker}>{empty ? 'To begin with' : 'Tonight'}</p>

        {/* Large, but an h2. The page's h1 is the masthead above this card, and
            a second h1 under it would tell a screen reader the page has two
            subjects. Size carries the emphasis; the level carries the truth. */}
        <h2 className={styles.ask}>{ask.text}</h2>

        <p className={styles.because}>{ask.because}</p>

        <div className={styles.acts}>
          <LeafButton
            onClick={() =>
              window.dispatchEvent(new CustomEvent('flyleaf-find-book', { detail: '' }))
            }
          >
            {empty ? '+ Add a book' : 'Answer it'}
          </LeafButton>
          {!empty && (
            <button type="button" className={styles.swap} onClick={() => setTurn((t) => t + 1)}>
              Ask another
            </button>
          )}
        </div>

        {!empty && (
          <p className={styles.where}>
            <Link to={`/book/${BOOK.id}`} className={styles.whereLink}>
              {BOOK.title}
            </Link>
            <span className={styles.sep} aria-hidden="true">·</span>
            page {BOOK.page} of {BOOK.pages}
          </p>
        )}
      </PaperSurface>

      {empty ? (
        /* What is coming, in the questions' own voice. Three of them, greyed
           and unpressable, so a reader who has not added a book can still see
           what this screen is going to be for. */
        <section aria-labelledby="question-coming" className={styles.after}>
          <h2 id="question-coming" className={styles.afterLabel}>
            Then, as you read
          </h2>
          <ul className={styles.coming}>
            {ASKS.map((a) => (
              <li key={a.text} className={styles.comingItem}>
                {a.text}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section aria-labelledby="question-answered" className={styles.after}>
          <h2 id="question-answered" className={styles.afterLabel}>
            What you said {ANSWERED.when}
          </h2>
          <PaperSurface tone="note" rotate={0.6} className={styles.reply}>
            <Link to={`/book/${BOOK.id}`} className={styles.replyLink}>
              <span className={styles.replyAsk}>
                <span className={styles.replyMark} aria-hidden="true">
                  <note.Icon size={14} />
                </span>
                {ANSWERED.ask}
              </span>
              <span className={styles.replyText}>{ANSWERED.answer}</span>
            </Link>
          </PaperSurface>
        </section>
      )}

      {!empty && (
        <p className={styles.foot}>
          {count(9, { one: 'question answered', many: 'questions answered' })} in this book
          <span className={styles.sep} aria-hidden="true">·</span>
          <Link to="/library" className={styles.footLink}>
            your other books
          </Link>
        </p>
      )}
    </div>
  )
}

export default Question
