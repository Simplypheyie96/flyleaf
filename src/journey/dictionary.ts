/* The look-up behind the vocabulary sheet's one button.

   Three free shelves, no key, no account, CORS-open, English only. The same
   posture as the cover search in books/sources.ts: public shelves asked
   politely, and any failure treated as "write it yourself" rather than as an
   error the reader has to do something about. Nothing here retries or queues;
   the reader pressed a button, and either a definition comes back in a moment
   or the hint under the box tells them the pen still works.

   WHY THREE. One shelf was one shelf's worth of words. dictionaryapi.dev is a
   good general English dictionary and it has never heard of half of what a
   reader actually stops to look up — the rare literary word, the term of art,
   the proper noun a novel is named after. So:

     • dictionaryapi.dev, first, because it is the only one that carries a
       pronunciation and a part of speech as well as a meaning.
     • Wiktionary, beside it, which is far larger and much stranger, and knows
       archaic, dialect and technical senses no compact dictionary carries.
     • Wikipedia, last and only when both have missed, for the words that are
       not really words — places, people, movements, the name of a ship. It is
       held to a title match so it cannot answer a question it was not asked.

   AND THEN, IF NOTHING, THE WORD BENT BACK. A reader keeps the word as the
   page gave it to them — "susurrating", "gyres", "belied" — and no dictionary
   has a headword for an inflected form. So on a miss, and only on a miss, a
   short list of plausible base forms is tried. This overturns a decision this
   file used to record the other way, and the objection behind it was right:
   guessing at what somebody meant is how a card ends up glossing a different
   word than its headword. The answer is not to stop guessing but to stop
   hiding it — a stemmed answer comes back with `from` set to the headword it
   actually belongs to, and the sheet says so in a line under the box. The
   reader is never told "susurrating" means something; they are told the entry
   found was "susurrate".

   ONE ANSWER PER WORD. Every look-up is remembered for as long as the app is
   open, misses included — "not in any of them" is an answer and asking a
   second time will not change it. The promise itself is what is kept, not the
   result, so two asks that overlap in time become one request rather than a
   race: the reader who presses the button while the warm-up below is still in
   the air joins that flight instead of booking another. Only failures are
   forgotten, since the network being down a moment ago is no reason to refuse
   to try when it comes back.

   ASK BEFORE ASKING. `warm` runs the same look-up with the answer thrown
   away, so the sheet can start fetching while the reader is still moving their
   thumb toward the button. By the time it is pressed the answer is usually
   already in the map and the box fills in the same frame — no spinner, no
   "Looking…", nothing to wait for. It is fired once per finished word rather
   than once per keystroke: a warm-up per letter would put nine requests on a
   free service to answer one question, which is not asking politely.

   AND GIVE UP IN GOOD TIME. A fetch with no deadline can hang for as long as
   the phone's radio is willing to pretend, and on a train that is far longer
   than anyone will sit and watch a button. Six seconds is well past a healthy
   answer and well short of the reader's patience; past it the hint appears and
   the pen is right there.

   The reader's own spelling is what goes into every URL. Case is folded, since
   no shelf cares and the cache should not fetch twice over a capital letter,
   but nothing else about the word is touched until every shelf has said no. */

/** What one look-up hands back: the definition to put in the box, and the
    small facts the card sets around the headword. The words are the
    dictionary's own — nothing here is composed. */
export interface Sense {
  meaning: string
  phonetic?: string
  pos?: string
  /** The headword this meaning actually belongs to, set only when it is not
      the word the reader typed — a base form found after the exact spelling
      missed, or the title of the article that answered. The sheet shows it, so
      an entry is never quietly glossed as something it is not. */
  from?: string
}

/* The slice of the dictionaryapi.dev response this file reads. The real shape
   carries audio URLs, licenses, synonyms and source links; none of that is
   kept, so none of it is typed. */
interface ApiEntry {
  phonetic?: string
  phonetics?: { text?: string }[]
  meanings?: {
    partOfSpeech?: string
    definitions?: { definition?: string }[]
  }[]
}

/* Wiktionary's definition endpoint, keyed by language code. */
interface WiktionaryPart {
  partOfSpeech?: string
  language?: string
  definitions?: { definition?: string }[]
}

