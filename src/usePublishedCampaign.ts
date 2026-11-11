import { useEffect, useState } from 'react'
import { readPublishedCampaign } from './publishing'
import type { PublishedCampaign } from './publishing'

export function usePublishedCampaign() {
  const [published, setPublished] = useState<PublishedCampaign>()
  const [connection, setConnection] = useState<'checking' | 'online' | 'offline' | 'failed'>('checking')
  const [check, setCheck] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let checking = false
    async function refresh() {
      if (checking || document.visibilityState !== 'visible') return
      if (!navigator.onLine) {
        setConnection('offline')
        return
      }
      checking = true
      try {
        const next = await readPublishedCampaign(
          `${import.meta.env.BASE_URL}campaign.json`,
          AbortSignal.any([controller.signal, AbortSignal.timeout(12_000)]),
        )
        if (controller.signal.aborted) return
        setPublished(previous => previous && (
          previous.version.revision > next.version.revision || previous.version.sha === next.version.sha
        ) ? previous : next)
        setConnection('online')
      } catch {
        if (!controller.signal.aborted) setConnection(navigator.onLine ? 'failed' : 'offline')
      } finally {
        checking = false
      }
    }

    const offline = () => setConnection('offline')
    void refresh()
    const interval = window.setInterval(refresh, 30_000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    window.addEventListener('online', refresh)
    window.addEventListener('offline', offline)
    return () => {
      controller.abort()
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('online', refresh)
      window.removeEventListener('offline', offline)
    }
  }, [check])

  return { published, connection, checkNow: () => setCheck(value => value + 1) }
}
