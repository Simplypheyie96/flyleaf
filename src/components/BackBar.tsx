/* The bar you come back out through.

   The one Flyleaf had was a serif link the size of a heading sitting in the
   page flow, which is not what a back control is. A back control on a phone
   is chrome: it stays put, it is set in the interface face at interface size,
   it names the place you came from rather than the place you are, and its
   chevron is a thin mark beside that name rather than a glyph competing with
   it. It is also the one element on the screen that must never scroll away —
   a reader four hundred pixels into a journey should not have to go back up
   to leave.

   The second job is the title. A long book title set large is right at the
   top of the page and wrong once you are reading the keeps, so the bar takes
   it over on the way down: the large title scrolls off, and the same words
   arrive centred in the bar at interface size. The swap is driven by an
   observer on a sentinel the page puts at the foot of its masthead, not by a
   scroll handler — the browser tells us when the line has been crossed
   instead of us asking every frame whether it has. */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronIcon } from './TabIcons'
import styles from './BackBar.module.css'

/** Watch a point in the page and report whether it has gone up past the bar.
    The page renders the returned ref at the foot of whatever the bar is meant
    to take over from.

    A callback ref rather than a `useRef`, because the page that uses this waits
    on a database read: on the first render there is nothing to watch yet, and a
    plain ref would leave the effect running once against a null and never
    again — the bar would stay transparent however far you scrolled. React
    hands a callback ref the node the moment it exists, and state makes that
    arrival something the effect can depend on. */
export function useCollapse() {
  const [mark, setMark] = useState<HTMLDivElement | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!mark) return
    const watch = new IntersectionObserver(
      ([entry]) => setCollapsed(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      /* The bar's own height, so the handover happens as the title passes
         behind it rather than as it passes the top of the window — otherwise
         the words are briefly in neither place. */
      { rootMargin: '-52px 0px 0px 0px', threshold: 0 },
    )
    watch.observe(mark)
    return () => watch.disconnect()
  }, [mark])

  return { sentinel: setMark, collapsed, scrolled }
}

interface Props {
  /** Where back goes. */
  to: string
  /** What that place is called. The name of the screen behind, not this one. */
  from: string
  /** What this screen is, for the bar to take over once the page title goes. */
  title: string
  collapsed: boolean
  scrolled?: boolean
  /** The one thing you can do to the whole screen, at the trailing edge. */
  action?: React.ReactNode
}

function BackBar({ to, from, title, collapsed, scrolled: customScrolled, action }: Props) {
  const [internalScrolled, setInternalScrolled] = useState(false)

  useEffect(() => {
    if (customScrolled !== undefined) return
    const onScroll = () => setInternalScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [customScrolled])

  const isScrolled = customScrolled ?? internalScrolled

  return (
    <div
      className={styles.bar}
      data-collapsed={collapsed || undefined}
      data-scrolled={(isScrolled || collapsed) || undefined}
    >
      <div className={styles.inner}>
        <Link to={to} className={styles.back}>
          {/* The chevron is not the control: the whole link is, and it is the
              word that makes it obvious where back goes. Hidden from the
              reading order so the link announces "Library", not
              "chevron Library". */}
          <ChevronIcon size={19} dir="left" />
          <span className={styles.from}>{from}</span>
        </Link>

        {/* Present in the DOM at both sizes so the swap is an opacity change
            rather than a reflow, and always hidden from assistive technology:
            the page's own h1 is the title, and this is a second copy of it. */}
        <span className={styles.title} aria-hidden="true">
          {title}
        </span>

        <div className={styles.trailing}>{action}</div>
      </div>
    </div>
  )
}

export default BackBar
