/* Tying a location keep to a real place, inside the capture sheet.

   Two ways in: search it by name, or use where the reader is standing. A search
   with one answer is taken straight away; with several, the answers are listed
   until one is picked, and the list goes away the moment the reader picks,
   edits the words or cancels. Nothing is saved until a place is chosen. */

import { useEffect, useState } from 'react'
import { findPlace, roughlyHere, shortLabel, type Found } from './find'
import { SearchIcon } from '../../components/TabIcons'
import styles from './picker.module.css'

export interface Pin {
  lat: number
  lon: number
  zoom: number
  label?: string
}

interface Props {
  /** The name the reader has already typed into the sheet above. The picker
      opens already looking for it: they said where they meant one field ago. */
  named?: string
  onPin: (pin: Pin) => void
  onCancel: () => void
}

/* Kept with every pin so the saved shape stays the one older keeps have. */
const STREET = 13

function PlacePicker({ named, onPin, onCancel }: Props) {
  const seed = named?.trim() ?? ''
  const [query, setQuery] = useState(seed)
  const [hits, setHits] = useState<Found[]>()
  const [seeking, setSeeking] = useState(false)
  const [snag, setSnag] = useState<string>()

  function take(hit: Found) {
    onPin({ lat: hit.lat, lon: hit.lon, zoom: STREET, label: shortLabel(hit.label) })
  }

  async function seek(words: string) {
    if (!words || seeking) return
    setSnag(undefined)
    setHits(undefined)
    setSeeking(true)
    try {
      const found = await findPlace(words)
      if (!found.length) setSnag('No place by that name. Try fewer words.')
      else if (found.length === 1) take(found[0])
      else setHits(found)
    } catch {
      setSnag('Couldn’t reach the place search. Try again, or add a picture instead.')
    } finally {
      setSeeking(false)
    }
  }

  /* Opened with a name already in the box, so go and find it. Once, on open. */
  useEffect(() => {
    if (seed) void seek(seed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* The device said no, so the network says roughly: the city. */
  async function roughly() {
    try {
      const spot = await roughlyHere()
      onPin({ lat: spot.lat, lon: spot.lon, zoom: STREET, label: spot.label || undefined })
    } catch {
      setSnag('Can’t tell where you are right now. Search for the place instead.')
      setSeeking(false)
    }
  }

  function here() {
    setSnag(undefined)
    setHits(undefined)
    setSeeking(true)
    if (!navigator.geolocation) {
      void roughly()
      return
    }
    navigator.geolocation.getCurrentPosition(
      (spot) => onPin({ lat: spot.coords.latitude, lon: spot.coords.longitude, zoom: STREET }),
      () => void roughly(),
      { timeout: 10000, maximumAge: 60000 },
    )
  }

  return (
    <div className={styles.picker}>
      <form
        className={styles.seek}
        onSubmit={(event) => {
          event.preventDefault()
          void seek(query.trim())
        }}
      >
        <input
          className={styles.seekBox}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setHits(undefined)
          }}
          placeholder="Search for a place"
          aria-label="Search for a place"
          enterKeyHint="search"
        />
        <button type="submit" className={styles.seekGo} disabled={!query.trim() || seeking}>
          <SearchIcon size={15} />
          <span className={styles.seekWord}>{seeking ? 'Looking…' : 'Find'}</span>
        </button>
      </form>

      {hits && (
        <ul className={styles.hits} aria-label="Places found">
          {hits.map((hit, at) => (
            <li key={`${hit.lat},${hit.lon},${at}`}>
              <button type="button" className={styles.hit} onClick={() => take(hit)}>
                <span className={styles.hitName}>{shortLabel(hit.label)}</span>
                {/* Two answers can share a name and be a thousand miles apart;
                    the region is what tells them apart. */}
                {hit.about && <span className={styles.hitAbout}>{hit.about}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {snag && (
        <p className={styles.snag} role="status">
          {snag}
        </p>
      )}

      <div className={styles.acts}>
        <button type="button" className={styles.act} onClick={here} disabled={seeking}>
          Where I am
        </button>
        <button type="button" className={styles.act} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default PlacePicker
