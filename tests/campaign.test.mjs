import test from 'node:test'
import assert from 'node:assert/strict'
import { campaignReducer, parseCampaign, readDraft, validateCampaign, intelAge, MAP_WIDTH } from '../src/campaignModel.ts'

const marker = { id: 'one', name: 'Test fortress', type: 'fortress', allegiance: 'friendly', x: 120, y: 200, description: 'A report', faction: 'Kislev', reportedOnDay: 3 }
const initial = { schemaVersion: 1, mapId: 'kislev', day: 5, sampleMarkers: false, locations: [marker] }

test('backups round-trip without losing campaign intelligence or positions', () => {
  assert.deepEqual(parseCampaign(JSON.stringify(initial)), initial)
})
test('malformed, incompatible, duplicate, and out-of-bounds imports are rejected', () => {
  for (const value of [null, {}, { ...initial, schemaVersion: 2 }, { ...initial, mapId: 'other' }, { ...initial, day: 1.5 }, { ...initial, locations: [marker, marker] }, ...[
    { x: MAP_WIDTH + 1 }, { x: NaN }, { name: '  ' }, { type: 'castle' }, { allegiance: 'blue' }, { reportedOnDay: 6 }, { reportedOnDay: -1 }, { description: 'x'.repeat(5001) },
  ].map(change => ({ ...initial, locations: [{ ...marker, ...change }] }))]) assert.throws(() => validateCampaign(value))
  assert.throws(() => parseCampaign('{broken'))
  assert.throws(() => parseCampaign(' '.repeat(2_000_001)), /2 MB/)
  assert.deepEqual(initial.locations, [marker])
})
test('empty campaigns, unknown reports, and map-edge positions are valid', () => {
  assert.deepEqual(validateCampaign({ ...initial, locations: [] }).locations, [])
  assert.equal(validateCampaign({ ...initial, locations: [{ ...marker, reportedOnDay: null, x: 0, y: 2000 }] }).locations[0].reportedOnDay, null)
})
test('campaign clock ages intelligence without modifying report dates', () => {
  assert.equal(intelAge(3, 3), 'Current day')
  assert.equal(intelAge(4, 3), '1 campaign day old')
  assert.equal(intelAge(8, 3), '5 campaign days old')
  assert.equal(intelAge(8, null), 'No report')
  const changed = campaignReducer({ current: initial, past: [] }, { type: 'replace', data: { ...initial, day: 8 } })
  assert.equal(changed.current.locations[0].reportedOnDay, 3)
})
test('undo restores movement, deletion, and whole-backup replacement', () => {
  let state = { current: initial, past: [] }
  const moved = { ...initial, locations: [{ ...marker, x: 999 }] }
  state = campaignReducer(state, { type: 'replace', data: moved })
  state = campaignReducer(state, { type: 'replace', data: { ...initial, locations: [] } })
  state = campaignReducer(state, { type: 'replace', data: { ...initial, day: 9 } })
  state = campaignReducer(state, { type: 'undo' })
  assert.equal(state.current.locations.length, 0)
  state = campaignReducer(state, { type: 'undo' })
  assert.equal(state.current.locations[0].x, 999)
  state = campaignReducer(state, { type: 'undo' })
  assert.deepEqual(state.current, initial)
  assert.deepEqual(campaignReducer(state, { type: 'undo' }), state)
})
test('undo ignores unchanged data and keeps at most 50 previous states', () => {
  let state = { current: initial, past: [] }
  assert.equal(campaignReducer(state, { type: 'replace', data: structuredClone(initial) }), state)
  for (let day = 6; day < 100; day++) state = campaignReducer(state, { type: 'replace', data: { ...initial, day } })
  assert.equal(state.past.length, 50)
})
test('draft recovery preserves unreadable originals and handles unavailable storage', () => {
  assert.deepEqual(readDraft(() => JSON.stringify(initial), initial, parseCampaign).data, initial)
  assert.equal(readDraft(() => null, initial, parseCampaign).error, '')
  const corrupted = readDraft(() => '{broken', initial, parseCampaign)
  assert.equal(corrupted.raw, '{broken')
  assert.match(corrupted.error, /preserved/)
  assert.deepEqual(corrupted.data, initial)
  assert.match(readDraft(() => { throw new Error('Denied') }, initial, parseCampaign).error, /unavailable/)
})
