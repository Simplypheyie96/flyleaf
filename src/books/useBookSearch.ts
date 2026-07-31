import { useEffect, useState } from 'react'
import { searchBooks, type BookResult } from './sources'

export type SearchState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'done'; results: BookResult[] }

/** Debounced, cancelling book search. Never rejects: a dead source is a
    result of zero, which the sheet already knows how to answer. */
export function useBookSearch(query: string): SearchState {
  const [state, setState] = useState<SearchState>({ status: 'idle' })

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setState({ status: 'idle' })
      return
    }

    setState({ status: 'searching' })

    // Typing is much faster than the network. Waiting for a pause turns a
    // twenty-character title into one request instead of nineteen — which is
    // also what keeps us inside both catalogues' rate limits without trying.
    const controller = new AbortController()
    let live = true
    const timer = setTimeout(() => {
      searchBooks(q, controller.signal)
        .then((results) => live && setState({ status: 'done', results }))
        .catch(() => live && setState({ status: 'done', results: [] }))
    }, 350)

    return () => {
      live = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return state
}