interface WikiPage {
  index?: number
  title?: string
  extract?: string
}

/* A dictionary column abbreviates; a card that says "noun" under a headword
   reads as a grammar lesson. Anything the map does not know keeps the
   dictionary's own word, which is at worst honest. */
const POS: Record<string, string> = {
  noun: 'n.',
  verb: 'v.',
  adjective: 'adj.',
  adverb: 'adv.',
  pronoun: 'pron.',
  preposition: 'prep.',
  conjunction: 'conj.',
  interjection: 'interj.',
  exclamation: 'excl.',
  determiner: 'det.',
  'proper noun': 'n.',
  participle: 'v.',
  numeral: 'num.',
}

const shorten = (speech: string | undefined) => {
  const word = speech?.trim().toLowerCase()
  return word ? (POS[word] ?? word) : undefined
}

/* Every word asked for this session, against the flight that answered it.
   Cleared when the app closes, which is the right lifetime: a definition is not
   worth a slot in storage the reader has to live with, and one session is
   already long enough to cover the reader who looks a word up, changes their
   mind about the wording, and looks it up again. */
const asked = new Map<string, Promise<Sense | undefined>>()

/* Case is the reader's business on the card and none of the dictionary's:
   "Susurrus" and "susurrus" are one question, and the map should not fetch
   twice because the first letter was capitalised. */
const asking = (word: string) => word.trim().toLowerCase()

/** Long enough that a healthy answer always beats it, short enough that a
    stalled one does not become the reader's problem. */
const PATIENCE = 6000

/** Ask the shelves for one word. Resolves to the first sensible sense, or
    `undefined` when none of them has ever heard of it — a 404 is an answer,
    not a failure. Only a shelf that could not be reached at all throws, and
    the sheet turns that into its one-line hint.

    Answers are remembered, so the second ask for a word returns in the same
    frame the button was pressed in, and an ask that lands while an earlier one
    is still in the air joins it rather than starting a second. */
export function lookUp(word: string): Promise<Sense | undefined> {
  const key = asking(word)
  if (!key) return Promise.resolve(undefined)

  const already = asked.get(key)
  if (already) return already

  /* A failure is forgotten. The reader who pressed the button in a tunnel
     should get a real attempt when they press it again on the platform, and a
     remembered rejection would hand them the tunnel's answer forever. */
  const flight = fetchSense(word).then(
    (sense) => {
      landed.set(key, sense)
      return sense
    },
    (err) => {
      asked.delete(key)
      throw err
    },
  )
  asked.set(key, flight)
  return flight
}

/** Start the look-up now and throw the answer away — the reader has finished
    typing a word and has not yet decided whether they want it defined. If they
    do, `lookUp` finds the flight already in the air or already landed. Failures
    are swallowed whole: nobody asked for this one, so nobody is owed a hint. */
export function warm(word: string): void {
  if (asking(word)) void lookUp(word).catch(() => {})
}

/* What has already landed, kept separately from the flights above because a
   promise cannot be read without waiting on it, and waiting — even for the one
   tick a settled promise costs — is a render. See `remembered`. */
const landed = new Map<string, Sense | undefined>()

/** The answer for a word if it is already here, wrapped so that "no shelf has
    heard of it" and "we have not asked" stay different things. Lets the sheet
    fill its boxes in the same beat the button was pressed in: a settled promise
    still resolves a tick later than the click, and one tick is long enough for
    React to paint "Looking…" and take it away again, which is a flicker for no
    reason. */
export function remembered(word: string): { sense: Sense | undefined } | undefined {
  const key = asking(word)
  return landed.has(key) ? { sense: landed.get(key) } : undefined
}

/** Whether a look-up failed because nothing could be reached, rather than
    because a shelf answered badly. The sheet has to tell these apart, because
    they are opposite news dressed as the same sentence: a word no shelf
    carries is the reader's to write, while a word nobody answered about may
    well be in there and is worth asking again in a moment. Folding the second
    into the first is the app calling a real word imaginary.

    A timeout, a dropped connection, and the both-shelves-down throw in
    `bothDictionaries` all mean the same thing to the person holding the phone
    — the network, not the language. */
