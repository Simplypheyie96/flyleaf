import { useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import BackBar, { useCollapse } from '../components/BackBar'
import PaperSurface from '../components/PaperSurface'
import { DOCS, MAKER, findDoc } from './documents'
import pageStyles from '../routes/page.module.css'
import styles from './legal.module.css'

/* One route for all three documents, because they are the same object: a
   title, a paragraph telling you what the page is for, four lines that are
   genuinely the whole thing, and then the careful version underneath.

   The short version is not a summary bolted on at the end. Almost nobody reads
   a policy, and the reason is that policies are written to be defensible rather
   than read; a page that leads with four honest sentences and keeps the long
   text below them is read by more people than one that does not, which is the
   entire point of publishing it.

   It is one sheet of paper, not eight cards. Everywhere else in Flyleaf a card
   is a keepsake and the scrapbook rhythm is right. A policy is a document —
   breaking it into cards would say the sections are separable, and they are
   not. */

function Legal() {
  const { slug } = useParams()
  const doc = findDoc(slug)
  const { sentinel, collapsed } = useCollapse()

  /* Arriving from a link in Settings, you should arrive at the top of the
     document. The router keeps the scroll position of the page you left
     otherwise, which on a long Settings page means opening Privacy halfway
     down it. */
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])

  if (!doc) return <Navigate to="/settings" replace />

  const others = DOCS.filter((each) => each.slug !== doc.slug)

  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.column}>
        <BackBar to="/settings" from="Settings" title={doc.title} collapsed={collapsed} />

        <header className={styles.masthead}>
          <h1 className={styles.title}>{doc.title}</h1>
          <p className={styles.lede}>{doc.lede}</p>
          {/* "Last updated not yet published" is not a sentence. Until there is
              a real date, the stamp says the true thing instead. */}
          <p className={styles.stamp}>
            {MAKER.unfilled ? 'Not yet published' : `Last updated ${MAKER.updated}`}
          </p>
          <div ref={sentinel} aria-hidden="true" />
        </header>

        {MAKER.unfilled && (
          <p className={styles.draft} role="note">
            <strong>Starter draft.</strong> This page was written to be honest
            about how Flyleaf actually works, but it has not been reviewed by a
            lawyer and it is not legal advice. Some details are still blank.
          </p>
        )}

        <PaperSurface className={styles.summary}>
          <h2 className={styles.summaryTitle}>The short version</h2>
          <ul className={styles.shortList}>
            {doc.short.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </PaperSurface>

        <PaperSurface className={styles.sheet}>
          {doc.body.map((section) => (
            <section key={section.heading} className={styles.section}>
              <h2 className={styles.heading}>{section.heading}</h2>
              {section.content}
            </section>
          ))}
        </PaperSurface>

        <nav className={styles.siblings} aria-label="Other pages">
          {others.map((each) => (
            <Link key={each.slug} to={`/legal/${each.slug}`} className={styles.sibling}>
              {each.title}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  )
}

export default Legal
