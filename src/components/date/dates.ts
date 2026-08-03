/* Dates, kept local.

   Every date in Flyleaf is stored as a bare `YYYY-MM-DD` — a calendar day, not
   an instant. That distinction is the whole reason this file exists: handing a
   bare date string to `new Date()` parses it as UTC midnight, so a book started
   on the 31st shows as the 30th for every reader west of Greenwich. Nothing
   here ever goes through `Date.parse`; days are built field by field in the
   reader's own zone and taken apart the same way.

   No month or weekday names are shipped either. `Intl` already knows every one
   of them in every locale, and a hardcoded English array is a bug the moment
   somebody opens the app in Lagos or São Paulo. */

/** A calendar day as `YYYY-MM-DD`, in the reader's own zone. */
export function toISO(d: Date) {
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** The reverse: a local midnight, never a UTC one. */
export function fromISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO() {
  return toISO(new Date())
}

/** Clamped to the last day of the target month, so 31 January minus a month is
    28 February rather than spilling forward into March. */
export function addMonths(d: Date, n: number) {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const last = daysInMonth(target.getFullYear(), target.getMonth())
  target.setDate(Math.min(d.getDate(), last))
  return target
}

export function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/** Day 0 of the next month is the last day of this one. */
export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

/* Which day the week starts on where the reader is: Monday across most of
   Europe, Sunday in the US and Japan, Saturday in much of the Middle East.
   `weekInfo` is the standard answer and is not everywhere yet, so the fallback
   is Monday — the ISO default, and wrong in a way that only shifts a column
   rather than mislabelling a date. Returned in JS's own 0=Sunday numbering,
   which is not the 1=Monday numbering `weekInfo` uses. */
export function weekStart() {
  try {
    const locale = new Intl.Locale(navigator.language) as Intl.Locale & {
      weekInfo?: { firstDay: number }
      getWeekInfo?: () => { firstDay: number }
    }
    const info = locale.getWeekInfo?.() ?? locale.weekInfo
    if (info) return info.firstDay % 7 // 7 (Sunday) becomes 0
  } catch {
    /* An unparseable navigator.language. Monday it is. */
  }
  return 1
}

/** The seven column heads, already rotated so the first one is `weekStart()`.
    Built from a known week in 2024 that began on a Sunday, so the offsets are
    plain arithmetic rather than a lookup. */
export function weekdayHeads(format: 'short' | 'narrow' = 'short') {
  const fmt = new Intl.DateTimeFormat(undefined, { weekday: format })
  const start = weekStart()
  return Array.from({ length: 7 }, (_, i) =>
    fmt.format(new Date(2024, 8, 1 + ((start + i) % 7))),
  )
}

/** How many blank cells sit before the 1st in a month grid. */
export function leadingBlanks(year: number, month: number) {
  return (new Date(year, month, 1).getDay() - weekStart() + 7) % 7
}

export function monthYear(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function monthShort(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'short' })
}

/** "Friday, 31 July 2026" in London, "Friday, July 31, 2026" in New York. */
export function longDate(iso: string) {
  return fromISO(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** "2 Jul 2026" in London, "Jul 2, 2026" in New York. For places where the
    date shares a line with something else: `longDate` runs to three lines in a
    half-width cell on a phone, and a wrapped date stops looking like a date. */
export function shortDate(iso: string) {
  return fromISO(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** "Jul 2", with the year only when the year is worth saying. */
function spanEnd(d: Date, withYear: boolean) {
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  })
}

/** The two ends of a reading span, formatted against each other.
 *
 *  A pair of dates is one fact, not two, and the year is where that shows:
 *  formatting each end on its own gave "Jul 2, 2019 → Aug 14, 2019", which
 *  prints the year twice for a reader who needed it once, and "Jul 2, 2026 →
 *  Aug 14, 2026", which prints this year twice for a reader who needed it not
 *  at all. Three rules, in the order they apply:
 *
 *    · this year is never printed — a book you are reading now is not dated;
 *    · one shared older year is printed once, on the trailing end;
 *    · two different years are both printed, because that is the fact.
 *
 *  Returns undefined for an end that is not set. What stands in for a missing
 *  end is the caller's to say: only the caller knows whether a blank trailing
 *  end means the book is still open. */
export function spanPair(start?: string, finish?: string) {
  const a = start ? fromISO(start) : undefined
  const b = finish ? fromISO(finish) : undefined
  const ya = a?.getFullYear()
  const yb = b?.getFullYear()
  const now = new Date().getFullYear()
  const both = ya !== undefined && yb !== undefined
  const differ = both && ya !== yb
  return {
    start: a && ya !== undefined ? spanEnd(a, ya !== now && (differ || !both)) : undefined,
    finish: b && yb !== undefined ? spanEnd(b, yb !== now) : undefined,
  }
}

/** What a screen reader should hear on a day cell — the full date, never the
    bare numeral, because "17" out of context tells you nothing. */
export function dayLabel(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
