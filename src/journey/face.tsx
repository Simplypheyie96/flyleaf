/* The mark that stands for a character: a face.

   Four marks have stood here. An account glyph said nothing. Twelve cut-paper
   silhouettes were one shape twelve times. A stamped initial was a substitute
   for a picture. And a penned bust, drawn from the same nib as the maps, was
   the closest of the four and still wrong: seeded strokes give you a head that
   is technically unique and looks, at 46 pixels, exactly like every other head.
   Two people the reader cannot tell apart is not a portrait system.

   So the face is no longer drawn — it is a photograph. A different medium from
   the maps on purpose: a pen sketch and a photographic portrait sit side by
   side on a real board without either looking broken, and the oval mounts the
   cards already cut were built to hold a picture.

   The pictures come from DiceBear's avataaars set, generated on the device.
   Not the hosted API — the library. Nothing is fetched, nothing is stored, and
   no character's name leaves the phone, which for an app whose whole promise
   is that the reading is private is the only version of this that is allowed.

   Attribution is owed and is not optional: the set is Pablo Stanley's, and
   both the licence text and the credit line ride inside every SVG this file
   produces. The visible credit belongs on the legal page — step 12. */

import { useMemo } from 'react'
import { Avatar as Rendered, Style } from '@dicebear/core'
import definition from '@dicebear/styles/avataaars.json'
import s from './face.module.css'

/* Validating the definition costs ~18ms and building one face costs well under
   one, so the expensive half is paid once and only by a screen that actually
   shows a person. A reader on the shelf with no characters kept never pays. */
let sheet: Style<typeof definition> | undefined
function styleSheet() {
  sheet ??= new Style(definition)
  return sheet
}

/* An article at the front of a name is not what the name is about, and it is
   the one part of a name that says nothing about who has it. Nothing else is
   stripped — "Aunt Bel" is how the reader thinks of her, title and all. */
const ARTICLE = /^(?:the|a|an)\s+/i

/** The name, reduced to the part that identifies a person, so that "aunt bel",
    "Aunt  Bel" and "Aunt Bel" are one face rather than three.

    This goes to the generator as its seed, which makes the face a pure
    function of the name: the same character keeps the same face on every
    device, for ever, with nothing written down anywhere. */
export function nameKey(name: string): string {
  return name.replace(ARTICLE, '').toLocaleLowerCase().replace(/\s+/g, ' ').trim()
}

/* ── Reading the description ───────────────────────────────────────────────

   Everything below answers the obvious complaint about a seeded portrait: the
   reader has just written "grey-haired aunt, keeps the ferry log", and the app
   hands back a twenty-year-old in a hoodie.

   So the words the reader typed narrow the pool before the seed picks from it.
   A cue never *sets* a face — it hands the generator a shortlist, and the name
   still chooses inside it. Two bearded men are two different bearded men.

   This is a word list, not a model. It costs nothing, runs offline, and is
   wrong sometimes; being wrong is meant to cost one tap, which is why the next
   piece of this is a "draw another" control rather than a longer word list.

   One thing is deliberately absent. Skin is left entirely to the seed, because
   a word list that guesses at a person's race from a sentence gets it wrong in
   ways nothing else here does. That belongs to a picker the reader drives. */

type Look = Record<string, unknown>

const GREY = ['#e8e1e1']

/* ── The pool, before anything reads a word ────────────────────────────────

   The set is drawn for profile pictures, so it ships with jokes in it: heart
   eyes, crossed-out eyes, a lolling tongue, a skull printed on a t-shirt. They
   are good jokes and they are the wrong ones here. A reader writes "keeps the
   accounts, and everybody else's secrets" and the app answers with a stoner in
   a skull tee — which is not a near miss, it is the app failing to understand
   what it is for. The seed is allowed to be surprising; it is not allowed to
   be a punchline about somebody's grandmother.

   So the seed picks from a narrower set than the one the library ships. Every
   exclusion below is a variant that would read as a gag on a card that sits
   under a sentence someone wrote in earnest.

   Two exclusions are not about tone. A hijab and a turban are worn on purpose
   by people who mean something by them, and handing one to a character at
   random because their name hashed that way is the same guess the skin colour
   above refuses to make. Both stay reachable, but only when the reader has
   actually written the word. */
