import { useState } from 'react'
import { allegianceLabels } from './campaign'
import { allegiances, markerTypes } from './campaignModel'
import type { Location } from './campaignModel'

interface Props {
  initial: Location
  day: number
  onSave: (location: Location) => void
  onCancel: () => void
  onDirty: (dirty: boolean) => void
}
export default function LocationEditor({ initial, day, onSave, onCancel, onDirty }: Props) {
  const [draft, setDraft] = useState(initial)
  function update(change: Partial<Location>) {
    const next = { ...draft, ...change }
    setDraft(next)
    onDirty(JSON.stringify(next) !== JSON.stringify(initial))
  }
  return <form className="editor-form" onSubmit={event => { event.preventDefault(); onSave({ ...draft, name: draft.name.trim(), faction: draft.faction.trim() }) }}>
    <label>Name<input required maxLength={120} value={draft.name} onChange={event => update({ name: event.target.value })} pattern=".*\S.*" /></label>
    <label>Type<select value={draft.type} onChange={event => update({ type: event.target.value as Location['type'] })}>{markerTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
    <label>Allegiance<select value={draft.allegiance} onChange={event => update({ allegiance: event.target.value as Location['allegiance'] })}>{allegiances.map(value => <option key={value} value={value}>{allegianceLabels[value]}</option>)}</select></label>
    <label>Faction<input maxLength={200} value={draft.faction} onChange={event => update({ faction: event.target.value })} /></label>
    <label>Description<textarea rows={4} maxLength={5000} value={draft.description} onChange={event => update({ description: event.target.value })} /></label>
    <label>Report day<input type="number" min={0} max={day} step={1} placeholder="No report" value={draft.reportedOnDay ?? ''} onChange={event => update({ reportedOnDay: event.target.value === '' ? null : Number(event.target.value) })} /></label>
    <button type="button" onClick={() => update({ reportedOnDay: day })}>Report today (day {day})</button>
    <p className="muted">Leave the report day blank for unknown intelligence. Editing other fields keeps the report date.</p>
    <div className="form-actions"><button type="submit" className="primary-button">Save marker</button><button type="button" onClick={onCancel}>Cancel</button></div>
  </form>
}
