import { campaignReducer, parseCampaign, serializeCampaign, validateCampaign } from './campaignModel.ts'
import type { CampaignData, CampaignHistory } from './campaignModel.ts'
import { SHA_PATTERN } from './publishing.ts'
import type { PublishedCampaign, Revision } from './publishing.ts'

export interface Draft extends CampaignHistory {
  base: Revision | null
  changed: boolean
}
type Action =
  | { type: 'replace'; data: CampaignData }
  | { type: 'undo' }
  | { type: 'follow'; published: PublishedCampaign; editing: boolean; seed: CampaignData }
  | { type: 'use-published'; published: PublishedCampaign }
  | { type: 'published'; version: Revision; data: CampaignData }

export function sameCampaign(a: CampaignData, b: CampaignData): boolean {
  return a === b || serializeCampaign(a) === serializeCampaign(b)
}

export function campaignDraftReducer(draft: Draft, action: Action): Draft {
  if (action.type === 'replace' || action.type === 'undo') {
    const next = campaignReducer(draft, action)
    return next === draft ? draft : { ...next, base: draft.base, changed: true }
  }
  if (action.type === 'published') {
    return { ...draft, base: action.version, changed: !sameCampaign(draft.current, action.data) }
  }
  const { data, version } = action.published
  if (action.type === 'use-published') return { current: data, base: version, changed: false, past: [] }
  if (draft.base && version.revision < draft.base.revision) return draft
  if (sameCampaign(draft.current, data)) {
    if (draft.base?.sha === version.sha && !draft.changed) return draft
    return { ...draft, base: version, changed: false }
  }
  if (draft.base?.sha === version.sha) return draft
  // Step 3 saved raw data without a base. Its edits can safely start from the initial published seed.
  if (!draft.base && draft.changed && version.revision === 0 && sameCampaign(action.seed, data)) {
    return { ...draft, base: version }
  }
  if (draft.changed || action.editing) return draft
  return { current: data, base: version, changed: false, past: [] }
}

export function publishedConflict(draft: Draft, version: Revision | undefined): boolean {
  if (!version) return false
  if (!draft.base) return true
  return version.revision >= draft.base.revision && version.sha !== draft.base.sha
}

export function encodeDraft(draft: Draft): string {
  return JSON.stringify({ draftVersion: 1, data: draft.current, base: draft.base, changed: draft.changed })
}

export function decodeDraft(raw: string, seed: CampaignData): Draft {
  const value = JSON.parse(raw)
  if (value?.draftVersion === undefined) {
    const current = parseCampaign(raw)
    return { current, past: [], base: null, changed: !sameCampaign(current, seed) }
  }
  const base = value.base
  if (value.draftVersion !== 1 || typeof value.changed !== 'boolean'
    || (base !== null && (!base || typeof base.sha !== 'string' || !SHA_PATTERN.test(base.sha) || !Number.isSafeInteger(base.revision) || base.revision < 0))) {
    throw new Error('Invalid saved draft.')
  }
  const current = validateCampaign(value.data)
  serializeCampaign(current)
  return { current, past: [], base, changed: value.changed }
}