const SOBER: Look = {
  /* Only faces at rest. Everything with a reaction in it — startled, weeping,
     winking, asleep — is an expression about a moment, and the card is not a
     moment; it is who somebody is for the length of a book. The reacting ones
     are not deleted, they are moved behind the reader's own words, where an
     alarmed face means the reader wrote "frightened" rather than that the
     hash landed on it. */
  eyesVariant: ['default', 'happy', 'side', 'squint'],
  /* Closed mouths only, which is a smaller set than the names suggest: in this
     library "default" is a wide open oval and "concerned" is an open mouth with
     the tongue showing. Both are drawn to be read at profile-picture size; at
     the 62 pixels these actually occupy, an open mouth stops looking pleased
     and starts looking like shouting, and the app ends up answering "says less
     with every chapter" with somebody mid-yell.

     "sad" reads as closed from its name and is not: it is a small open oval
     turned down at the corners, and at this size the corners vanish and only
     the opening survives. That leaves two mouths that are genuinely shut — a
     soft smile and a level line — which is enough, because the eyes and brows
     below carry the rest of the range. Every open one stays reachable behind a
     word the reader wrote, where an alarmed mouth means they typed
     "frightened". */
  mouthVariant: ['twinkle', 'serious'],
  /* Brows at rest as well. The two angry pairs are a scowl aimed at somebody,
     which is a thing that happens in a scene rather than a thing a person is,
     and the high excited arcs belong to a reaction. The three sloped ones —
     "frownNatural" and both "sadConcerned" — are drawn steep enough to read as
     somebody about to cry, so they go the same way as the open mouths: behind
     the word "grief". "unibrowNatural" is simply a joke: it draws one pale bar
     straight across the forehead. */
  eyebrowsVariant: [
    'default',
    'defaultNatural',
    'flatNatural',
    'raisedExcitedNatural',
    'upDown',
    'upDownNatural',
  ],
  /* The palette ships two colours no person has — a flat orange and a flat
     yellow — and they turn a portrait into a cartoon of one. What is left is
     the full human range, still picked entirely by the seed: the file guesses
     at hair and expression from the reader's words and never at this. */
  skinColor: ['#614335', '#ae5d29', '#d08b5b', '#edb98a', '#ffdbb4'],
  /* Same judgement one shade over: the hair palette carries a pastel pink,
     which is a colour somebody chose in a salon rather than one they were born
     with, and the app has no way of knowing they did. It is still reachable —
     the reader writes "pink hair" and the cue below hands it over. */
  hairColor: [
    '#a55728',
    '#2c1b18',
    '#b58143',
    '#d6b370',
    '#724133',
    '#4a312c',
    '#ecdcbf',
    '#c93305',
    '#e8e1e1',
  ],
  /* Beards draw from their own slot, so the same list has to be said twice or
     the pink comes back on the one in ten faces that has one. */
  facialHairColor: [
    '#a55728',
    '#2c1b18',
    '#b58143',
    '#d6b370',
    '#724133',
    '#4a312c',
    '#ecdcbf',
    '#c93305',
    '#e8e1e1',
  ],
  // The printed graphic goes with the shirt that carries it.
  clothesVariant: [
    'blazerAndShirt',
    'blazerAndSweater',
    'collarAndSweater',
    'hoodie',
    'overall',
    'shirtCrewNeck',
    'shirtScoopNeck',
    'shirtVNeck',
  ],
  /* Hair, and only hair. A hat, a headscarf, a turban, a flower crown and a
     headband are all things a person put on, and the app has no idea whether
     they did. Every one of them is reachable — the reader writes the word and
     the cue below hands it over. None of them is reachable by accident. */
  topVariant: [
    'bigHair',
    'bob',
    'bun',
    'curly',
    'curvy',
    'dreads',
    'dreads01',
    'dreads02',
    'frizzle',
    'fro',
    'longButNotTooLong',
    'miaWallace',
    'shaggy',
    'shaggyMullet',
    'shavedSides',
    'shortCurly',
    'shortFlat',
    'shortRound',
    'shortWaved',
    'sides',
    'straight01',
    'straight02',
    'straightAndStrand',
    'theCaesar',
    'theCaesarAndSidePart',
  ],
}

