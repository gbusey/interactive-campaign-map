import { useCallback, useEffect, useRef, useState } from 'react'
import { allegianceLabels, initialCampaign, markerTypes, typeLabels } from './campaign'
import { intelAge, MAX_BACKUP_BYTES, parseCampaign, serializeCampaign } from './campaignModel'
import type { Location, MarkerType } from './campaign'
import MapViewer from './MapViewer'
import LocationEditor from './LocationEditor'
import { downloadText, useCampaign } from './useCampaign'

type Panel = 'search' | 'layers' | 'details' | 'editor' | 'campaign' | null
export default function App() {
  const store = useCampaign()
  const { data } = store
  const [panel, setPanel] = useState<Panel>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editor, setEditor] = useState<Location | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [dirty, setDirty] = useState(false)
  const dirtyRef = useRef(false)
  dirtyRef.current = dirty
  const [editMode, setEditMode] = useState(false)
  const [placement, setPlacement] = useState<'add' | 'move' | null>(null)
  const [query, setQuery] = useState('')
  const [dayDraft, setDayDraft] = useState(String(data.day))
  const [notice, setNotice] = useState('')
  const [importError, setImportError] = useState('')
  const [visibleTypes, setVisibleTypes] = useState<MarkerType[]>([...markerTypes])
  const previousFocus = useRef<HTMLElement | null>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const searchButton = useRef<HTMLButtonElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const selected = data.locations.find(location => location.id === selectedId) ?? null
  const canLeave = useCallback(() => !dirtyRef.current || window.confirm('Discard unsaved marker changes?'), [])
  const markDirty = (value: boolean) => { dirtyRef.current = value; setDirty(value) }
  const clearForm = () => { setEditor(null); markDirty(false); setPlacement(null); setConfirmDelete(false) }

  const selectLocation = useCallback((location: Location) => {
    if (!canLeave()) return
    previousFocus.current = document.activeElement as HTMLElement
    setEditor(null); setDirty(false); dirtyRef.current = false; setPlacement(null); setConfirmDelete(false)
    setVisibleTypes(types => types.includes(location.type) ? types : [...types, location.type])
    setSelectedId(location.id)
    setPanel('details')
  }, [canLeave])

  const closePanel = () => {
    if (!canLeave()) return
    clearForm(); setPanel(null); setSelectedId(null)
    if (previousFocus.current?.isConnected) previousFocus.current.focus({ preventScroll: true })
    else searchButton.current?.focus({ preventScroll: true })
  }
  useEffect(() => {
    if (panel === 'search') searchInput.current?.focus()
    else if (panel) heading.current?.focus({ preventScroll: true })
  }, [panel, selectedId])
  useEffect(() => { setDayDraft(String(data.day)) }, [data.day])
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (placement) setPlacement(null)
      else if (panel) closePanel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  function togglePanel(next: 'search' | 'layers' | 'campaign') {
    if (panel === next) { closePanel(); return }
    if (!canLeave()) return
    previousFocus.current = document.activeElement as HTMLElement
    clearForm(); setSelectedId(null); setPanel(next)
  }
  function saveMarker(location: Location) {
    const exists = data.locations.some(item => item.id === location.id)
    if (!store.replace({ ...data, locations: exists ? data.locations.map(item => item.id === location.id ? location : item) : [...data.locations, location] })) return
    setVisibleTypes(types => types.includes(location.type) ? types : [...types, location.type])
    clearForm(); setSelectedId(location.id); setPanel('details'); setNotice('Marker saved locally')
  }
  function moveMarker(id: string, x: number, y: number) {
    if (!store.replace({ ...data, locations: data.locations.map(item => item.id === id ? { ...item, x, y } : item) })) return
    setNotice('Position saved locally')
  }
  function placeMarker(x: number, y: number) {
    if (placement === 'move' && selected) { moveMarker(selected.id, x, y); setPlacement(null); return }
    if (placement !== 'add') return
    setEditor({ id: crypto.randomUUID(), name: '', type: 'village', allegiance: 'neutral', x, y, faction: '', description: '', reportedOnDay: null })
    markDirty(true); setPlacement(null); setPanel('editor')
  }
  function beginAdd() {
    if (!canLeave()) return
    clearForm(); setSelectedId(null); setPanel(null); setPlacement('add')
  }
  function undo() {
    if (!canLeave()) return
    store.undo(); clearForm(); setSelectedId(null); setPanel('campaign'); setNotice('Change undone locally')
  }
  async function importBackup(file: File | undefined) {
    if (!file) return
    setImportError('')
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('Backup exceeds the 2 MB limit.')
      const imported = parseCampaign(await file.text())
      if (!canLeave() || !window.confirm(`Replace this device’s campaign with ${imported.locations.length} markers from the backup? You can undo this change.`)) return
      if (store.replace(imported)) { store.resumeSaving(); clearForm(); setSelectedId(null); setNotice('Backup imported locally') }
    } catch (error) { setImportError(error instanceof Error ? error.message : 'The backup could not be read.') }
    finally { if (fileInput.current) fileInput.current.value = '' }
  }
  function replaceWithEmpty() {
    if (!window.confirm('Remove all markers and reset to campaign day 1? You can undo this change.')) return
    store.replace({ ...data, day: 1, locations: [], sampleMarkers: false }); setSelectedId(null); setNotice('Started an empty campaign locally')
  }
  function deleteMarker(location: Location) {
    if (!store.replace({ ...data, locations: data.locations.filter(item => item.id !== location.id) })) return
    closePanel(); searchButton.current?.focus({ preventScroll: true }); setNotice('Marker deleted locally')
  }
  const results = data.locations.filter(location => location.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const latestReport = Math.max(0, ...data.locations.map(location => location.reportedOnDay ?? 0))

  return <main className={`map-app${panel ? ' panel-open' : ''}`}>
    <section className="map-area" aria-label="Map viewer">
      <MapViewer locations={data.locations} visibleTypes={visibleTypes} selected={selected} editable={editMode && !editor} placing={!!placement} onSelect={selectLocation} onMove={moveMarker} onPlace={placeMarker} />
      <nav className="map-toolbar" aria-label="Map tools">
        <button ref={searchButton} type="button" aria-expanded={panel === 'search'} aria-controls={panel === 'search' ? 'map-panel' : undefined} onClick={() => togglePanel('search')}>Search</button>
        <button type="button" aria-expanded={panel === 'layers'} aria-controls={panel === 'layers' ? 'map-panel' : undefined} onClick={() => togglePanel('layers')}>Layers</button>
        <button type="button" aria-pressed={editMode} onClick={() => {
          if (!canLeave()) return
          clearForm(); setEditMode(value => !value)
          if (panel === 'editor') setPanel(selected ? 'details' : null)
        }}>{editMode ? 'Editing' : 'Edit'}</button>
        <button type="button" aria-expanded={panel === 'campaign'} aria-controls={panel === 'campaign' ? 'map-panel' : undefined} onClick={() => togglePanel('campaign')}>Campaign</button>
      </nav>
      {editMode && !placement && <div className="edit-tools"><button type="button" onClick={beginAdd}>Add marker</button><button type="button" disabled={!store.canUndo} onClick={undo}>Undo</button></div>}
      {placement && <div className="placement-hint" role="status">{placement === 'add' ? 'Place new marker' : `Move ${selected?.name}`} · tap inside map or use crosshair <button type="button" onClick={() => setPlacement(null)}>Cancel</button></div>}
      <div className="save-status" role="status">{store.error ? 'Local save needs attention' : dirty ? 'Unsaved marker form' : notice || `${data.sampleMarkers ? 'Sample · ' : ''}Saved on this device`}</div>
      {store.error && <div className="storage-error" role="alert">{store.error} <button type="button" onClick={() => togglePanel('campaign')}>Backups</button></div>}
      {store.editError && !panel && <div className="storage-error" role="alert">{store.editError}</div>}
    </section>

    {panel && <aside id="map-panel" className="map-panel" aria-labelledby="panel-title">
      <header className="panel-header"><h1 ref={heading} tabIndex={-1} id="panel-title">{panel === 'search' ? 'Search' : panel === 'layers' ? 'Layers' : panel === 'campaign' ? 'Campaign' : panel === 'editor' ? (selected ? 'Edit marker' : 'New marker') : selected?.name ?? 'Marker'}</h1><button type="button" className="close-button" aria-label="Close panel" onClick={closePanel}>×</button></header>
      <div className="panel-content">
        {store.editError && <p className="form-error" role="alert">{store.editError}</p>}
        {panel === 'search' && <>
          <label className="sr-only" htmlFor="location-search">Search locations and armies</label>
          <input ref={searchInput} id="location-search" type="search" placeholder="Location or army…" value={query} onChange={event => setQuery(event.target.value)} />
          <p className="result-count" role="status">{results.length} {results.length === 1 ? 'result' : 'results'}</p>
          <ul className="search-results">{results.map(location => <li key={location.id}><button type="button" onClick={() => selectLocation(location)}><span>{location.name}</span><span className="result-meta"><span className={`allegiance-dot ${location.allegiance}`} />{location.type} · {allegianceLabels[location.allegiance]}</span></button></li>)}</ul>
          {!results.length && <p className="muted">No locations match your search.</p>}
        </>}
        {panel === 'layers' && <>
          <fieldset><legend>Show on map</legend>{markerTypes.map(type => <label className="layer-option" key={type}><input type="checkbox" checked={visibleTypes.includes(type)} onChange={event => setVisibleTypes(types => event.target.checked ? [...types, type] : types.filter(value => value !== type))} />{typeLabels[type]}</label>)}</fieldset>
          <div className="legend"><h2>Allegiance</h2>{Object.entries(allegianceLabels).map(([key, label]) => <div key={key}><span className={`allegiance-dot ${key}`} />{label}</div>)}</div>
          {data.sampleMarkers && <p className="sample-note">This dataset contains sample markers and reports.</p>}
        </>}
        {panel === 'editor' && editor && <LocationEditor key={editor.id} initial={editor} day={data.day} onSave={saveMarker} onDirty={markDirty} onCancel={closePanel} />}
        {panel === 'details' && selected && <>
          <p className="location-type">{selected.type === 'army' ? 'Army · last reported position' : selected.type}</p>
          <p className={`allegiance-badge ${selected.allegiance}`}><span className="allegiance-dot" />{allegianceLabels[selected.allegiance]}</p>
          <p className="description">{selected.description || 'No description.'}</p>
          <dl><div><dt>Faction</dt><dd>{selected.faction || 'Unknown'}</dd></div><div><dt>Intelligence</dt><dd>{intelAge(data.day, selected.reportedOnDay)}</dd></div>{selected.reportedOnDay !== null && <div><dt>Reported</dt><dd>Day {selected.reportedOnDay}</dd></div>}<div><dt>Campaign date</dt><dd>Day {data.day}</dd></div></dl>
          {editMode && (confirmDelete ? <div className="detail-actions">
            <p className="muted">Delete {selected.name}? You can undo this change.</p>
            <button type="button" className="danger-button" autoFocus onClick={() => deleteMarker(selected)}>Confirm deletion</button>
            <button type="button" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div> : <div className="detail-actions">
            <button type="button" onClick={() => { setEditor({ ...selected }); markDirty(false); setPanel('editor') }}>Edit details</button>
            <button type="button" onClick={() => setPlacement('move')}>Move on map</button>
            <button type="button" className="danger-button" onClick={() => setConfirmDelete(true)}>Delete marker</button>
          </div>)}
          {data.sampleMarkers && <p className="sample-note">Sample campaign data.</p>}
        </>}
        {panel === 'campaign' && <>
          {editMode ? <form className="editor-form" onSubmit={event => { event.preventDefault(); if (store.replace({ ...data, day: Number(dayDraft) })) setNotice('Campaign date saved locally') }}>
            <label>Campaign day<input type="number" required min={latestReport} max={Number.MAX_SAFE_INTEGER} step={1} value={dayDraft} onChange={event => setDayDraft(event.target.value)} /></label>
            <button type="submit">Set day</button><p className="muted">Reports age with the campaign clock. Day cannot precede an existing report (day {latestReport}).</p>
          </form> : <p>Campaign day {data.day}</p>}
          {editMode && <label className="layer-option"><input type="checkbox" checked={data.sampleMarkers} onChange={event => store.replace({ ...data, sampleMarkers: event.target.checked })} />Sample dataset</label>}
          <div className="detail-actions">
            <button type="button" onClick={() => downloadText(serializeCampaign(data), `kislev-day-${data.day}.json`)}>Export backup</button>
            {editMode && <>
              <button type="button" disabled={!store.canUndo} onClick={undo}>Undo last change</button>
              <button type="button" onClick={() => fileInput.current?.click()}>Import backup</button>
              <input ref={fileInput} hidden type="file" accept=".json,application/json" aria-label="Import campaign backup" onChange={event => void importBackup(event.target.files?.[0])} />
              <button type="button" className="danger-button" onClick={replaceWithEmpty}>Start empty campaign</button>
            </>}
          </div>
          {importError && <p className="form-error" role="alert">{importError}</p>}
          {store.needsRecovery && <div className="recovery-actions">
            {store.recoveryRaw && <button type="button" onClick={() => downloadText(store.recoveryRaw, 'kislev-unreadable-draft.json')}>Export unreadable draft</button>}
            <button type="button" onClick={() => { if (window.confirm('Replace the saved draft with the campaign currently visible? Export the unreadable draft first if needed.')) { store.resumeSaving(); setNotice('Local saving resumed') } }}>Use current campaign</button>
            <button type="button" onClick={() => { if (window.confirm('Restore the bundled sample campaign? Export the preserved draft first if needed.')) { store.replace(initialCampaign); store.resumeSaving() } }}>Restore sample campaign</button>
          </div>}
          <p className="muted">Saved on this device only. Export backups to keep a separate copy. Shared publishing comes next.</p>
        </>}
      </div>
    </aside>}
  </main>
}
