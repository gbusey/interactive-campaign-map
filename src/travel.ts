export interface MapPoint { x: number; y: number }
export interface TravelScale {
  pixelsPer100ImperialMiles: number
  milesPerImperialMile: number
}

export const defaultTravelScale: TravelScale = {
  // On the original Kislev image, the 0 and 100 ticks are at x=2328 and x=2538.
  pixelsPer100ImperialMiles: 210,
  milesPerImperialMile: 1,
}

export const terrainTypes = {
  clear: { label: 'Clear / road', cost: 1 },
  difficult: { label: 'Difficult', cost: 2 },
  greater: { label: 'Greater difficult', cost: 3 },
} as const
export type Terrain = keyof typeof terrainTypes
export interface Waypoint extends MapPoint {
  // Terrain of the leg ending at this point. The first point has no incoming leg.
  terrain: Terrain
}

export function isTravelScale(value: unknown): value is TravelScale {
  if (!value || typeof value !== 'object') return false
  const { pixelsPer100ImperialMiles, milesPerImperialMile } = value as Partial<TravelScale>
  return typeof pixelsPer100ImperialMiles === 'number' && Number.isFinite(pixelsPer100ImperialMiles)
    && pixelsPer100ImperialMiles >= 1
    && typeof milesPerImperialMile === 'number' && milesPerImperialMile >= 0.01 && milesPerImperialMile <= 1000
}

export function pixelDistance(a: MapPoint, b: MapPoint) {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function routeLegs(points: Waypoint[], scale: TravelScale) {
  return points.slice(1).map((destination, index) => ({
    imperialMiles: pixelDistance(points[index], destination) * 100 / scale.pixelsPer100ImperialMiles,
    terrain: destination.terrain,
  }))
}

export function travelEstimate(
  legs: ReturnType<typeof routeLegs>,
  milesPerImperialMile: number,
  milesPerHour: number,
  hoursPerDay: number,
) {
  if (!legs.length || !Number.isFinite(milesPerHour) || milesPerHour <= 0 || !(hoursPerDay >= 1 && hoursPerDay <= 16)) return null
  const hours = legs.reduce((total, leg) => (
    total + leg.imperialMiles * milesPerImperialMile * terrainTypes[leg.terrain].cost / milesPerHour
  ), 0)
  if (!Number.isFinite(hours)) return null
  const days = hours / hoursPerDay
  // Tolerate floating-point error at exact day and eight-hour boundaries.
  const tolerance = 1e-9
  const fullDays = Math.floor(days + tolerance)
  const remainingHours = Math.max(0, hours - fullDays * hoursPerDay)
  const extendedDays = hoursPerDay > 8
    ? fullDays + Number(remainingHours > 8 + tolerance)
    : 0
  return { hours, days, arrivalDay: hours === 0 ? 0 : Math.max(1, Math.ceil(days - tolerance)), extendedDays }
}