/* The two shortlists the cues below hand out. Hair, because hair is the only
   lever the set gives — and, on one side, the beard, because the set leaves
   facial hair at a one-in-ten chance for everybody, and one aunt in ten
   arriving with a full grey beard is not a quirk of the seed, it is the app
   contradicting the word the reader just typed. Nothing forces a beard on the
   other side: most men here are clean-shaven, and the ones who are not got
   there the same way they always did. */
const SHE: Look = {
  facialHairProbability: 0,
  topVariant: [
    'bigHair',
    'bob',
    'bun',
    'curly',
    'curvy',
    'dreads',
    'longButNotTooLong',
    'miaWallace',
    'shaggy',
    'shavedSides',
    'straight01',
    'straight02',
    'straightAndStrand',
  ],
}

const HE: Look = {
  topVariant: [
    'dreads01',
    'dreads02',
    'frizzle',
    'fro',
    'shaggyMullet',
    'shortCurly',
    'shortFlat',
    'shortRound',
    'shortWaved',
    'sides',
    'theCaesar',
    'theCaesarAndSidePart',
  ],
}

/* Order is the tiebreak: later cues overwrite earlier ones key by key, so the
   general sits above the specific. "Dark glasses" reads as glasses on the way
   past and lands on sunglasses. */
const CUES: [RegExp, Look][] = [
  /* -- Who the reader is talking about, which they have almost always already
        said: "the younger brother", "Aunt Bel", "she never comes back". This
        is the mismatch a reader notices in the first second — a card headed
        "the younger brother" carrying long blonde hair and a pink blazer is
        the app visibly not reading. The set has no such setting, so the only
        lever is hair, and hair is all this touches.

        Pronouns first, nouns second, because the noun is the one doing the
        describing: in "her brother" the person on the card is the brother.

        This is a guess from a word and it is wrong sometimes, in both
        directions and for people whom neither list describes. Wrong is meant
        to cost one tap. */
  [/\b(?:she|her|hers)\b/, SHE],
  [/\b(?:he|him|his)\b/, HE],
  [
    /\b(?:woman|women|girl|lady|mother|mum|mom|daughter|sister|aunt|niece|grandmother|grandma|granny|widow|wife|queen|actress|waitress|maid|nun|mistress)\b/,
    SHE,
  ],
  [
    /\b(?:man|men|boy|lad|gentleman|father|dad|son|brother|uncle|nephew|grandfather|grandpa|widower|husband|king|priest|monk|sailor|fisherman)\b/,
    HE,
  ],

  // -- Age, before any explicit colour gets a chance to overrule it.
  [
    /\b(?:old|elderly|aged|ageing|aging|grandmother|grandfather|grandma|grandpa|granny|widow|widower)\b/,
    { hairColor: GREY, facialHairColor: GREY },
  ],

  // -- Hair, as a colour.
  [/\b(?:red[- ]haired|ginger|auburn)\b/, { hairColor: ['#c93305'] }],
  [/\b(?:blond|blonde|fair[- ]haired|golden[- ]haired)\b/, { hairColor: ['#d6b370', '#b58143'] }],
  [
    /\b(?:brown|chestnut|sandy)\s+(?:hair|curls|locks|braids)\b/,
    { hairColor: ['#a55728', '#724133'] },
  ],
  [/\b(?:black|dark|jet[- ]black)\s+(?:hair|curls|locks|braids)\b/, { hairColor: ['#2c1b18'] }],
  /* Dyed, so it has to be said. The seed cannot reach this one on its own —
     someone standing in a novel with candy-pink hair got there on purpose, and
     the reader is the only one who knows whether they did. */
  [/\b(?:pink|dyed)[- ](?:hair|haired|curls|locks|braids|bob|crop)\b/, { hairColor: ['#f59797'] }],
  [
    /\b(?:grey|gray|silver|white)[- ]?(?:haired|hair)\b/,
    { hairColor: GREY, facialHairColor: GREY },
  ],

  // -- Hair, as a shape.
  [/\b(?:curly|curls|ringlets)\b/, { topVariant: ['curly', 'shortCurly', 'fro', 'frizzle'] }],
  [/\b(?:dreads|dreadlocks|locs)\b/, { topVariant: ['dreads', 'dreads01', 'dreads02'] }],
  [/\b(?:bun|chignon|topknot)\b/, { topVariant: ['bun'] }],
  [/\bbob\b/, { topVariant: ['bob'] }],
  [
    /\blong\s+(?:hair|curls|braids)\b/,
    {
      topVariant: ['longButNotTooLong', 'straight01', 'straight02', 'bigHair', 'curvy'],
    },
  ],
  /* No variant in the set is properly bald, so a shaved head is the nearest
     true thing rather than a wrong one. A reader who wants bald wants the
     picker, and that is the honest answer. */
  [
    /\b(?:shaved|balding|bald|buzz[- ]?cut|crew[- ]?cut|close[- ]cropped|cropped)\b/,
    { topVariant: ['shavedSides', 'theCaesar', 'shortFlat'] },
  ],

  // -- Things worn on the head, which replace hair rather than sit on it.
  [/\b(?:hat|cap|bowler|fedora)\b/, { topVariant: ['hat', 'winterHat1', 'winterHat02'] }],
  [/\bturban\b/, { topVariant: ['turban'] }],
  [/\b(?:hijab|headscarf|veil)\b/, { topVariant: ['hijab'] }],

  /* -- The face itself. Both of these sit at 10% by default, so a cue has to
        say "certainly" as well as "which". */
  [
    /\bbeard(?:ed)?\b/,
    {
      facialHairProbability: 100,
      facialHairVariant: ['beardMedium', 'beardLight', 'beardMajestic'],
    },
  ],
  [
    /\b(?:moustache|mustache|whiskers)\b/,
    {
      facialHairProbability: 100,
      facialHairVariant: ['moustacheFancy', 'moustacheMagnum'],
    },
  ],
  [/\bclean[- ]shaven\b/, { facialHairProbability: 0 }],
  [
    /\b(?:glasses|spectacles|specs|bespectacled|monocle)\b/,
    {
      accessoriesProbability: 100,
      accessoriesVariant: ['prescription01', 'prescription02', 'round'],
    },
  ],
  [
    /\b(?:sunglasses|shades|dark glasses)\b/,
    {
      accessoriesProbability: 100,
      accessoriesVariant: ['sunglasses', 'wayfarers'],
    },
  ],
  [
    /\b(?:eyepatch|eye patch|one eye)\b/,
    { accessoriesProbability: 100, accessoriesVariant: ['eyepatch'] },
  ],

  /* -- What the reader thinks of them, which is the whole reason they wrote
        anything down. Expression is the part of a face a reader remembers. */
  [
    /\b(?:angry|furious|cruel|vicious|brutal|rage|temper)\b/,
    {
      eyebrowsVariant: ['angry', 'angryNatural'],
      mouthVariant: ['serious', 'grimace'],
    },
  ],
  [
    /\b(?:stern|severe|grim|strict|humourless|humorless|forbidding)\b/,
    { eyebrowsVariant: ['flatNatural', 'default'], mouthVariant: ['serious'] },
  ],
  [
    /\b(?:sad|grief|grieving|mourning|sorrow|weeping|lonely|bereft|melancholy)\b/,
    {
      eyebrowsVariant: ['sadConcerned', 'sadConcernedNatural'],
      mouthVariant: ['sad'],
    },
  ],
  [
    /\b(?:afraid|frightened|terrified|nervous|anxious|haunted)\b/,
    {
      eyebrowsVariant: ['sadConcerned'],
      eyesVariant: ['surprised'],
      mouthVariant: ['concerned'],
    },
  ],
  [
    /\b(?:tired|weary|exhausted|worn|ill|dying)\b/,
    { eyesVariant: ['squint', 'closed'], mouthVariant: ['serious'] },
  ],
  [
    /\b(?:kind|kindly|warm|gentle|generous|friendly|cheerful|laughing|merry)\b/,
    {
      eyebrowsVariant: ['defaultNatural', 'raisedExcitedNatural'],
      eyesVariant: ['happy', 'default'],
      mouthVariant: ['smile', 'twinkle'],
    },
  ],
  [
    /\b(?:sly|cunning|scheming|sardonic|wry|mischievous|smirk)\b/,
    { eyesVariant: ['side', 'wink'], mouthVariant: ['twinkle'] },
  ],

  // -- What they do, which in a novel is usually what they wear.
  [
    /\b(?:soldier|captain|officer|lawyer|banker|clerk|detective|inspector|magistrate|doctor)\b/,
    { clothesVariant: ['blazerAndShirt', 'blazerAndSweater'] },
  ],
  [
    /\b(?:scholar|student|teacher|professor|librarian|tutor|priest)\b/,
    { clothesVariant: ['collarAndSweater', 'blazerAndSweater'] },
  ],
  [
    /\b(?:farmer|fisherman|sailor|labourer|laborer|miner|mechanic|gardener|cook)\b/,
    { clothesVariant: ['overall'] },
  ],
]

