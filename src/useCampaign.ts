import { useEffect, useReducer, useState } from 'react'
import { initialCampaign } from './campaign'
import { campaignReducer, readDraft, serializeCampaign, STORAGE_KEY, validateCampaign } from './campaignModel'
import type { CampaignData } from './campaignModel'

export function useCampaign() {
  const [loaded] = useState(() => readDraft(() => localStorage.getItem(STORAGE_KEY), initialCampaign))
  const [state, dispatch] = useReducer(campaignReducer, { current: loaded.data, past: [] })
  const [recovery, setRecovery] = useState(loaded.error)
  const [saveError, setSaveError] = useState('')
  const [editError, setEditError] = useState('')
  const [externalChange, setExternalChange] = useState(false)

  useEffect(() => {
    if (recovery || externalChange) return
    try {
      localStorage.setItem(STORAGE_KEY, serializeCampaign(state.current))
      setSaveError('')
    } catch { setSaveError('Could not save on this device. Export a backup before leaving.') }
  }, [state.current, recovery, externalChange])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) setExternalChange(true)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return {
    data: state.current,
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
    canUndo: state.past.length > 0,
    error: recovery || saveError || (externalChange ? 'Another tab changed the saved draft. Export this tab’s work before reloading. Autosave is paused.' : ''),
    editError,
    recoveryRaw: loaded.raw,
    needsRecovery: !!recovery,
    resumeSaving: () => { setRecovery(''); setExternalChange(false) },
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
