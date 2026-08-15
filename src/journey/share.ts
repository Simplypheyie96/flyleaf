/* What leaves the app when a reader shares one keep AS WORDS: their own words,
   the book they came from, and the press underneath. No link and no invitation
   to install anything — the last line is a colophon, not a call to action, and
   it is set off by a blank one so it reads as a signature under the
   attribution rather than as a third line of it. The picture — the thing the
   share button actually opens now — is drawn in `plate.ts`; this is what "Copy
   the words" hands over underneath it, for the places a picture cannot go.

   The shape follows the kind, because the kinds are not interchangeable. A
   quote is set in quotation marks and attributed; a word, a character or a
   place leads with its name; a plot thread carries how sure the reader was, since without
   it a hunch reads as a claim. */

import type { Book, Entry } from '../data/db'
import { IMPRINT } from '../brand/imprint'
import { STANCE } from './kinds'

export function shareText(keep: Entry, book: Book) {
  const where = [
    keep.chapter,
    keep.page !== undefined ? `p. ${keep.page}` : null,
    keep.percent !== undefined ? `${keep.percent}%` : null,
  ]
    .filter(Boolean)
    .join(', ')
  const said = keep.text?.trim() ?? ''

  let body: string
  switch (keep.type) {
    case 'quote':
      body = `“${said}”`
      break
    case 'thread':
      body = [keep.name, said].filter(Boolean).join(' — ')
      body = keep.stance ? `${body}\n(${STANCE[keep.stance].label})` : body
      break
    case 'vocabulary':
    case 'character':
    case 'place':
      body = [keep.name, said].filter(Boolean).join(' — ')
      break
    default:
      body = said
  }

  const from = `— ${book.title}, ${book.author}${where ? ` (${where})` : ''}`
  return `${body}\n${from}\n\n${IMPRINT}`
}

/** Words, a name, or a photograph. A voice memo with nothing typed on it is
    the one keep with nothing to send — the recording itself stays on the
    device, and there is no picture to be made of a sound. */
export function shareable(keep: Entry) {
  return Boolean(
    keep.text?.trim() || keep.name?.trim() || keep.media?.type.startsWith('image/'),
  )
}
