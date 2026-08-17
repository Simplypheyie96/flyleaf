/* Dropping a pin on the real world, inside the capture sheet.

   The map is dragged under a pin that never moves. That is the wrong way round
   if you think of it as moving a marker, and it is the only way round that
   works with a thumb: a pin you drag is a pin your own hand is covering at the
   exact moment you are trying to place it. Fixed at the centre, the reader's
   finger is always somewhere else, and the crosshair they are aiming is the one
   thing on screen they can see the whole time.

   Everything here is arithmetic and CSS — see tiles.ts for why there is no
   mapping library and no key. Three ways in, because a reader marking a
   location in a novel could mean any of them:

     • Search it by name, which is the usual one, answered by OpenStreetMap's
       own geocoder.
     • Use where they are standing, for a reader keeping a place they are in.
     • Drag and zoom, for a coastline with no name worth typing.

   Nothing is committed until "Pin this spot". A map that saved itself as it was
   dragged would mean every accidental swipe changed where a place is, and the
   reader would have no way of knowing it had happened. */

import { useEffect, useRef, useState } from 'react'
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clampLat,
  cover,
  latToY,
  lonToX,
  shortLabel,
  wrapLon,
  xToLon,
  yToLat,
  CREDIT,
  findPlace,
  type Found,
} from './tiles'
import { SearchIcon } from '../../components/TabIcons'
import styles from './map.module.css'

export interface Pin {
  lat: number
  lon: number
  zoom: number
  label?: string
}

interface Props {
  /** Where to open — the pin already on the keep, if there is one. */
  start?: Pin
  /** The name the reader has already typed into the sheet above. The map opens
      with it in the box and already looking for it: they said where they meant
      one field ago, and asking them to type it a second time to prove it is the
      app not listening. Only used when there is no pin yet — a keep that has
      already been pinned opens at its pin, and re-running the search would
      throw away a spot the reader may have dragged to by hand. */
  named?: string
  onPin: (pin: Pin) => void
  onCancel: () => void
}

/* The whole world, tilted north, which is where a map with nothing to say
   about the reader's intent should open. Deliberately not a country: a default
   centred on anywhere is the app guessing at a reader it has never met. */
const NOWHERE = { lat: 25, lon: 5, zoom: 2 }