/** What the reader's own sentence asks for, if it asks for anything. */
function readLook(note: string): Look {
  const words = note.toLocaleLowerCase()
  const look: Look = {}
  for (const [cue, hint] of CUES) {
    if (cue.test(words)) Object.assign(look, hint)
  }
  /* A grey-haired man with a brown beard is a bug, not a person. Wherever the
     description settled the hair and said nothing about the beard, the beard
     follows the hair. */
  if (look.hairColor && !look.facialHairColor) look.facialHairColor = look.hairColor
  return look
}

/* Faces are pure, so the only reason to build one twice is that nobody kept
   the first. Keyed on both halves of the input: renaming a character, or
   rewriting what is known about them, is a different person's picture. */
const KEPT = new Map<string, string | null>()

/* Null is a kept answer too. The generator checks what it is handed and throws
   when it does not like it, and an exception thrown inside render takes the
   whole journey down with it: a reader would lose the page their book was on
   because a word list asked for a hairstyle the set does not have. That is the
   wrong price for a wrong face. A picture that cannot be drawn is a plate left
   empty, which is a state every mount already draws, and keeping the failure
   stops a bad description being attempted again on every pass. */
function portrait(key: string, note: string | undefined, face: number): string | null {
  /* Joined on a character no name and no sentence can contain, so that a
     rename and a rewrite cannot collide into one key. */
  const id = `${key}${String.fromCharCode(0)}${note ?? ''}${String.fromCharCode(0)}${face}`
  let src = KEPT.get(id)
  if (src === undefined) {
    src = draw(key, note, face)
    KEPT.set(id, src)
  }
  return src
}

