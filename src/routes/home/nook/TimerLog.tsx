/* THE READING-TIME LOG — a sheet, not a card.

   The owner's calls, in order: the log must not be another card inside a
   book's journal; it opens as a modal; and it carries its own sort and
   filter. So the whole record — every sitting on every book — lives behind
   the clock's one line, in the same glass sheet the rest of the app uses,
   and the journal page stays about the reading.

   Two small controls, not the Library's dropdowns: at the sizes this list
   reaches, a segmented row the reader can see all of beats a menu they have
   to open. Sort re-shapes the list (days, lengths, or books); the window
   narrows it. */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Sheet from '../../../components/Sheet'
import { useLibrary } from '../../../data/useLibrary'
import { type Sitting } from '../../../data/db'
import { keptLabel } from '../../../journey/lexicon'
import {
  atClock,
  countedSittings,
  inWords,
  removeSitting,
  useAllSittings,
} from '../../../data/sittings'
import s from './timerlog.module.css'

type LogSort = 'newest' | 'longest' | 'book'
type LogSpan = 'all' | 'week' | 'month'

const SORTS: { id: LogSort; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'longest', label: 'Longest' },
  { id: 'book', label: 'By book' },
]
const SPANS: { id: LogSpan; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
]

const DAY = 86400e3

/** The last seven days as bars: one series, one hue, letters in ink.

    Chart discipline, briefly: a single series carries no legend (the label
    names it), the bars are thin with rounded data-ends anchored to a hairline
    baseline, only the peak day gets a printed value, and the whole week is
    also written out as text for anyone not looking at it. */
function weekOf(all: Sitting[] | undefined) {
  const days: { label: string; secs: number; today: boolean }[] = []
  const now = new Date()
  for (let back = 6; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back)
    const secs = (all ?? [])
      .filter((sit) => {
        const s = new Date(sit.startedAt)
        return (
          s.getFullYear() === d.getFullYear() &&
          s.getMonth() === d.getMonth() &&
          s.getDate() === d.getDate()
        )
      })
      .reduce((sum, sit) => sum + sit.seconds, 0)
    days.push({
      label: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
      secs,
      today: back === 0,
    })
  }
  return days
}

function within(sit: Sitting, span: LogSpan): boolean {
  if (span === 'all') return true
  const age = Date.now() - sit.startedAt
  return age <= (span === 'week' ? 7 * DAY : 30 * DAY)
}

/** Consecutive sittings sharing a key become one group, order preserved. */
function grouped(rows: Sitting[], keyOf: (sit: Sitting) => string) {
  const out: { key: string; rows: Sitting[] }[] = []
  for (const sit of rows) {
    const key = keyOf(sit)
    const last = out[out.length - 1]
    if (last && last.key === key) last.rows.push(sit)
    else out.push({ key, rows: [sit] })
  }
  return out
}