function MapPicker({ start, named, onPin, onCancel }: Props) {
  const [lat, setLat] = useState(start?.lat ?? NOWHERE.lat)
  const [lon, setLon] = useState(start?.lon ?? NOWHERE.lon)
  const [zoom, setZoom] = useState(start?.zoom ?? NOWHERE.zoom)
  const [label, setLabel] = useState(start?.label)

  const seed = start ? '' : (named?.trim() ?? '')
  const [query, setQuery] = useState(seed)
  const [hits, setHits] = useState<Found[]>()
  const [seeking, setSeeking] = useState(false)
  const [snag, setSnag] = useState<string>()

  const box = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number }>()

  /* The picker replaces two pills with about four hundred pixels of map, and it
     does it inside a sheet that scrolls. Left alone, the thing the reader just
     asked for opens below the fold: the buttons vanish and nothing appears to
     have happened. Twice, then — once when it opens, and again when a search
     drops a list of answers in above the map and pushes it back down. */
  useEffect(() => {
    root.current?.scrollIntoView({
      block: 'nearest',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }, [])

  useEffect(() => {
    const el = box.current
    if (!el) return
    const watch = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ w: Math.ceil(width), h: Math.ceil(height) })
    })
    watch.observe(el)
    return () => watch.disconnect()
  }, [])

  useEffect(() => {
    if (!hits?.length) return
    root.current?.scrollIntoView({
      block: 'nearest',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }, [hits])

  const tiles = size ? cover(lat, lon, zoom, size.w, size.h) : []

  /* ── Dragging ───────────────────────────────────────────────────────────
     The gesture is measured in world pixels rather than in degrees, because a
     degree of longitude is a different distance at every latitude and at every
     zoom — converting once at the end is both simpler and the only way the map
     keeps up with the finger exactly. */
  const grab = useRef<{ id: number; x: number; y: number; px: number; py: number }>(null)

  function down(event: React.PointerEvent<HTMLDivElement>) {
    /* Not on the buttons drawn over the map. */
    if ((event.target as HTMLElement).closest('button')) return
    const z = Math.round(zoom)
    grab.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      px: lonToX(lon, z),
      py: latToY(lat, z),
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function move(event: React.PointerEvent<HTMLDivElement>) {
    const held = grab.current
    if (!held || held.id !== event.pointerId) return
    const z = Math.round(zoom)
    /* Dragging the map right moves the viewport left, hence the subtraction. */
    const px = held.px - (event.clientX - held.x)
    const py = held.py - (event.clientY - held.y)
    setLon(wrapLon(xToLon(px, z)))
    setLat(clampLat(yToLat(py, z)))
    /* The pin has been moved by hand, so whatever name it arrived with is no
       longer the name of what is under it. */
    setLabel(undefined)
  }

  function up(event: React.PointerEvent<HTMLDivElement>) {
    if (grab.current?.id !== event.pointerId) return
    grab.current = null
  }

  function step(by: number) {
    setZoom((was) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, was + by)))
  }

  async function seek(words: string) {
    if (!words || seeking) return
    setSnag(undefined)
    setSeeking(true)
    try {
      const found = await findPlace(words)
      setHits(found)
      if (!found.length) setSnag('No map has a place by that name. Try fewer words, or drag to it.')
      else land(found[0])
    } catch {
      setSnag('Couldn’t reach the place search — drag the map instead, or add a picture.')
      setHits(undefined)
    } finally {
      setSeeking(false)
    }
  }

  function search(event: React.FormEvent) {
    event.preventDefault()
    void seek(query.trim())
  }

  /* Opened with a name already in the box, so go and find it. Once, on the
     open — `seek` is rebuilt every render, so listing it as a dependency would
     restart the search on every keystroke the reader typed afterwards. */
  useEffect(() => {
    if (seed) void seek(seed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Close enough to read street names, far enough to see which town it is. */
  function land(hit: Found) {
    setLat(clampLat(hit.lat))
    setLon(wrapLon(hit.lon))
    setZoom((was) => Math.max(was, 13))
    setLabel(shortLabel(hit.label))
  }

  function here() {
    if (!navigator.geolocation) {
      setSnag('This device will not say where it is.')
      return
    }
    setSnag(undefined)
    setSeeking(true)
    navigator.geolocation.getCurrentPosition(
      (spot) => {
        setLat(clampLat(spot.coords.latitude))
        setLon(wrapLon(spot.coords.longitude))
        setZoom((was) => Math.max(was, 15))
        setLabel(undefined)
        setHits(undefined)
        setSeeking(false)
      },
      () => {
        setSnag('Location is off for this app, so the map cannot find you — search or drag instead.')
        setSeeking(false)
      },
      { timeout: 10000, maximumAge: 60000 },
    )
  }

  return (
    <div ref={root} className={styles.picker}>
      <form className={styles.seek} onSubmit={search}>
        <input
          className={styles.seekBox}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a place"
          aria-label="Search for a place"
          enterKeyHint="search"
        />
        <button type="submit" className={styles.seekGo} disabled={!query.trim() || seeking}>
          <SearchIcon size={15} />
          <span className={styles.seekWord}>{seeking ? 'Looking…' : 'Find'}</span>
        </button>
      </form>

      {/* Only when there is more than one answer. A single hit has already been
          flown to, and offering it back as a list to choose from is asking the
          reader to confirm something that visibly happened. */}
      {hits && hits.length > 1 && (
        <ul className={styles.hits}>
          {hits.map((hit, at) => (
            <li key={`${hit.lat},${hit.lon},${at}`}>
              <button type="button" className={styles.hit} onClick={() => land(hit)}>
                <span className={styles.hitName}>{shortLabel(hit.label)}</span>
                {/* Two answers can share a name and be a thousand miles apart.
                    The gloss is the only thing that tells them apart, so where
                    a shelf offered one it is shown rather than trimmed away. */}
                {hit.about && <span className={styles.hitAbout}>{hit.about}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        ref={box}
        className={styles.canvas}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {tiles.map((tile) => (
          <img
            key={tile.key}
            className={styles.tile}
            src={tile.url}
            alt=""
            aria-hidden="true"
            draggable={false}
            decoding="async"
            style={{ left: tile.left, top: tile.top }}
            onLoad={(e) => e.currentTarget.setAttribute('data-here', '')}
          />
        ))}
        <span className={styles.pin} data-live="" aria-hidden="true" />
        <div className={styles.zooms}>
          <button
            type="button"
            className={styles.zoom}
            onClick={() => step(1)}
            aria-label="Closer"
            disabled={zoom >= MAX_ZOOM}
          >
            +
          </button>
          <button
            type="button"
            className={styles.zoom}
            onClick={() => step(-1)}
            aria-label="Further out"
            disabled={zoom <= MIN_ZOOM}
          >
            −
          </button>
        </div>
        <span className={styles.credit}>{CREDIT}</span>
      </div>

      <p className={styles.aim} role="status">
        {label ?? 'Drag the map so the cross sits on the spot.'}
      </p>

      {snag && (
        <p className={styles.mapSnag} role="status">
          {snag}
        </p>
      )}

      <div className={styles.acts}>
        <button
          type="button"
          className={styles.act}
          data-lead="true"
          onClick={() => onPin({ lat, lon, zoom: Math.round(zoom), label })}
        >
          Pin this spot
        </button>
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

export default MapPicker
