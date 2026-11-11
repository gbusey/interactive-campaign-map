import { MAX_BACKUP_BYTES, serializeCampaign, validateCampaign } from './campaignModel.ts'
import type { CampaignData } from './campaignModel.ts'

export const REPOSITORY = 'gbusey/interactive-campaign-map'
const FILE_API = `https://api.github.com/repos/${REPOSITORY}/contents/public/campaign.json`
const MAIN = 'main'
export const SHA_PATTERN = /^[a-f0-9]{40}$/
export interface Revision { sha: string; revision: number }
export interface PublishedCampaign { version: Revision; data: CampaignData }

export class PublishConflict extends Error {
  constructor() {
    super('GitHub has a newer campaign. Wait for Pages to update, then load the published version before editing again.')
  }
}

export async function gitBlobSha(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  // Match GitHub's blob identifier for the exact bytes served by Pages.
  const header = new TextEncoder().encode(`blob ${bytes.length}\0`)
  const blob = new Uint8Array(header.length + bytes.length)
  blob.set(header)
  blob.set(bytes, header.length)
  const digest = await crypto.subtle.digest('SHA-1', blob)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function readPublishedCampaign(url: string, signal: AbortSignal): Promise<PublishedCampaign> {
  const requestUrl = new URL(url, window.location.href)
  requestUrl.searchParams.set('check', String(Date.now()))
  const response = await fetch(requestUrl, { cache: 'no-store', signal })
  if (!response.ok) throw new Error('Could not load the published campaign.')
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.length > MAX_BACKUP_BYTES + 100) throw new Error('Published campaign is too large.')
  const value = JSON.parse(new TextDecoder().decode(bytes))
  if (!Number.isSafeInteger(value?.revision) || value.revision < 0) throw new Error('Invalid published campaign revision.')
  const data = validateCampaign(value.campaign)
  serializeCampaign(data)
  return { version: { sha: await gitBlobSha(bytes), revision: value.revision }, data }
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
  }
  return btoa(binary)
}

function githubError(status: number) {
  if (status === 401) return new Error('GitHub rejected the token. Check whether it has expired or been revoked.')
  if (status === 403 || status === 404) return new Error('GitHub denied access. Check the token’s repository and Contents permissions, and whether main allows direct updates.')
  if (status === 429) return new Error('GitHub is rate limiting requests. Try again in a moment.')
  return new Error(`GitHub returned HTTP ${status}. Your draft is still available. You can retry.`)
}

export async function publishCampaign(data: CampaignData, base: Revision, token: string): Promise<Revision> {
  const revision = base.revision + 1
  if (!Number.isSafeInteger(revision)) throw new Error('The campaign revision is out of range.')
  const bytes = new TextEncoder().encode(`{"revision":${revision},"campaign":${serializeCampaign(data)}}\n`)
  const sha = await gitBlobSha(bytes)
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.object+json',
  }
  const file = await fetch(`${FILE_API}?ref=${MAIN}`, {
    headers, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000),
  })
  if (!file.ok) throw githubError(file.status)
  const metadata = await file.json()
  if (metadata?.type !== 'file' || !SHA_PATTERN.test(metadata.sha)) throw new Error('GitHub did not return campaign file metadata.')

  // A previous write can succeed even when its response is lost.
  if (metadata.sha === sha) return { sha, revision }
  if (metadata.sha !== base.sha) throw new PublishConflict()

  const response = await fetch(FILE_API, {
    method: 'PUT',
    headers: { ...headers, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `Publish campaign revision ${revision}`, content: encodeBase64(bytes), sha: base.sha, branch: MAIN }),
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
  })
  if (response.status === 409) throw new PublishConflict()
  if (!response.ok) throw githubError(response.status)
  return { sha, revision }
}