export function unreachable(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  return (
    err.name === 'TimeoutError' ||
    err.name === 'AbortError' ||
    err.message === 'No dictionary could be reached' ||
    /failed to fetch|networkerror|load failed|network request failed/i.test(err.message)
  )
}

/* ── The order of asking ──────────────────────────────────────────────────── */

async function fetchSense(word: string): Promise<Sense | undefined> {
  const exact = await bothDictionaries(word)
  if (exact) return exact

  /* Only now, and only for the spellings a dictionary plausibly files
     differently. Every candidate goes at once rather than in turn: three words
     in sequence is three round trips stacked on top of the two that already
     missed, which is well past the point where the reader has given up and
     started typing their own meaning. */
  const bent = baseForms(word)
  if (bent.length) {
    const tries = await Promise.all(
      bent.map((form) => bothDictionaries(form).catch(() => undefined)),
    )
    /* In candidate order, not in the order they came back — the list is
       written most-likely first, and a race would make the answer depend on
       which server happened to be quickest. */
    for (let at = 0; at < tries.length; at += 1) {
      const found = tries[at]
      if (found) return { ...found, from: bent[at] }
    }
  }

  /* The last shelf, and a different kind of thing: an encyclopaedia, for the
     words a dictionary is right not to carry. Its failures are swallowed
     rather than thrown: to have got this far both dictionaries must have been
     reached and must have said no, and that is a miss — "write it yourself" —
     not the "nobody answered, you may be offline" that a throw from here would
     put on the screen. */
  return askWikipedia(word).catch(() => undefined)
}

/** The two real dictionaries, asked together. Resolves to `undefined` when
    both have simply never heard of the word, and throws only when neither
    could be reached — the difference the sheet's two different hints turn on. */
async function bothDictionaries(word: string): Promise<Sense | undefined> {
  const shelves = await Promise.allSettled([askDictionaryApi(word), askWiktionary(word)])
  if (shelves.every((shelf) => shelf.status === 'rejected')) {
    throw new Error('No dictionary could be reached')
  }
  for (const shelf of shelves) {
    if (shelf.status === 'fulfilled' && shelf.value) return shelf.value
  }
  return undefined
}

/* ── The shelves ──────────────────────────────────────────────────────────── */

async function askDictionaryApi(word: string): Promise<Sense | undefined> {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim())}`
  const res = await fetch(url, { signal: AbortSignal.timeout(PATIENCE) })
  if (res.status === 404) return undefined
  if (!res.ok) throw new Error(`Dictionary ${res.status}`)
  const body = (await res.json()) as ApiEntry[]

  const entry = body[0]
  if (!entry) return undefined

  /* First meaning with an actual definition in it. The API fronts the most
     common sense, which is the right one for a reader who met the word once
     on a page — the fourth archaic sense is theirs to go digging for. */
  const meaning = entry.meanings?.find((m) => m.definitions?.[0]?.definition?.trim())
  const definition = meaning?.definitions?.[0]?.definition?.trim()
  if (!definition) return undefined

  /* The top-level phonetic is sometimes empty while a variant carries one. */
  const phonetic =
    entry.phonetic?.trim() || entry.phonetics?.find((p) => p.text?.trim())?.text?.trim()

  return {
    meaning: definition,
    phonetic: phonetic || undefined,
    pos: shorten(meaning?.partOfSpeech),
  }
}

/** Wiktionary's own definition endpoint — the same data the site renders,
    already split by language and part of speech, which saves parsing a wiki
    page. Definitions arrive as fragments of HTML and are flattened to text. */
async function askWiktionary(word: string): Promise<Sense | undefined> {
  const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word.trim())}`
  const res = await fetch(url, { signal: AbortSignal.timeout(PATIENCE) })
  if (res.status === 404) return undefined
  if (!res.ok) throw new Error(`Wiktionary ${res.status}`)
  const body = (await res.json()) as Record<string, WiktionaryPart[]>

  const parts = body.en
  if (!parts?.length) return undefined

  for (const part of parts) {
    for (const entry of part.definitions ?? []) {
      const meaning = plain(entry.definition)
      /* Wiktionary's first line for an inflected form is a grammar note —
         "plural of gyre" — which is a fact about the word, not a meaning. Left
         in, the card would gloss a word with a cross-reference. */
      if (!meaning || meaning.length < 3 || /^(plural|past|present|third-person|simple past|inflection|alternative (form|spelling)) /i.test(meaning)) {
        continue
      }
      return { meaning, pos: shorten(part.partOfSpeech) }
    }
  }
  return undefined
}

