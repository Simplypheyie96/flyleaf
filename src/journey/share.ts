/* What leaves the app when a reader shares one keep AS WORDS: their own words,
   the book they came from, and nothing else. No link, no app name trailing it,
   no invitation for whoever receives it to install anything. The picture — the
   thing the share button actually opens now — is drawn in `plate.ts`; this is
   what "Copy the words" hands over underneath it, for the places a picture
   cannot go.

   The shape follows the kind, because the kinds are not interchangeable. A
   quote is set in quotation marks and attributed; a character or a place leads
   with its name; a plot thread carries how sure the reader was, since without
   it a hunch reads as a claim. */

import type { Book, Entry } from '../data/db'
import { STANCE } from './kinds'

export function shareText(keep: Entry, book: Book) {
  const where = [keep.chapter, keep.page !== undefined ? `p. ${keep.page}` : null]
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
    case 'character':
    case 'place':
      body = [keep.name, said].filter(Boolean).join(' — ')
      break
    default:
      body = said
  }

  const from = `— ${book.title}, ${book.author}${where ? ` (${where})` : ''}`
  return `${body}\n${from}`
}

/** Words, a name, or a photograph. A voice memo with nothing typed on it is
    the one keep with nothing to send — the recording itself stays on the
    device, and there is no picture to be made of a sound. */
export function shareable(keep: Entry) {
  return Boolean(
    keep.text?.trim() || keep.name?.trim() || keep.media?.type.startsWith('image/'),
  )
}