export default function TimerLog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const all = useAllSittings()
  const books = useLibrary()
  const [sort, setSort] = useState<LogSort>('newest')
  const [span, setSpan] = useState<LogSpan>('all')
  const [undo, setUndo] = useState<(() => Promise<unknown>) | null>(null)

  const titleOf = useMemo(() => {
    const map = new Map((books ?? []).map((b) => [b.id, b.title]))
    return (id: number) => map.get(id) ?? 'A book no longer on the shelf'
  }, [books])

  const shown = useMemo(() => {
    const kept = (all ?? []).filter((sit) => within(sit, span))
    if (sort === 'longest') return [...kept].sort((a, b) => b.seconds - a.seconds)
    if (sort === 'book')
      return [...kept].sort(
        (a, b) => titleOf(a.bookId).localeCompare(titleOf(b.bookId)) || b.startedAt - a.startedAt,
      )
    return kept // already newest first
  }, [all, sort, span, titleOf])

  const total = shown.reduce((sum, sit) => sum + sit.seconds, 0)
  const bookCount = new Set(shown.map((sit) => sit.bookId)).size
  const week = useMemo(() => weekOf(all), [all])
  const peak = Math.max(...week.map((d) => d.secs), 1)

  /* Longest is a ranking, so it gets no group headers — a day header over a
     list that is not in day order would be a lie about the order. */
  const groups =
    sort === 'longest'
      ? [{ key: '', rows: shown }]
      : grouped(shown, (sit) => (sort === 'book' ? titleOf(sit.bookId) : keptLabel(sit.keptOn)))

  async function drop(sit: Sitting) {
    const restore = await removeSitting(sit)
    setUndo(() => restore)
  }

  return (
    <Sheet open={open} onClose={onClose} label="Your reading time" name="timerlog" fill>
      <div className={s.log}>
        <h2 className={s.title}>Reading time</h2>
        <p className={s.total} role="status">
          {shown.length
            ? `${inWords(total)} over ${countedSittings(shown.length)}, in ${bookCount} ${
                bookCount === 1 ? 'book' : 'books'
              }.`
            : 'No sittings here yet. Start the clock when you sit down to read.'}
        </p>

        {/* The week, drawn — the graphic the owner asked this card to carry,
            and it earns its place by being the one thing a ledger cannot
            say: the rhythm. Unfiltered on purpose; the pills below narrow
            the LIST, but "how has my week looked" is one fixed question. */}
        {all && all.length > 0 && (
          <figure className={s.week}>
            <div className={s.bars} aria-hidden="true">
              {week.map((d, i) => (
                <div key={i} className={s.slot}>
                  {d.secs > 0 && d.secs === peak && (
                    <span className={s.peakLabel}>{inWords(d.secs)}</span>
                  )}
                  <i
                    className={s.bar}
                    data-quiet={d.secs === 0 || undefined}
                    style={{ blockSize: `${d.secs === 0 ? 3 : 8 + (d.secs / peak) * 48}px` }}
                  />
                </div>
              ))}
            </div>
            <div className={s.days} aria-hidden="true">
              {week.map((d, i) => (
                <span key={i} className={s.dayLetter} data-today={d.today || undefined}>
                  {d.label}
                </span>
              ))}
            </div>
            <figcaption className={s.sr}>
              The last seven days:{' '}
              {week.map((d) => `${d.label} ${d.secs ? inWords(d.secs) : 'nothing'}`).join(', ')}.
            </figcaption>
          </figure>
        )}

        <div className={s.tools}>
          <div className={s.pills} role="group" aria-label="Sort the log">
            {SORTS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={s.pill}
                aria-pressed={sort === id}
                onClick={() => setSort(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={s.pills} role="group" aria-label="How far back">
            {SPANS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={s.pill}
                aria-pressed={span === id}
                onClick={() => setSpan(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={s.ledger}>
          {groups.map(({ key, rows }) => (
            <section key={key || 'ranked'} className={s.day}>
              {key && (
                <h3 className={s.dayHead}>
                  <span>{key}</span>
                  {sort === 'book' && (
                    <span className={s.daySum}>
                      {inWords(rows.reduce((sum, sit) => sum + sit.seconds, 0))}
                    </span>
                  )}
                </h3>
              )}
              <ol className={s.list}>
                {rows.map((sit) => (
                  <li key={sit.id} className={s.sitting}>
                    <span className={s.when}>
                      {/* Whichever fact the grouping already says is not
                          repeated on every row under it. */}
                      {sort !== 'book' && (
                        <Link
                          className={s.bookLink}
                          to={`/book/${sit.bookId}`}
                          onClick={onClose}
                        >
                          {titleOf(sit.bookId)}
                        </Link>
                      )}
                      {sort === 'book' && <span className={s.dayInline}>{keptLabel(sit.keptOn)}</span>}
                      <span className={s.hour}>{atClock(sit.startedAt)}</span>
                    </span>
                    <span className={s.length}>{inWords(sit.seconds)}</span>
                    <button
                      type="button"
                      className={s.drop}
                      onClick={() => void drop(sit)}
                      aria-label={`Remove the ${inWords(sit.seconds)} sitting on ${keptLabel(sit.keptOn)}`}
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>

        {undo && (
          <p className={s.undoRow} role="status">
            <span>Sitting removed.</span>
            <button
              type="button"
              className={s.undo}
              onClick={() => {
                void undo()
                setUndo(null)
              }}
            >
              Put it back
            </button>
          </p>
        )}
      </div>
    </Sheet>
  )
}
