import test from 'node:test'
import assert from 'node:assert/strict'
import { defaultTravelScale, routeLegs, travelEstimate } from '../src/travel.ts'
import { parseCampaign, serializeCampaign } from '../src/campaignModel.ts'

const points = [
  { x: 0, y: 0, terrain: 'clear' },
  { x: 21, y: 0, terrain: 'clear' },
  { x: 21, y: 42, terrain: 'difficult' },
  { x: 84, y: 42, terrain: 'greater' },
]

test('the map scale and terrain yield separate distance and movement time for a mixed route', () => {
  const legs = routeLegs(points, defaultTravelScale)
  assert.deepEqual(legs.map(leg => leg.imperialMiles), [10, 20, 30])
  assert.deepEqual(travelEstimate(legs, 1, 2.5, 8), { hours: 56, days: 7, arrivalDay: 7, extendedDays: 0 })
  assert.deepEqual(travelEstimate(legs, 1, 2.5, 16), { hours: 56, days: 3.5, arrivalDay: 4, extendedDays: 3 })
})

test('a longer daily cap flags only days that actually exceed eight hours', () => {
  const clear = imperialMiles => [{ imperialMiles, terrain: 'clear' }]
  assert.equal(travelEstimate(clear(20), 1, 2.5, 16).extendedDays, 0)
  assert.equal(travelEstimate(clear(20.1), 1, 2.5, 16).extendedDays, 1)
  assert.equal(travelEstimate(clear(40), 1, 2.5, 16).arrivalDay, 1)
  assert.equal(travelEstimate(clear(60), 1, 2.5, 16).extendedDays, 1)
  assert.equal(travelEstimate(clear(60.1), 1, 2.5, 16).extendedDays, 2)
  assert.equal(travelEstimate(clear(20), 1, 0, 8), null)
  assert.equal(travelEstimate(clear(20), 1, 2.5, 17), null)
})

test('imperial mile conversion adjusts pace math while preserving map distance', () => {
  const legs = routeLegs(points.slice(0, 2), { pixelsPer100ImperialMiles: 105, milesPerImperialMile: 0.5 })
  assert.equal(legs[0].imperialMiles, 20)
  assert.equal(travelEstimate(legs, 0.5, 2.5, 8).hours, 4)
})

test('shared calibration survives a backup round trip and older backups remain valid', () => {
  const campaign = { schemaVersion: 1, mapId: 'kislev', day: 1, sampleMarkers: false, locations: [] }
  assert.deepEqual(parseCampaign(serializeCampaign(campaign)), campaign)
  const custom = { ...campaign, travelScale: { pixelsPer100ImperialMiles: 215, milesPerImperialMile: 1.25 } }
  assert.deepEqual(parseCampaign(serializeCampaign(custom)), custom)
  assert.throws(() => parseCampaign(serializeCampaign({ ...custom, travelScale: { ...custom.travelScale, pixelsPer100ImperialMiles: 0 } })), /travel scale/)
})
