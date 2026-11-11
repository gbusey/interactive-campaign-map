export const markerTypes = ['city', 'fortress', 'village', 'army'] as const
export const allegiances = ['friendly', 'hostile', 'contested', 'neutral'] as const
export type MarkerType = (typeof markerTypes)[number]
export type Allegiance = (typeof allegiances)[number]
export interface Location {
  id: string
  name: string
  type: MarkerType
  allegiance: Allegiance
  /** Image pixels from the top-left corner, independent of zoom. */
  x: number
  y: number
  description: string
  faction: string
  reportedOnDay: number | null
}
export interface CampaignData {
  schemaVersion: 1
  mapId: 'kislev'
  day: number
  sampleMarkers: boolean
  locations: Location[]
}
export const MAP_WIDTH = 2829
export const MAP_HEIGHT = 2000
export const STORAGE_KEY = 'kislev-campaign-v1'
export const MAX_BACKUP_BYTES = 2_000_000

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
function integer(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}
function text(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length <= max
}
export function validateCampaign(value: unknown): CampaignData {
  if (!record(value) || value.schemaVersion !== 1 || value.mapId !== 'kislev') throw new Error('This is not a supported Kislev campaign backup (version 1).')
  if (!integer(value.day) || typeof value.sampleMarkers !== 'boolean' || !Array.isArray(value.locations) || value.locations.length > 5000) throw new Error('Invalid campaign date or marker list.')
  const day = value.day
  const ids = new Set<string>()
  const locations = value.locations.map((item, index): Location => {
    if (!record(item) || !text(item.id, 100) || !item.id.trim() || ids.has(item.id) || !text(item.name, 120) || !item.name.trim()
      || !markerTypes.includes(item.type as MarkerType) || !allegiances.includes(item.allegiance as Allegiance)
      || typeof item.x !== 'number' || !Number.isFinite(item.x) || item.x < 0 || item.x > MAP_WIDTH
      || typeof item.y !== 'number' || !Number.isFinite(item.y) || item.y < 0 || item.y > MAP_HEIGHT
      || !text(item.description, 5000) || !text(item.faction, 200)
      || !(item.reportedOnDay === null || integer(item.reportedOnDay) && item.reportedOnDay <= day)) {
      throw new Error(`Invalid or duplicate marker at position ${index + 1}. Check its fields, coordinates, and report date.`)
    }
    ids.add(item.id)
    return { id: item.id, name: item.name, type: item.type as MarkerType, allegiance: item.allegiance as Allegiance, x: item.x, y: item.y, description: item.description, faction: item.faction, reportedOnDay: item.reportedOnDay as number | null }
  })
  return { schemaVersion: 1, mapId: 'kislev', day: value.day, sampleMarkers: value.sampleMarkers, locations }
}
export function parseCampaign(raw: string): CampaignData {
  if (new TextEncoder().encode(raw).byteLength > MAX_BACKUP_BYTES) throw new Error('Backup exceeds the 2 MB limit.')
  let value: unknown
  try { value = JSON.parse(raw) } catch { throw new Error('The backup is not valid JSON.') }
  return validateCampaign(value)
}
export function serializeCampaign(data: CampaignData): string {
  const raw = JSON.stringify(data)
  if (new TextEncoder().encode(raw).byteLength > MAX_BACKUP_BYTES) throw new Error('Campaign exceeds the 2 MB backup limit. Shorten descriptions or remove unused markers.')
  return raw
}
export function intelAge(day: number, reportedOnDay: number | null): string {
  if (reportedOnDay === null) return 'No report'
  const age = day - reportedOnDay
  return age === 0 ? 'Current day' : `${age} campaign ${age === 1 ? 'day' : 'days'} old`
}
export interface CampaignHistory { current: CampaignData; past: CampaignData[] }
export function campaignReducer(state: CampaignHistory, action: { type: 'replace'; data: CampaignData } | { type: 'undo' }): CampaignHistory {
  if (action.type === 'undo') {
    if (!state.past.length) return state
    return { current: state.past[state.past.length - 1]!, past: state.past.slice(0, -1) }
  }
  if (JSON.stringify(state.current) === JSON.stringify(action.data)) return state
  return { current: action.data, past: [...state.past.slice(-49), state.current] }
}

export function readDraft<T>(read: () => string | null, fallback: T, decode: (raw: string) => T) {
  try {
    const raw = read()
    if (raw === null) return { data: fallback, error: '', raw: '' }
    try { return { data: decode(raw), error: '', raw: '' } }
    catch { return { data: fallback, error: 'The saved draft could not be read. It has been preserved; export it before choosing a replacement.', raw } }
  } catch { return { data: fallback, error: 'Browser storage is unavailable. Changes stay in memory; export a backup before leaving.', raw: '' } }
}
