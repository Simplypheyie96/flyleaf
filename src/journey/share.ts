/* What leaves the app when a reader shares one keep: their own words, the book
   they came from, and nothing else. No link, no app name trailing it, no
   invitation for whoever receives it to install anything.

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

/** A voice memo with nothing typed on it has nothing to put in a message —
    the recording itself stays on the device. */
export function shareable(keep: Entry) {
  return Boolean(keep.text?.trim() || keep.name?.trim())
}

export async function shareKeep(keep: Entry, book: Book) {
  const text = shareText(keep, book)
  try {
    if (navigator.share) await navigator.share({ text })
    else await navigator.clipboard.writeText(text)
  } catch {
    /* Cancelled, or a browser that offers neither. Nothing to report: the
       reader either changed their mind or is looking at the text already. */
  }
}
