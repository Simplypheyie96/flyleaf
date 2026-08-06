/* THE CANDIDATES FOR THE HOME SCREEN — the list, and the one place it lives.

   Three whole home screens rather than three layouts of one section, because
   the question being decided is not "what goes under Currently reading" — it
   is what a reader is looking at when they open this app. The section that
   used to sit there was a reverse-chronological feed of the reader's own
   entries, which had three faults at once: it repeated what the book page
   already shows better, it drew the same seven objects in a second card
   language, and on a first run it had nothing in it at all.

   Each direction answers a different question, which is what makes them
   directions rather than variations:

     A  what is this book's world       — the cast, the places, the questions
     B  where do I write                — a blank ruled page, and the pile
     C  what should I think about       — one question, and what it produced

   All three take the same prop and nothing else. `empty` is a reader who has
   no books yet, and every direction has to hold in that state IN THE SAME
   FRAME — not vanish and hand the page to a welcome card. That rule is why
   there is no fourth argument here: a direction that needs to know anything
   else about the reader is a direction that will not survive contact with the
   store.

   /lab/home builds its frames from this list, so putting a new candidate in
   front of a reader is a row here and a component beside it — never an edit to
   the workbench. The whole file comes out when a direction is chosen. */

import type { ComponentType } from 'react'
import Board from './Board'
import Flyleaf from './Flyleaf'
import Question from './Question'

export type HomeDirection = 'a' | 'b' | 'c'

export const HOME_DIRECTIONS: {
  id: HomeDirection
  name: string
  blurb: string
  Body: ComponentType<{ empty: boolean }>
}[] = [
  {
    id: 'a',
    name: 'The board',
    blurb:
      'The book’s world pinned up — faces, maps and open questions — with one turned face up each day.',
    Body: Board,
  },
  {
    id: 'b',
    name: 'The flyleaf',
    blurb:
      'A blank ruled page with the pen on the first line, and the leaves already written on stacked under it.',
    Body: Flyleaf,
  },
  {
    id: 'c',
    name: 'Tonight’s question',
    blurb:
      'One question about what you are reading, and the answer you gave to the last one.',
    Body: Question,
  },
]

/** The direction named by `?home=`, or nothing if the value is not one. */
export function directionFor(value: string | null) {
  return HOME_DIRECTIONS.find((d) => d.id === value) ?? null
}

/* True when this document is one of the lab's frames.

   The app has two things that legitimately cover the top and bottom of the
   home screen — the nine-card first-page tour and the "save a copy" nudge —
   and in a 375-wide frame they between them hide most of what is being
   compared. A reader deciding between three home screens is not deciding
   about the tour, so the frames run without either.

   Read off `window.location` rather than passed down, because the nudge lives
   outside the router's tree in App.tsx. Comes out with the losing directions;
   nothing outside a `?home=` frame is affected. */
export function isCandidateFrame() {
  return new URLSearchParams(window.location.search).has('home')
}
