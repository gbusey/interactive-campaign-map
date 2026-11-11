import mapImage from '../data/Map-Kislev-1-Color.jpg'

export const markerTypes = ['city', 'fortress', 'village', 'army'] as const
export type MarkerType = (typeof markerTypes)[number]
export type Allegiance = 'friendly' | 'hostile' | 'contested' | 'neutral'

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

export const typeLabels: Record<MarkerType, string> = {
  city: 'Cities', fortress: 'Fortresses', village: 'Villages', army: 'Armies',
}
export const allegianceLabels: Record<Allegiance, string> = {
  friendly: 'Friendly', hostile: 'Hostile', contested: 'Contested', neutral: 'Neutral',
}

export const campaign = {
  mapImage,
  width: 2829,
  height: 2000,
  day: 12,
  sampleMarkers: true,
  locations: [
    { id: 'kislev', name: 'Kislev', type: 'city', allegiance: 'friendly', x: 1459, y: 1505, faction: 'Kislev', reportedOnDay: 12, description: 'The campaign’s southern city. Example report for testing the viewer.' },
    { id: 'praag', name: 'Praag', type: 'city', allegiance: 'contested', x: 1603, y: 837, faction: 'Unconfirmed', reportedOnDay: 9, description: 'Control of the city is disputed in this example report.' },
    { id: 'erengrad', name: 'Erengrad', type: 'city', allegiance: 'neutral', x: 828, y: 1085, faction: 'Unconfirmed', reportedOnDay: null, description: 'No intelligence report has been recorded in this example.' },
    { id: 'ostrosk', name: 'Fort Ostrosk', type: 'fortress', allegiance: 'friendly', x: 1240, y: 575, faction: 'Kislev', reportedOnDay: 8, description: 'An example garrison report from the northern frontier.' },
    { id: 'dushyka', name: 'Dushyka', type: 'village', allegiance: 'neutral', x: 1454, y: 775, faction: 'Unconfirmed', reportedOnDay: 10, description: 'An example village report along the northern routes.' },
    { id: 'northern-host', name: 'Northern host', type: 'army', allegiance: 'hostile', x: 1650, y: 1005, faction: 'Unknown host', reportedOnDay: 7, description: 'An illustrative army marker. This is its last reported position, not a live position.' },
  ] satisfies Location[],
}
