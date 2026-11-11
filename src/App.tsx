import { useCallback, useEffect, useRef, useState } from 'react'
import { allegianceLabels, campaign, markerTypes, typeLabels } from './campaign'
import type { Location, MarkerType } from './campaign'
import MapViewer from './MapViewer'

export default function App() {
  const [panel, setPanel] = useState<'search' | 'layers' | 'details' | null>(null)
  const [selected, setSelected] = useState<Location | null>(null)
  const [query, setQuery] = useState('')
  const [visibleTypes, setVisibleTypes] = useState<MarkerType[]>([...markerTypes])
  const previousFocus = useRef<HTMLElement | null>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const searchButton = useRef<HTMLButtonElement>(null)

  const selectLocation = useCallback((location: Location) => {
    previousFocus.current = document.activeElement as HTMLElement
    setVisibleTypes(types => types.includes(location.type) ? types : [...types, location.type])
    setSelected(location)
    setPanel('details')
  }, [])

  const closePanel = useCallback(() => {
    setPanel(null)
    setSelected(null)
    const target = previousFocus.current
    if (target?.isConnected) target.focus({ preventScroll: true })
    else searchButton.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    if (panel === 'search') searchInput.current?.focus()
    else if (panel) heading.current?.focus({ preventScroll: true })
  }, [panel, selected])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && panel) closePanel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [panel, closePanel])

  function togglePanel(next: 'search' | 'layers') {
    if (panel === next) { closePanel(); return }
    previousFocus.current = document.activeElement as HTMLElement
    setSelected(null)
    setPanel(next)
  }

  const results = campaign.locations.filter(location => location.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const intelAge = selected?.reportedOnDay == null ? null : campaign.day - selected.reportedOnDay

  return (
    <main className={`map-app${panel ? ' panel-open' : ''}`}>
      <section className="map-area" aria-label="Map viewer">
        <MapViewer visibleTypes={visibleTypes} selected={selected} onSelect={selectLocation} />
        <nav className="map-toolbar" aria-label="Map tools">
          <button ref={searchButton} type="button" aria-expanded={panel === 'search'} aria-controls={panel === 'search' ? 'map-panel' : undefined} onClick={() => togglePanel('search')}>Search</button>
          <button type="button" aria-expanded={panel === 'layers'} aria-controls={panel === 'layers' ? 'map-panel' : undefined} onClick={() => togglePanel('layers')}>Layers</button>
        </nav>
        {campaign.sampleMarkers && <span className="sample-indicator">Sample markers</span>}
      </section>

      {panel && <aside id="map-panel" className="map-panel" aria-labelledby="panel-title">
        <header className="panel-header">
          <h1 ref={heading} tabIndex={-1} id="panel-title">{panel === 'search' ? 'Search' : panel === 'layers' ? 'Layers' : selected?.name}</h1>
          <button type="button" className="close-button" aria-label="Close panel" onClick={closePanel}>×</button>
        </header>
        <div className="panel-content">
          {panel === 'search' && <>
            <label className="sr-only" htmlFor="location-search">Search locations and armies</label>
            <input ref={searchInput} id="location-search" type="search" placeholder="Location or army…" value={query} onChange={event => setQuery(event.target.value)} />
            <p className="result-count" role="status">{results.length} {results.length === 1 ? 'result' : 'results'}</p>
            <ul className="search-results">{results.map(location => <li key={location.id}>
              <button type="button" onClick={() => selectLocation(location)}>
                <span>{location.name}</span>
                <span className="result-meta"><span className={`allegiance-dot ${location.allegiance}`} />{location.type} · {allegianceLabels[location.allegiance]}</span>
              </button>
            </li>)}</ul>
            {!results.length && <p className="muted">No locations match your search.</p>}
          </>}
          {panel === 'layers' && <>
            <fieldset><legend>Show on map</legend>{markerTypes.map(type => <label className="layer-option" key={type}>
              <input type="checkbox" checked={visibleTypes.includes(type)} onChange={event => setVisibleTypes(types => event.target.checked ? [...types, type] : types.filter(value => value !== type))} />{typeLabels[type]}
            </label>)}</fieldset>
            <div className="legend"><h2>Allegiance</h2>{Object.entries(allegianceLabels).map(([key, label]) => <div key={key}><span className={`allegiance-dot ${key}`} />{label}</div>)}</div>
            {campaign.sampleMarkers && <p className="sample-note">Marker positions and reports are examples, not campaign intelligence.</p>}
          </>}
          {panel === 'details' && selected && <>
            <p className="location-type">{selected.type === 'army' ? 'Army · last reported position' : selected.type}</p>
            <p className={`allegiance-badge ${selected.allegiance}`}><span className="allegiance-dot" />{allegianceLabels[selected.allegiance]}</p>
            <p className="description">{selected.description}</p>
            <dl>
              <div><dt>Faction</dt><dd>{selected.faction}</dd></div>
              <div><dt>Intelligence</dt><dd>{intelAge === null ? 'No report' : intelAge === 0 ? 'Current day' : `${intelAge} campaign ${intelAge === 1 ? 'day' : 'days'} old`}</dd></div>
              {selected.reportedOnDay !== null && <div><dt>Reported</dt><dd>Day {selected.reportedOnDay}</dd></div>}
              <div><dt>Campaign date</dt><dd>Day {campaign.day}</dd></div>
            </dl>
            {campaign.sampleMarkers && <p className="sample-note">Sample marker · replace with player-known intelligence when the editor is available.</p>}
          </>}
        </div>
      </aside>}
    </main>
  )
}
