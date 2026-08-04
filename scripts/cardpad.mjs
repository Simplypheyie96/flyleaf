/* The interior of a keep's card is one number, --card-pad, and it is spent in
   three files. It drifted apart repeatedly because each card wrote its own
   --space-5 and a fix to one never reached the other six.

   This checks the card *shells* only — the outer box of each of the seven
   kinds, plus the two bases they build on. Anything inside a card (a chip, a
   tab, a caption strip, a map frame) is furniture and sets its own insets;
   those are not this guard's business. If a new kind is added, add its shell
   here, or it can drift without anyone noticing.

   Run: node scripts/cardpad.mjs */

import { readFileSync } from 'node:fs'

/* file → shell selectors whose padding IS the card's interior. */
const SHELLS = {
  'src/journey/cards/plates.module.css': ['.plate', '.panel', '.polaroid'],
  'src/journey/cards/pressed.module.css': ['.sheet', '.leaf', '.mapped'],
  'src/journey/cards/redraw.module.css': ['.card', '.dossier', '.person', '.recorder'],
}

/* The quote card holds a taller band open above its first line because the
   ghost quote mark hangs into it. That is the one interior length in the set
   that is deliberately not --card-pad, and it is block-start only. */
/* The picture card's three thin sides are a frame around a photograph, not
   margin around words, so they stay at --space-4 and its foot — the only part
   holding text — spends --card-pad like everything else. */
const ALLOWED_EXTRA = {
  '.panel': /padding-block:\s*var\(--space-6\)/,
  '.polaroid': /padding:\s*var\(--space-4\) var\(--space-4\)/,
}

const bad = []
const seen = new Set()

for (const [file, shells] of Object.entries(SHELLS)) {
  let selector = ''
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      const sel = line.match(/^(\.[A-Za-z][\w-]*)/)
      if (sel) selector = sel[1]
      if (!shells.includes(selector)) return
      if (!line.trimStart().startsWith('padding')) return
      if (line.includes('--card-pad')) seen.add(selector)
      const step = line.match(/var\(--space-\d\)/)
      if (!step) return
      if (ALLOWED_EXTRA[selector]?.test(line.trim())) return
      bad.push(`${file}:${i + 1}  ${selector}  ${step[0]} — use var(--card-pad)`)
    })
}

const silent = Object.values(SHELLS)
  .flat()
  .filter((s) => !seen.has(s))

if (bad.length || silent.length) {
  if (bad.length) {
    console.error('card interiors must spend --card-pad, not a raw spacing step:\n')
    for (const b of bad) console.error('  ' + b)
  }
  if (silent.length) {
    console.error(
      `\nthese card shells no longer spend --card-pad at all: ${silent.join(', ')}` +
        '\n(either they lost their padding, or they were renamed — update SHELLS)',
    )
  }
  process.exit(1)
}
console.log(`every card interior spends --card-pad (${seen.size} shells)`)
