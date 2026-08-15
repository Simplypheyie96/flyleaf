/* The look-up behind the vocabulary sheet's one button.

   dictionaryapi.dev — free, no key, CORS-open, English only. The same posture
   as the cover search in books/sources.ts: a public shelf asked politely, and
   any failure treated as "write it yourself" rather than as an error the
   reader has to do something about. Nothing here retries or queues; the reader
   pressed a button, and either a definition comes back in a moment or the hint
   under the box tells them the pen still works.

   It does now remember, and it does now go early — because the wait was the
   whole experience of the feature. A word crosses the Atlantic twice before
   anything appears in the box, and for that second and a bit the sheet has a
   button that says "Looking…" and nothing else to look at. Two things take
   that second away and neither of them makes the shelf work any harder:

   ONE ANSWER PER WORD. Every look-up is remembered for as long as the app is
   open, misses included — "not in the dictionary" is an answer and asking a
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

   The word is never corrected, stemmed or lower-cased beyond what the URL
   needs. If the reader kept "Susurrus" the shelf is asked for "Susurrus", and
   a miss is a miss — guessing at what they meant is how a card ends up
   glossing a different word than its headword. */

/** What one look-up hands back: the definition to put in the box, and the two
    small facts the card sets around the headword. All three are the
    dictionary's exact words — nothing is composed here. */
export interface Sense {
  meaning: string
  phonetic?: string
  pos?: string
}

/* The slice of the response this file reads. The real shape carries audio
   URLs, licenses, synonyms and source links; none of that is kept, so none of
   it is typed. */
interface ApiEntry {
  phonetic?: string
  phonetics?: { text?: string }[]
  meanings?: {
    partOfSpeech?: string
    definitions?: { definition?: string }[]
  }[]
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
}

/* Every word asked for this session, against the flight that answered it.
   Cleared when the app closes, which is the right lifetime: a definition is not
   worth a slot in storage the reader has to live with, and one session is
   already long enough to cover the reader who looks a word up, changes their
   mind about the wording, and looks it up again. */
const asked = new Map<string, Promise<Sense | undefined>>()

/* Case is the reader's business on the card and none of the dictionary's:
   "Susurrus" and "susurrus" are one question, and the map should not fetch
   twice because the first letter was capitalised. What goes in the *URL* is
   still the reader's own spelling — see the note at the top. */
const asking = (word: string) => word.trim().toLowerCase()

/** Long enough that a healthy answer always beats it, short enough that a
    stalled one does not become the reader's problem. */
const PATIENCE = 6000

/** Ask the shelf for one word. Resolves to the first sensible sense, or
    `undefined` when the dictionary has never heard of it — a 404 is an answer,
    not a failure. Everything else (offline, timeouts, the service down)
    throws, and the sheet turns that into its one-line hint.

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

/** The answer for a word if it is already here, wrapped so that "the
    dictionary has never heard of it" and "we have not asked" stay different
    things. Lets the sheet fill its boxes in the same beat the button was
    pressed in: a settled promise still resolves a tick later than the click,
    and one tick is long enough for React to paint "Looking…" and take it away
    again, which is a flicker for no reason. */
export function remembered(word: string): { sense: Sense | undefined } | undefined {
  const key = asking(word)
  return landed.has(key) ? { sense: landed.get(key) } : undefined
}

async function fetchSense(word: string): Promise<Sense | undefined> {
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
  const phonetic = entry.phonetic?.trim() || entry.phonetics?.find((p) => p.text?.trim())?.text?.trim()
  const speech = meaning?.partOfSpeech?.trim().toLowerCase()

  return {
    meaning: definition,
    phonetic: phonetic || undefined,
    pos: speech ? (POS[speech] ?? speech) : undefined,
  }
}
