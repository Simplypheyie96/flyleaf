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

   The pictures come from DiceBear's toon-head set, generated on the device.
   Not the hosted API — the library. Nothing is fetched, nothing is stored, and
   no character's name leaves the phone, which for an app whose whole promise
   is that the reading is private is the only version of this that is allowed.

   The set was avataaars first. Both are flat vector busts and both would have
   worked; this one is drawn with a heavier line and a warmer, fuller palette,
   which sits closer to the hand-made keepsake the rest of the journey is going
   for than avataaars' thinner web-illustration line did. It costs two things
   worth naming, because they are the reason a couple of cues below went away:
   the set has no glasses, no hats and no headscarves at all — there is no
   accessories layer to hang them on — and its hair is split into a front piece
   and a piece behind the head, which is what carries long hair here.

   Attribution is owed and is not optional: the set is Johan Melin's "ToonHead"
   under CC BY 4.0, and both the licence text and the credit line ride inside
   every SVG this file produces. The visible credit belongs on the legal page —
   step 12. */

import { useMemo } from 'react'
import { Avatar as Rendered, Style } from '@dicebear/core'
import definition from '@dicebear/styles/toon-head.json'
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

   The set is drawn for profile pictures, where a face is a mood you picked
   this morning. A card in a journey is not that: it is who somebody is for the
   length of a book, sitting under a sentence the reader wrote in earnest. So
   the seed picks from a narrower set than the one the library ships, and
   everything held back is held back the same way — moved behind the reader's
   own words, where a frightened face means they typed "frightened" rather than
   that the name happened to hash onto it.

   Skin is not narrowed, and neither is hair colour: unlike the set this
   replaced, every value in both palettes here is one a person actually has.
   The file guesses at hair and expression from the reader's words and never at
   skin, which is a picker's job and not a word list's. */
const SOBER: Look = {
  /* Only faces at rest. A wink is a thing done at somebody and a wide eye is a
     thing that just happened, and both are about a moment. What is left is the
     three that hold still: level, softly closed, and a warm crease. */
  eyesVariant: ['humble', 'happy', 'bow'],
  /* The two that are shut and pleasant. "agape" is an open oval — at the 62
     pixels these actually occupy it stops reading as speech and starts reading
     as a shout, which is a poor answer to "says less with every chapter" — and
     "angry" and "sad" are both aimed at something in a scene. "laugh" is open
     too, but it is open the way a laugh is, and a set of faces where nobody
     ever laughs is its own kind of wrong; it stays. */
  mouthVariant: ['smile', 'laugh'],
  /* Brows at rest as well: level, lifted, and the soft happy pair. The angry
     and sad pairs are the two that are clearly *at* somebody, and they wait
     for the word. */
  eyebrowsVariant: ['neutral', 'raised', 'happy'],
  /* The clothing palette runs to ten and four of them are signage — a traffic
     orange, a hot pink, an electric purple and a school-bus yellow. On a card
     the size of a playing card they are the loudest thing on the page and they
     are loud about a shoulder. What is left still has colour in it — navy,
     forest, brick — it just stops shouting across the paper at the sentence
     underneath. */
  clothesColor: ['#151613', '#0b3286', '#545454', '#147f3c', '#b11f1f', '#e8e9e6'],
  /* The set puts a beard on every other face by default, which on a page of
     eight characters is four beards, and half of them under names that plainly
     said otherwise. A quarter still gives a bearded man on a card regularly
     without making it the set's defining feature; the word "beard" below takes
     it to a certainty. */
  beardProbability: 25,
}

/* The two shortlists the cues below hand out.

   Hair does nearly all the work, and it comes in two pieces here: the front
   piece every face has, and the piece behind the head that reads as length.
   Long hair is that back piece, so the lever for it is a probability rather
   than a shape.

   The beard is the other half, on one side only: left alone, a quarter of the
   aunts on a page arrive in a full beard, which is not a quirk of the seed —
   it is the app contradicting the word the reader just typed. Nothing forces
   one on the other side. Most men here are clean-shaven, and the ones who are
   not got there the way they always did. */
const SHE: Look = {
  beardProbability: 0,
  rearHairProbability: 100,
  rearHairVariant: ['longStraight', 'longWavy', 'shoulderHigh'],
  hairVariant: ['bun', 'sideComed'],
}

const HE: Look = {
  rearHairProbability: 0,
  hairVariant: ['sideComed', 'spiky', 'undercut'],
}

