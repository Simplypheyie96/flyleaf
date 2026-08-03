import { useLocation } from 'react-router-dom'
import Board from './home/Board'
import pageStyles from './page.module.css'

/* The home screen is the board. Everything that stood here before — the
   archive masthead, the currently-reading hero, and the three candidates for
   the section under it — was the app talking about itself: a title that named
   the filing cabinet, a card that restated the book's own page, and a feed of
   what had been filed. Board.tsx has the argument for what replaced it.

   `?empty` still previews the first run, and it matters more here than it did:
   the empty board is the screen that has to explain the whole app to somebody
   who has never opened a book in it.

   The old direction switch (`?home=a|b|c`) is gone with the directions. */
function Home() {
  const empty = new URLSearchParams(useLocation().search).has('empty')
  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.column}>
        <Board empty={empty} />
      </div>
    </main>
  )
}

export default Home