/** The encyclopaedia, for the words that are really names. Held to a title
    match on purpose: Wikipedia's search will cheerfully answer any string with
    its best guess, and a card that glosses "susurrus" as a village in Latvia
    is worse than a card with an empty meaning box. */
async function askWikipedia(word: string): Promise<Sense | undefined> {
  const wanted = word.trim().toLowerCase()
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&origin=*&format=json' +
    '&generator=search&gsrlimit=4&prop=extracts&exintro=1&explaintext=1&exsentences=2&exlimit=4' +
    `&gsrsearch=${encodeURIComponent(word.trim())}`
  const res = await fetch(url, { signal: AbortSignal.timeout(PATIENCE) })
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`)
  const body = (await res.json()) as { query?: { pages?: Record<string, WikiPage> } }

  /* Pages come back keyed by page id rather than by rank, so search order only
     survives in `index`. */
  const pages = Object.values(body.query?.pages ?? {}).sort(
    (a, b) => (a.index ?? 0) - (b.index ?? 0),
  )

  for (const page of pages) {
    const title = page.title?.trim()
    const extract = page.extract?.trim()
    if (!title || !extract) continue
    /* "Akihabara (disambiguation)" and "Akihabara" are the same answer to the
       reader; anything else is a different question. */
    const bare = title.replace(/\s*\([^)]*\)\s*$/, '').toLowerCase()
    if (bare !== wanted) continue
    return {
      meaning: extract.replace(/\s+/g, ' '),
      from: title.toLowerCase() === wanted ? undefined : title,
    }
  }
  return undefined
}

/* ── Small helpers ────────────────────────────────────────────────────────── */

/** Wiktionary hands back definitions as HTML fragments full of links and
    italics. Parsed rather than regexed: a fragment is real markup, and the
    parser is the thing that already knows how to read it. Nothing is inserted
    into the document, so nothing in the fragment can run. */
function plain(html: string | undefined): string | undefined {
  if (!html) return undefined
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const text = doc.body.textContent?.replace(/\s+/g, ' ').trim()
  return text || undefined
}

/** Plausible headwords for an inflected spelling, most likely first. Kept
    deliberately short and dumb: this is not a stemmer, it is a handful of
    English's most common endings undone, and anything it gets wrong is
    labelled with `from` rather than passed off as the reader's word. Three at
    most, because each one costs two requests on shelves that are lending them
    for free. */
function baseForms(word: string): string[] {
  const w = word.trim().toLowerCase()
  if (w.length < 4 || /[^a-z-]/.test(w)) return []

  const out: string[] = []
  const add = (form: string) => {
    if (form.length > 2 && form !== w && !out.includes(form)) out.push(form)
  }

  if (w.endsWith('ies')) add(`${w.slice(0, -3)}y`)
  if (w.endsWith('ing')) {
    const stem = w.slice(0, -3)
    add(`${stem}e`)
    add(stem)
    add(undouble(stem))
  } else if (w.endsWith('ed')) {
    add(w.slice(0, -1))
    add(w.slice(0, -2))
    add(undouble(w.slice(0, -2)))
  } else if (w.endsWith('es')) {
    add(w.slice(0, -1))
    add(w.slice(0, -2))
  } else if (w.endsWith('s') && !w.endsWith('ss')) {
    add(w.slice(0, -1))
  } else if (w.endsWith('ly')) {
    add(w.slice(0, -2))
  }

  return out.slice(0, 3)
}

/** "runn" → "run". English doubles the final consonant before -ing and -ed,
    and undoing it is the difference between finding a word and not. */
function undouble(stem: string): string {
  const last = stem.at(-1)
  return last && last === stem.at(-2) && !'aeiou'.includes(last) ? stem.slice(0, -1) : stem
}
