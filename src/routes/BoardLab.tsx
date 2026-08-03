/* /lab/board — the pinned wall, kept where it can be looked at.

   It stood on the home screen for one commit and should not have: it was built
   as a replacement rather than proposed as one, and the home direction is
   still an open question. Reverting it out of `/` would have left it only in
   git history, which is not somewhere a screen can be judged from, so it is
   parked here instead — same component, same `?empty` switch, none of the
   claim on the front door.

   It comes out with whatever loses. */

import { useLocation } from 'react-router-dom'
import Board from './home/Board'
import pageStyles from './page.module.css'

function BoardLab() {
  const empty = new URLSearchParams(useLocation().search).has('empty')
  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.column}>
        <Board empty={empty} />
      </div>
    </main>
  )
}

export default BoardLab
