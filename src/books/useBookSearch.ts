import { useEffect, useState } from 'react'
import { searchBooks, type BookResult } from './sources'

export type SearchState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'done'; results: BookResult[] }
  /** No catalogue answered at all — offline, blocked, or both down together. */
  | { status: 'unreachable' }

/** Debounced, cancelling book search. Never rejects: a search that could not be
    run is a state of its own, which the sheet knows how to answer. */
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
        .then(({ results, answered }) => {
          if (!live) return
          // One source answering is a real search: Google is out of quota far
          // more often than it is up, and Open Library alone is the search.
          setState(answered > 0 ? { status: 'done', results } : { status: 'unreachable' })
        })
        .catch(() => live && setState({ status: 'unreachable' }))
    }, 350)

    return () => {
      live = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return state
}