/* Order is the tiebreak: later cues overwrite earlier ones key by key, so the
   general sits above the specific. "Her grey-haired mother" reads as a woman
   on the way past and lands on grey. */
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
    { hairColor: GREY },
  ],

  /* -- Hair, as a colour. Grey, red and pink are not in the set's palette and
        are handed over as literal ink; the rest are the palette's own. The
        beard draws from the same colour group as the hair, so setting one sets
        both and a grey-haired man with a brown beard cannot happen here. */
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
  [/\b(?:grey|gray|silver|white)[- ]?(?:haired|hair)\b/, { hairColor: GREY }],

  /* -- Hair, as a shape. Length lives in the piece behind the head, so every
        cue about it sets that probability as well as a shape: turning one on
        without turning the other off leaves a bun with a curtain hanging out
        of the back of it.

        Two words the set simply cannot answer — curly and dreadlocks — are
        absent rather than approximated. There are four front pieces here and
        none of them is a curl, so a "curly" cue could only hand back a
        different wrong hairstyle with more confidence than the seed's. */
  [/\b(?:bun|chignon|topknot)\b/, { hairVariant: ['bun'], rearHairProbability: 0 }],
  [
    /\bbob\b/,
    { hairVariant: ['sideComed'], rearHairProbability: 100, rearHairVariant: ['neckHigh'] },
  ],
  [
    /\blong\s+(?:hair|curls|braids)\b/,
    {
      hairVariant: ['sideComed'],
      rearHairProbability: 100,
      rearHairVariant: ['longStraight', 'longWavy', 'shoulderHigh'],
    },
  ],
  [/\b(?:spiky|tousled|unruly|wild[- ]haired)\b/, { hairVariant: ['spiky'] }],
  /* No variant in the set is properly bald, so a close crop is the nearest
     true thing rather than a wrong one. A reader who wants bald wants the
     picker, and that is the honest answer. */
  [
    /\b(?:shaved|balding|bald|buzz[- ]?cut|crew[- ]?cut|close[- ]cropped|cropped)\b/,
    { hairVariant: ['undercut'], rearHairProbability: 0 },
  ],

  /* Nothing here for a hat, a turban or a headscarf, and nothing for glasses
     or an eyepatch: this set draws a head and what grows on it, and has no
     layer for anything worn. The words are left unread rather than answered
     with the wrong thing. */

  /* -- The face itself. The beard sits at a quarter by default, so a cue has
        to say "certainly" as well as "which". */
  [
    /\bbeard(?:ed)?\b/,
    { beardProbability: 100, beardVariant: ['fullBeard', 'chin', 'longBeard'] },
  ],
  [
    /\b(?:moustache|mustache|whiskers)\b/,
    { beardProbability: 100, beardVariant: ['moustacheTwirl', 'chinMoustache'] },
  ],
  [/\bclean[- ]shaven\b/, { beardProbability: 0 }],

  /* -- What the reader thinks of them, which is the whole reason they wrote
        anything down. Expression is the part of a face a reader remembers. */
  [
    /\b(?:angry|furious|cruel|vicious|brutal|rage|temper)\b/,
    { eyebrowsVariant: ['angry'], eyesVariant: ['humble'], mouthVariant: ['angry'] },
  ],
  [
    /\b(?:stern|severe|grim|strict|humourless|humorless|forbidding)\b/,
    { eyebrowsVariant: ['angry', 'neutral'], eyesVariant: ['humble'], mouthVariant: ['sad'] },
  ],
  [
    /\b(?:sad|grief|grieving|mourning|sorrow|weeping|lonely|bereft|melancholy)\b/,
    { eyebrowsVariant: ['sad'], eyesVariant: ['humble'], mouthVariant: ['sad'] },
  ],
  [
    /\b(?:afraid|frightened|terrified|nervous|anxious|haunted)\b/,
    { eyebrowsVariant: ['sad'], eyesVariant: ['wide'], mouthVariant: ['agape'] },
  ],
  [
    /\b(?:tired|weary|exhausted|worn|ill|dying)\b/,
    { eyebrowsVariant: ['sad'], eyesVariant: ['bow'], mouthVariant: ['sad'] },
  ],
  [
    /\b(?:kind|kindly|warm|gentle|generous|friendly|cheerful|laughing|merry)\b/,
    { eyebrowsVariant: ['happy'], eyesVariant: ['happy'], mouthVariant: ['laugh', 'smile'] },
  ],
  [
    /\b(?:sly|cunning|scheming|sardonic|wry|mischievous|smirk)\b/,
    { eyebrowsVariant: ['raised'], eyesVariant: ['wink'], mouthVariant: ['smile'] },
  ],

  // -- What they do, which in a novel is usually what they wear.
  [
    /\b(?:soldier|captain|officer|lawyer|banker|clerk|detective|inspector|magistrate|doctor)\b/,
    { clothesVariant: ['openJacket'] },
  ],
  [
    /\b(?:scholar|student|teacher|professor|librarian|tutor|priest|monk|nun)\b/,
    { clothesVariant: ['turtleNeck', 'openJacket'] },
  ],
  [
    /\b(?:farmer|fisherman|sailor|labourer|laborer|miner|mechanic|gardener|cook)\b/,
    { clothesVariant: ['shirt', 'tShirt'] },
  ],
]

/** What the reader's own sentence asks for, if it asks for anything. */
function readLook(note: string): Look {
  const words = note.toLocaleLowerCase()
  const look: Look = {}
  for (const [cue, hint] of CUES) {
    if (cue.test(words)) Object.assign(look, hint)
  }
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
      /* The canvas is square and the bust sits inside it with air at the foot,
         so an oval mount taller than it is wide crops the sides and leaves the
         shoulders floating short of the bottom. A little scale closes the gap
         and seats the figure on the edge of its own plate, which is what a
         bust does. Tall hair — a bun — runs off the top at any scale, because
         it is drawn touching the top of the canvas; that is a portrait
         cropping its own hair, which is the correct thing for it to do.

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