function draw(key: string, note: string | undefined, face: number): string | null {
  try {
    return new Rendered(styleSheet(), {
      /* The name is the seed, so the same person is the same face everywhere
         they appear without a single byte being stored for it. `face` is how
         many times the reader has pressed "another face" — nothing at zero, so
         every character ever kept keeps the picture it already had. Each press
         is a different string and therefore a different draw from the same
         pool, which is the whole mechanism: no list to pick from, no preview
         to compare, one button that means "not that one". */
      seed: face ? `${key} ${face}` : key,
      /* The canvas is square and the head starts an eighth of the way down it,
         so an oval mount taller than it is wide crops the sides and leaves a
         band of nothing above the hair. A little scale closes the band.

         A multiplier, not a percentage: the generator takes 0 to 10, so 108 is
         not "a hundred and eight per cent" — it is a validation error, and a
         validation error is no face anywhere in the app. */
      scale: 1.08,
      ...SOBER,
      /* The name is read for cues as well as the sentence under it, because
         "The younger brother" and "Aunt Bel" are where the reader said the
         most useful thing about the person and never said it twice. */
      ...readLook(`${key} ${note ?? ''}`),
    }).toDataUri()
  } catch {
    return null
  }
}

interface FaceProps {
  /** Already known to be non-empty: the shim next door refuses to load this
      module at all without a name, so there is no empty case to draw here. */
  name: string
  /** What the reader wrote about this person. Read for cues, never shown. */
  note?: string
  /** How many times the reader has asked for a different face. Absent is the
      face the name draws on its own, which is what most characters keep. */
  face?: number
}

/** The person, filling whatever it is mounted in. The mount — its shape, its
    fill, its ring — belongs to the card, which is how one picture can be a
    small oval pressed into a journey card and a portrait plate on another.

    It fills rather than sits inside, because it is a bust and a bust runs off
    the bottom of its own frame; a figure floating with air all round it is a
    sticker. Whatever mounts it has to clip, and every mount here does. */
export default function Face({ name, note, face = 0 }: FaceProps) {
  const src = useMemo(() => portrait(nameKey(name), note, face), [name, note, face])
  if (!src) return null
  /* Empty alt on purpose. Every mount in the app sits beside the name it is a
     picture of, so a screen reader that announced the face as well would read
     the person's name twice and call the second one an image. */
  return <img className={s.figure} src={src} alt="" draggable={false} />
}
