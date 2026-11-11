import { useEffect, useReducer, useRef, useState } from 'react'
import { initialCampaign } from './campaign'
import { campaignDraftReducer, decodeDraft, encodeDraft, publishedConflict } from './campaignDraft'
import { readDraft, serializeCampaign, STORAGE_KEY, validateCampaign } from './campaignModel'
import type { CampaignData } from './campaignModel'
import { publishCampaign, PublishConflict } from './publishing'
import { usePublishedCampaign } from './usePublishedCampaign'

export function useCampaign(editing: boolean) {
  const [loaded] = useState(() => {
    let stored: string | null = null
    const result = readDraft(
      () => { stored = localStorage.getItem(STORAGE_KEY); return stored },
      { current: initialCampaign, past: [], base: null, changed: false },
      raw => decodeDraft(raw, initialCampaign),
    )
    return { ...result, stored }
  })
  const [draft, dispatch] = useReducer(campaignDraftReducer, loaded.data)
  const [recovery, setRecovery] = useState(loaded.error)
  const [saveError, setSaveError] = useState('')
  const [editError, setEditError] = useState('')
  const [externalChange, setExternalChange] = useState(false)
  const lastStored = useRef<string | null>(loaded.stored)
  const [publishing, setPublishing] = useState(false)
  const publishInFlight = useRef(false)
  const [publishError, setPublishError] = useState('')
  const [githubConflict, setGithubConflict] = useState(false)
  const [updated, setUpdated] = useState(false)
  const { published, connection, checkNow } = usePublishedCampaign()

  useEffect(() => {
    if (!published || publishing) return
    dispatch({ type: 'follow', published, editing, seed: initialCampaign })
  }, [published, editing, publishing, draft.current, draft.base])

  const previousBase = useRef(draft.base)
  useEffect(() => {
    const previous = previousBase.current
    previousBase.current = draft.base
    if (!previous || !draft.base || previous.sha === draft.base.sha) return
    setGithubConflict(false)
    setPublishError('')
    if (editing) return
    setUpdated(true)
    const timer = window.setTimeout(() => setUpdated(false), 4000)
    return () => { window.clearTimeout(timer); setUpdated(false) }
  }, [draft.base, editing])

  useEffect(() => {
    if (recovery || externalChange) return
    try {
      const raw = encodeDraft(draft)
      const existing = localStorage.getItem(STORAGE_KEY)
      if (existing !== lastStored.current && existing !== raw) {
        setExternalChange(true)
        return
      }
      if (existing !== raw) localStorage.setItem(STORAGE_KEY, raw)
      lastStored.current = raw
      setSaveError('')
    } catch { setSaveError('Could not save on this device. Export a backup before leaving.') }
  }, [draft, recovery, externalChange])

  const conflict = publishedConflict(draft, published?.version)
  const awaiting = !!draft.base && !!published && published.version.revision < draft.base.revision
  const error = recovery || saveError || (externalChange && (draft.changed || editing)
    ? 'Another tab changed the saved draft. Export this tab’s work before reloading. Autosave is paused.'
    : '')
  const canPublish = !!draft.base && draft.changed && !conflict && !publishing && !recovery && !externalChange && connection !== 'offline'
  const status = publishing ? 'Publishing…'
    : connection === 'offline' ? 'Offline · showing saved map'
    : conflict ? 'Newer campaign available'
    : githubConflict ? 'Waiting for newer deployment'
    : draft.changed ? 'Unpublished draft'
    : awaiting ? 'Committed · waiting for Pages'
    : connection === 'checking' ? 'Checking for updates…'
    : connection === 'failed' ? 'Could not check for updates'
    : updated ? 'Map updated'
    : 'Published'

  function resumeSaving() {
    try { lastStored.current = localStorage.getItem(STORAGE_KEY) } catch { /* Saving will report the error. */ }
    setRecovery('')
    setExternalChange(false)
  }

  async function publish(token: string) {
    if (!canPublish || !draft.base || !token.trim() || publishInFlight.current) return
    publishInFlight.current = true
    setPublishing(true)
    setPublishError('')
    setGithubConflict(false)
    try {
      const version = await publishCampaign(draft.current, draft.base, token.trim())
      dispatch({ type: 'published', version, data: draft.current })
    } catch (error) {
      setGithubConflict(error instanceof PublishConflict)
      setPublishError(error instanceof TypeError || (error instanceof DOMException && error.name === 'TimeoutError')
        ? 'Could not reach GitHub. Check your connection and retry. Your draft is still available.'
        : error instanceof Error ? error.message : 'Publishing failed. Your draft is still available.')
    } finally {
      publishInFlight.current = false
      setPublishing(false)
      checkNow()
    }
  }

  return {
    data: draft.current,
    replace: (data: CampaignData) => {
      try {
        const validated = validateCampaign(data)
        serializeCampaign(validated)
        dispatch({ type: 'replace', data: validated })
        setEditError('')
        return true
      } catch (error) {
        setEditError(error instanceof Error ? error.message : 'The change could not be applied.')
        return false
      }
    },
    undo: () => { dispatch({ type: 'undo' }); setEditError('') },
    canUndo: draft.past.length > 0,
    error,
    editError,
    recoveryRaw: loaded.raw,
    needsRecovery: !!recovery,
    resumeSaving,
    status,
    connection,
    changed: draft.changed,
    awaiting,
    publishing,
    canPublish,
    conflict,
    publishError,
    publish,
    checkNow,
    usePublished: conflict && published ? () => {
      dispatch({ type: 'use-published', published })
      setGithubConflict(false)
      setPublishError('')
      setEditError('')
    } : null,
  }
}

export function downloadText(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
