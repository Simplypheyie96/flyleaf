import { useState } from 'react'
import { Link } from 'react-router-dom'
import Sparkle from '../components/Sparkle'
import ThemeToggle from '../components/ThemeToggle'
import { getPref, type ThemePref } from '../theme'
import Fold from '../settings/Fold'
import InstallHow, { useInstalled } from '../settings/InstallHow'
import { BackupCard, NameCard } from '../settings/Journey'
import Tip from '../settings/Tip'
import { DOCS } from '../legal/documents'
import { GUIDES, detect } from '../settings/platform'
import card from '../settings/settings.module.css'
import pageStyles from './page.module.css'
import styles from './Settings.module.css'

/* Six folded rows under the masthead, in the order a reader needs them: who
   they are, how it looks, where the journey lives, how to keep it on a device,
   the tip jar, and the pages nobody reads until they need to.

   Folded rather than laid out flat, because six cards standing open at once is
   a document and a reader looking for one switch had to scroll a page of
   explanation to reach it. Each row prints its own state on the closed line —
   the name, the current theme, the count of books, which device we think this
   is — so the page can be read without being opened. */

/* The two rows the page owns outright. The rest bring their own state and so
   bring their own Fold with them. */

function Appearance() {
  /* Held here only so the closed row can say what it is set to. The control
     below is still the one source of truth; this follows it. */
  const [pref, setPref] = useState<ThemePref>(getPref)
  const said = { system: 'Auto', light: 'Day', dark: 'Night' }[pref]

  return (
    <Fold title="Appearance" meta={said}>
      <span className={card.sectionHint}>
        Auto follows your device from day into night. Day and Night hold until
        you change them.
      </span>
      <ThemeToggle onChange={setPref} />
    </Fold>
  )
}

/* The install row stays on the page when Flyleaf is already installed rather
   than disappearing: a reader who has it on their phone is exactly the reader
   who wants it on their iPad too, and instructions that vanish the moment they
   work are instructions nobody can hand to anyone. */
function Install() {
  const here = useInstalled()

  return (
    <Fold
      title="On your home screen"
      meta={here ? 'Installed' : GUIDES[detect()].label}
    >
      <InstallHow />
    </Fold>
  )
}

function Settings() {
  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.column}>
        <header className={styles.masthead}>
          <h1 className={styles.title}>
            Settings <Sparkle size={15} className={styles.spark} />
          </h1>
          <p className={styles.subtitle}>how Flyleaf behaves</p>
        </header>

        {/* Name, then theme, then what the name is attached to. A reader's own
            name is the first thing on a settings page in every app they
            already own; the theme is the switch they come back for, and second
            of six rows is still under the thumb that landed here. */}
        <div className={styles.list}>
          <NameCard />

          <Appearance />

          <BackupCard />

          <Install />

          <Tip />

          {/* Last, and deliberately plain. The three documents are the only
              part of Settings a reader opens once; they are also the part that
              has to be findable the day somebody goes looking for it. */}
          <Fold title="The small print">
            <span className={card.sectionHint}>
              What Flyleaf knows about you, what it promises, and who made the
              parts it did not.
            </span>
            <div className={card.links}>
              {DOCS.map((doc) => (
                <Link key={doc.slug} to={`/legal/${doc.slug}`} className={card.link}>
                  {doc.title}
                  <span className={card.linkHint} aria-hidden="true">
                    ›
                  </span>
                </Link>
              ))}
            </div>
          </Fold>
        </div>
      </div>
    </main>
  )
}

export default Settings
