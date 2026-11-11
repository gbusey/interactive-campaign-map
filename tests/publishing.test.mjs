import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { campaignDraftReducer, decodeDraft, encodeDraft, publishedConflict } from '../src/campaignDraft.ts'
import { publishCampaign, PublishConflict } from '../src/publishing.ts'
import { validateCampaign } from '../src/campaignModel.ts'

const seed = validateCampaign({
  schemaVersion: 1,
  mapId: 'kislev',
  day: 12,
  sampleMarkers: true,
  locations: [{ id: 'test', name: 'Test Watch', type: 'fortress', allegiance: 'friendly', x: 120, y: 200, description: '', faction: 'Kislev', reportedOnDay: 12 }],
})
const seedFile = Buffer.from(JSON.stringify({ revision: 0, campaign: seed }) + '\n')
const gitSha = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
const base = { sha: gitSha(seedFile), revision: 0 }
const initial = { current: seed, base, changed: false, past: [] }
const newer = { data: { ...seed, day: 19 }, version: { sha: 'b'.repeat(40), revision: 1 } }
const follow = (draft, published, editing = false) => campaignDraftReducer(draft, { type: 'follow', published, seed, editing })

test('the campaign file deployed by Pages has a valid revision and campaign', () => {
  const deployed = JSON.parse(readFileSync(new URL('../public/campaign.json', import.meta.url), 'utf8'))
  assert.ok(Number.isSafeInteger(deployed.revision) && deployed.revision >= 0)
  assert.doesNotThrow(() => validateCampaign(deployed.campaign))
})

test('legacy local edits are retained and can use the original published sample as their base', () => {
  const legacy = decodeDraft(JSON.stringify({ ...seed, day: 15 }), seed)
  assert.equal(legacy.changed, true)
  assert.equal(legacy.base, null)
  assert.equal(follow(legacy, newer), legacy)
  const migrated = follow(legacy, { version: base, data: seed }, true)
  assert.deepEqual(migrated.base, base)
  assert.equal(migrated.current.day, 15)
  assert.deepEqual(decodeDraft(encodeDraft(migrated), seed), migrated)
})

test('clean viewers follow a deployment while active editors and local drafts retain their base', () => {
  assert.equal(follow(initial, newer).current.day, 19)
  assert.equal(follow(initial, newer, true), initial)
  const draft = campaignDraftReducer(initial, { type: 'replace', data: { ...seed, day: 18 } })
  assert.equal(follow(draft, newer), draft)
  assert.equal(publishedConflict(draft, newer.version), true)
  const accepted = campaignDraftReducer(draft, { type: 'use-published', published: newer })
  assert.equal(accepted.changed, false)
  assert.equal(accepted.current.day, 19)
})

test('a successful commit survives an older Pages response and later local edits stay unpublished', () => {
  const draft = campaignDraftReducer(initial, { type: 'replace', data: { ...seed, day: 20 } })
  const ack = { type: 'published', version: { sha: 'a'.repeat(40), revision: 1 }, data: draft.current }
  const committed = campaignDraftReducer(draft, ack)
  assert.equal(committed.changed, false)
  assert.equal(follow(committed, { data: seed, version: base }), committed)
  assert.equal(publishedConflict(committed, base), false)
  const editedDuringWrite = campaignDraftReducer(draft, { type: 'replace', data: { ...seed, day: 21 } })
  const retained = campaignDraftReducer(editedDuringWrite, ack)
  assert.equal(retained.current.day, 21)
  assert.equal(retained.changed, true)
  assert.equal(retained.base.revision, 1)
})

test('publishing writes UTF-8 data with the checked main-branch SHA and token only in the authorization header', async t => {
  const data = { ...seed, day: 18, locations: seed.locations.map(location => ({ ...location, description: 'Река — scouts 🧭' })) }
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options })
    return options.method === 'PUT' ? new Response(null, { status: 200 }) : Response.json({ type: 'file', sha: base.sha })
  })
  const version = await publishCampaign(data, base, 'test-token')
  assert.equal(calls.length, 2)
  assert.match(calls[0].url, /^https:\/\/api.github.com\/repos\/gbusey\/interactive-campaign-map\/contents\/public\/campaign.json\?ref=main$/)
  const write = calls[1].options
  const body = JSON.parse(write.body)
  assert.equal(write.headers.Authorization, 'Bearer test-token')
  assert.equal(write.redirect, 'error')
  assert.equal(body.sha, base.sha)
  assert.equal(body.branch, 'main')
  assert.doesNotMatch(write.body, /test-token/)
  const bytes = Buffer.from(body.content, 'base64')
  assert.deepEqual(JSON.parse(bytes), { revision: 1, campaign: data })
  assert.equal(version.sha, gitSha(bytes))
})

test('a stale base blocks the write even while Pages is still serving that base', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ type: 'file', sha: newer.version.sha }))
  await assert.rejects(publishCampaign({ ...seed, day: 18 }, base, 'test-token'), PublishConflict)
  assert.equal(fetch.mock.callCount(), 1)
})

test('a write conflict after preflight is reported without a second write', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async (_url, options) => options.method === 'PUT'
    ? new Response(null, { status: 409 })
    : Response.json({ type: 'file', sha: base.sha }))
  await assert.rejects(publishCampaign({ ...seed, day: 18 }, base, 'test-token'), PublishConflict)
  assert.equal(fetch.mock.callCount(), 2)
})

test('retry recognizes an identical commit when GitHub applied the write but its response was lost', async t => {
  const data = { ...seed, day: 18 }
  const bytes = Buffer.from(JSON.stringify({ revision: 1, campaign: data }) + '\n')
  const sha = gitSha(bytes)
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ type: 'file', sha }))
  assert.deepEqual(await publishCampaign(data, base, 'test-token'), { sha, revision: 1 })
  assert.equal(fetch.mock.callCount(), 1)
})
