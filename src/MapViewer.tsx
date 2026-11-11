import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { allegianceLabels, campaign } from './campaign'
import type { Location, MarkerType } from './campaign'
import { markerSvg } from './markerIcons'

interface Props {
  visibleTypes: MarkerType[]
  selected: Location | null
  onSelect: (location: Location) => void
}

export default function MapViewer({ visibleTypes, selected, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markers = useRef(new Map<string, L.Marker>())
  const selectRef = useRef(onSelect)
  const selectedRef = useRef(selected)
  const [imageFailed, setImageFailed] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [retry, setRetry] = useState(0)
  selectRef.current = onSelect
  selectedRef.current = selected

  useEffect(() => {
    if (!container.current) return
    const bounds = L.latLngBounds([0, 0], [campaign.height, campaign.width])
    const map = L.map(container.current, {
      crs: L.CRS.Simple, zoomControl: false, minZoom: -5, maxZoom: 2,
      zoomSnap: 0.25, zoomDelta: 0.5, maxBounds: bounds.pad(0.35),
      maxBoundsViscosity: 0.8,
    })
    mapRef.current = map
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>')
    setImageFailed(false)
    setImageLoaded(false)
    L.imageOverlay(campaign.mapImage, bounds, { alt: 'Kislev campaign map' })
      .on('error', () => setImageFailed(true))
      .on('load', () => setImageLoaded(true)).addTo(map)
    map.fitBounds(bounds, { padding: [16, 16], animate: false })
    map.setMinZoom(map.getBoundsZoom(bounds, false, L.point(32, 32)))

    for (const location of campaign.locations) {
      const content = document.createElement('span')
      content.textContent = location.name
      const marker = L.marker([campaign.height - location.y, location.x], {
        icon: L.divIcon({
          className: `campaign-marker ${location.allegiance}`,
          html: `<span class="marker-symbol">${markerSvg(location.type)}</span>`,
          iconSize: [44, 44], iconAnchor: [22, 22],
        }),
        title: location.name,
        alt: `${location.name}, ${location.type}, ${allegianceLabels[location.allegiance]}`,
        keyboard: true, riseOnHover: true,
      }).on('click', () => selectRef.current(location))
        .on('keydown', event => {
          const key = (event as L.LeafletKeyboardEvent).originalEvent
          if (key.key === 'Enter' || key.key === ' ') {
            L.DomEvent.stop(key)
            selectRef.current(location)
          }
        })
        .bindTooltip(content, { permanent: true, direction: 'bottom', offset: [0, 17], className: 'marker-label' })
        .addTo(map)
      markers.current.set(location.id, marker)
      marker.getElement()?.setAttribute('aria-label', marker.options.alt!)
    }

    const updateLabels = () => container.current?.classList.toggle('show-labels', map.getZoom() >= -0.5)
    map.on('zoomend', updateLabels)
    updateLabels()
    const resize = new ResizeObserver(() => {
      map.invalidateSize({ pan: true, animate: false })
      map.setMinZoom(map.getBoundsZoom(bounds, false, L.point(32, 32)))
      const location = selectedRef.current
      if (location) map.panInside([campaign.height - location.y, location.x], { padding: [48, 48], animate: false })
    })
    resize.observe(container.current)
    return () => {
      resize.disconnect()
      markers.current.clear()
      map.remove()
      mapRef.current = null
    }
  }, [retry])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    for (const location of campaign.locations) {
      const marker = markers.current.get(location.id)!
      if (visibleTypes.includes(location.type)) marker.addTo(map)
      else marker.remove()
      const element = marker.getElement()
      element?.classList.toggle('is-selected', selected?.id === location.id)
      element?.setAttribute('aria-pressed', String(selected?.id === location.id))
      element?.setAttribute('aria-label', marker.options.alt!)
      marker.setZIndexOffset(selected?.id === location.id ? 1000 : 0)
    }
  }, [visibleTypes, selected, retry])

  useEffect(() => {
    if (selected) mapRef.current?.panTo([campaign.height - selected.y, selected.x], { animate: false })
  }, [selected])

  return (
    <>
      <div ref={container} className="map-canvas" role="region" aria-label="Campaign map" />
      {!imageLoaded && !imageFailed && <span className="map-loading" role="status">Loading map…</span>}
      <div className="map-navigation" role="group" aria-label="Map navigation">
        <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => mapRef.current?.zoomIn()}>+</button>
        <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => mapRef.current?.zoomOut()}>−</button>
        <button type="button" className="fit-button" onClick={() => mapRef.current?.fitBounds([[0, 0], [campaign.height, campaign.width]], { padding: [16, 16], animate: false })}>Fit map</button>
      </div>
      {imageFailed && <div className="map-error" role="alert">Map image could not load. <button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
    </>
  )
}
