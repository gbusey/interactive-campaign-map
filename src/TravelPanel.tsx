import { useEffect, useState } from 'react'
import { defaultTravelScale, isTravelScale, pixelDistance, routeLegs, terrainTypes, travelEstimate } from './travel'
import type { MapPoint, Terrain, TravelScale, Waypoint } from './travel'

export const defaultTravelSettings = {
  profile: 'party' as 'party' | 'army',
  speed: '25',
  armyPace: '2.5',
  hours: '8',
  pacePercent: '100',
}

interface Props {
  points: Waypoint[]
  settings: typeof defaultTravelSettings
  scale: TravelScale
  editable: boolean
  calibration: MapPoint[] | null
  onSettings: (settings: typeof defaultTravelSettings) => void
  onTerrain: (index: number, terrain: Terrain) => void
  onRemove: (index: number) => void
  onClear: () => void
  onCalibrate: () => void
  onCancelCalibration: () => void
  onSaveScale: (scale: TravelScale) => boolean
}

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })
function format(value: number) {
  return value > 0 && value < 0.005 ? '<0.01' : numberFormat.format(value)
}

export default function TravelPanel({
  points, settings, scale, editable, calibration, onSettings, onTerrain, onRemove, onClear, onCalibrate,
  onCancelCalibration, onSaveScale,
}: Props) {
  const [conversion, setConversion] = useState(String(scale.milesPerImperialMile))
  const [scaleError, setScaleError] = useState('')
  useEffect(() => setConversion(String(scale.milesPerImperialMile)), [scale.milesPerImperialMile])
  const legs = routeLegs(points, scale)
  const distance = legs.reduce((total, leg) => total + leg.imperialMiles, 0)
  const army = settings.profile === 'army'
  const baseSpeed = army ? Number(settings.armyPace) : Number(settings.speed) / 10
  const pacePercent = Number(settings.pacePercent)
  const pace = baseSpeed > 0 && pacePercent > 0 ? baseSpeed * pacePercent / 100 : 0
  const estimate = travelEstimate(legs, scale.milesPerImperialMile, pace, Number(settings.hours))
  const pixels = calibration?.length === 2 ? pixelDistance(calibration[0], calibration[1]) : scale.pixelsPer100ImperialMiles

  function saveScale(nextScale: TravelScale) {
    if (!isTravelScale(nextScale)) {
      setScaleError('Choose two distinct ticks and enter 0.01–1,000 PF2e miles per imperial mile.')
      return
    }
    if (onSaveScale(nextScale)) {
      setConversion(String(nextScale.milesPerImperialMile))
      setScaleError('')
    }
  }

  return <div className="travel-panel">
    <div className="travel-result" aria-live="polite">
      <p className="travel-result-label">Travel time</p>
      <p className="travel-days">{estimate ? `${format(estimate.days)} ${format(estimate.days) === format(1) ? 'day' : 'days'}` : '—'}</p>
      {estimate && <p className="travel-hours">
        {format(estimate.hours)} hours on the move{estimate.arrivalDay > 0 && ` · Arrive on day ${format(estimate.arrivalDay)}`}
      </p>}
      <p className="travel-distance">{legs.length ? `${format(distance)} imperial mi total` : '— total distance'}</p>
      {estimate && estimate.extendedDays > 0 && <p className="travel-fatigue">
        {estimate.extendedDays === 1 ? '1 day exceeds' : `${format(estimate.extendedDays)} days exceed`} 8 hours of travel. Check fatigue.
      </p>}
    </div>

    <div className="editor-form travel-inputs">
      <label>Travelers
        <select value={settings.profile} onChange={event => onSettings({ ...settings, profile: event.target.value as typeof settings.profile })}>
          <option value="party">Party</option>
          <option value="army">Army</option>
        </select>
      </label>
      <label>{army ? 'Army pace (mph)' : 'Party Speed (ft)'}
        <input type="number" min="0.1" step="any" inputMode="decimal" value={army ? settings.armyPace : settings.speed}
          onChange={event => onSettings({ ...settings, [army ? 'armyPace' : 'speed']: event.target.value })} />
      </label>
      <label>Travel hours per day
        <input type="number" min="1" max="16" step="any" inputMode="decimal" value={settings.hours}
          onChange={event => onSettings({ ...settings, hours: event.target.value })} />
      </label>
      <label>Pace adjustment (%)
        <input type="number" min="0.1" step="any" inputMode="decimal" value={settings.pacePercent}
          onChange={event => onSettings({ ...settings, pacePercent: event.target.value })} />
      </label>
    </div>
    {legs.length > 0 && !estimate && <p className="form-error">Enter a positive Speed and pace, and 1–16 hours per day.</p>}
    {!calibration && <p className="travel-help">Tap the map or a marker to add a waypoint. Drag numbered waypoints to adjust the route.</p>}

    {points.length > 0 && <div className="editor-form travel-route">
      <h2>Route</h2>
      <ol className="route-legs">
        {points.map((point, index) => <li key={index}>
          {index === 0 ? <span>1 · Start</span> : <label>
            {index} → {index + 1} · {format(legs[index - 1].imperialMiles)} mi
            <select aria-label={`Terrain from waypoint ${index} to ${index + 1}`} value={point.terrain}
              onChange={event => onTerrain(index, event.target.value as Terrain)}>
              {Object.entries(terrainTypes).map(([value, terrain]) => <option key={value} value={value}>{terrain.label}</option>)}
            </select>
          </label>}
          <button type="button" aria-label={`Remove waypoint ${index + 1}`} title="Remove waypoint" onClick={() => onRemove(index)}>×</button>
        </li>)}
      </ol>
      <button type="button" onClick={onClear}>Clear route</button>
    </div>}

    <details className="travel-settings">
      <summary>Map scale and rules</summary>
      <p>{format(scale.pixelsPer100ImperialMiles)} map pixels per 100 imperial miles. {format(scale.milesPerImperialMile)} PF2e miles per imperial mile.</p>
      {editable && <div className="editor-form">
        <label>PF2e miles per imperial mile
          <input type="number" min="0.01" max="1000" step="any" value={conversion} onChange={event => setConversion(event.target.value)} />
        </label>
        {calibration ? <>
          <p role="status">{calibration.length < 2 ? `Select the ${calibration.length === 0 ? '0' : '100'} mile tick.` : `Measured ${format(pixels)} map pixels.`}</p>
          <button type="button" disabled={calibration.length !== 2} onClick={() => saveScale({ pixelsPer100ImperialMiles: pixels, milesPerImperialMile: Number(conversion) })}>Save calibration</button>
          <button type="button" onClick={onCancelCalibration}>Cancel calibration</button>
        </> : <>
          <button type="button" onClick={onCalibrate}>Calibrate from scale bar</button>
          <button type="button" onClick={() => saveScale({ ...scale, milesPerImperialMile: Number(conversion) })}>Save conversion</button>
          <button type="button" onClick={() => saveScale(defaultTravelScale)}>Use default scale</button>
        </>}
        {scaleError && <p className="form-error" role="alert">{scaleError}</p>}
      </div>}
      <p>PF2e clear terrain uses Speed ÷ 10 miles per hour. Difficult terrain halves that rate. Greater difficult terrain reduces it to a third. Set pace to 50% for half-speed exploration.</p>
      <p>GM Core lists fatigue at 8 hours of travel in normal temperatures. Longer days are planning estimates. Apply fatigue or your table’s Fortitude rule during play.</p>
      <a href="https://2e.aonprd.com/Rules.aspx?ID=2441" target="_blank" rel="noreferrer">PF2e travel rules</a>
    </details>
  </div>
}
