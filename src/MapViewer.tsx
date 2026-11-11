import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { allegianceLabels, campaign } from './campaign'
import type { Location, MarkerType } from './campaign'
import { markerSvg } from './markerIcons'
import type { MapPoint } from './travel'

interface Props {
  visibleTypes: MarkerType[]
  selected: Location | null
  locations: Location[]
  editable: boolean
  placing: boolean
  placingWaypoint?: boolean
  calibrating?: boolean
  routePoints?: MapPoint[]
  onMoveWaypoint?: (index: number, point: MapPoint) => void
  onSelect: (location: Location) => void
  onMove: (id: string, x: number, y: number) => void
  onPlace: (x: number, y: number) => void
}

const toLatLng = (point: MapPoint): L.LatLngTuple => [campaign.height - point.y, point.x]

function imagePoint(point: L.LatLng): MapPoint {
  return {
    x: Math.max(0, Math.min(campaign.width, point.lng)),
    y: Math.max(0, Math.min(campaign.height, campaign.height - point.lat)),
  }
}

export default function MapViewer({
  visibleTypes, selected, locations, editable, placing, placingWaypoint, calibrating, routePoints, onMoveWaypoint,
  onSelect, onMove, onPlace,
}: Props) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markers = useRef(new Map<string, L.Marker>())
  const actions = useRef({ onSelect, onMove, onPlace, placing, placingWaypoint, calibrating, locations })
  const selectedRef = useRef(selected)
  const [imageFailed, setImageFailed] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [retry, setRetry] = useState(0)
  actions.current = { onSelect, onMove, onPlace, placing, placingWaypoint, calibrating, locations }
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

    map.on('click', (event: L.LeafletMouseEvent) => {
      if (actions.current.placing && bounds.contains(event.latlng)) {
        actions.current.onPlace(Math.round(event.latlng.lng), Math.round(campaign.height - event.latlng.lat))
      }
    })

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
    const ids = new Set(locations.map(location => location.id))
    for (const [id, marker] of markers.current) {
      if (!ids.has(id)) { marker.remove(); markers.current.delete(id) }
    }
    for (const location of locations) {
      let marker = markers.current.get(location.id)
      if (!marker) {
        const id = location.id
        const activate = () => {
          const { locations, placingWaypoint, placing, calibrating, onPlace, onSelect } = actions.current
          const current = locations.find(item => item.id === id)
          if (!current) return
          if (placingWaypoint) onPlace(current.x, current.y)
          else if (!placing && !calibrating) onSelect(current)
        }
        marker = L.marker([campaign.height - location.y, location.x], { keyboard: true, riseOnHover: true, draggable: true })
          .on('click', activate)
          .on('keydown', event => {
            const key = (event as L.LeafletKeyboardEvent).originalEvent
            if (key.key === 'Enter' || key.key === ' ') {
              L.DomEvent.stop(key)
              activate()
            }
          })
          .on('dragend', event => {
            const moved = event.target as L.Marker
            const point = moved.getLatLng()
            const x = Math.round(Math.max(0, Math.min(campaign.width, point.lng)))
            const y = Math.round(Math.max(0, Math.min(campaign.height, campaign.height - point.lat)))
            moved.setLatLng([campaign.height - y, x])
            actions.current.onMove(id, x, y)
          })
        markers.current.set(id, marker)
      }
      const signature = `type-${location.type}`
      if (marker.options.icon?.options.className !== `campaign-marker ${location.allegiance} ${signature}`) {
        marker.setIcon(L.divIcon({
          className: `campaign-marker ${location.allegiance} ${signature}`,
          html: `<span class="marker-symbol">${markerSvg(location.type)}</span>`,
          iconSize: [44, 44], iconAnchor: [22, 22],
        }))
      }
      marker.setLatLng([campaign.height - location.y, location.x])
      const label = document.createElement('span')
      label.textContent = location.name
      if (marker.getTooltip()) marker.setTooltipContent(label)
      else marker.bindTooltip(label, { permanent: true, direction: 'bottom', offset: [0, 17], className: 'marker-label' })
      if (visibleTypes.includes(location.type)) marker.addTo(map)
      else marker.remove()
      if (editable && !placing) marker.dragging?.enable()
      else marker.dragging?.disable()
      const element = marker.getElement()
      element?.classList.toggle('is-selected', selected?.id === location.id)
      element?.setAttribute('aria-pressed', String(selected?.id === location.id))
      element?.setAttribute('aria-label', `${location.name}, ${location.type}, ${allegianceLabels[location.allegiance]}`)
      element?.setAttribute('title', location.name)
      marker.setZIndexOffset(selected?.id === location.id ? 1000 : 0)
    }
  }, [locations, visibleTypes, selected, editable, placing, retry])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !routePoints?.length) return
    const group = L.layerGroup().addTo(map)
    const positions = routePoints.map(toLatLng)
    const outline = L.polyline(positions, { color: '#fffdf7', weight: 7, interactive: false }).addTo(group)
    const line = L.polyline(positions, { color: '#573b8d', weight: 4, interactive: false }).addTo(group)
    positions.forEach((position, index) => {
      const label = calibrating ? (index === 0 ? '0' : '100') : String(index + 1)
      const waypoint = L.marker(position, {
        icon: L.divIcon({ className: 'route-waypoint', html: `<span>${label}</span>`, iconSize: [40, 40], iconAnchor: [20, 20] }),
        title: calibrating ? `${label} mile tick` : `Waypoint ${label}`,
        draggable: !!onMoveWaypoint,
        keyboard: false,
        zIndexOffset: 1500,
      }).addTo(group)
      if (onMoveWaypoint) {
        waypoint.on('drag', () => {
          positions[index] = toLatLng(imagePoint(waypoint.getLatLng()))
          outline.setLatLngs(positions)
          line.setLatLngs(positions)
        })
        waypoint.on('dragend', () => onMoveWaypoint(index, imagePoint(waypoint.getLatLng())))
      }
    })
    return () => { group.remove() }
  }, [routePoints, calibrating, onMoveWaypoint, retry])

  useEffect(() => {
    const map = mapRef.current
    if (calibrating && map) map.setView(toLatLng({ x: 2433, y: 1865 }), Math.max(0.25, map.getZoom()), { animate: false })
  }, [calibrating, retry])

  const selectedId = selected?.id
  useEffect(() => {
    const location = selectedRef.current
    if (location) mapRef.current?.panTo([campaign.height - location.y, location.x], { animate: false })
  }, [selectedId])

  return (
    <>
      <div ref={container} className={`map-canvas${placing ? ' map-placing' : ''}`} role="region" aria-label="Campaign map" />
      {placing && <>
        <span className="placement-crosshair" aria-hidden="true">+</span>
        <button className="place-center" type="button" onClick={() => {
          const point = mapRef.current?.getCenter()
          if (point && point.lng >= 0 && point.lng <= campaign.width && point.lat >= 0 && point.lat <= campaign.height) onPlace(Math.round(point.lng), Math.round(campaign.height - point.lat))
        }}>{placingWaypoint ? 'Add waypoint at crosshair' : calibrating ? 'Select tick at crosshair' : 'Place at crosshair'}</button>
      </>}
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
