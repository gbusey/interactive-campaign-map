import type { MarkerType } from './campaign'

// Trusted, local SVG paths only. Campaign names/descriptions are never inserted as HTML.
export const markerPaths: Record<MarkerType, string> = {
  city: '<path d="M4 21V10h5V5h6v5h5v11M2 21h20M10 21v-5h4v5M6 13h1m10 0h1M11 8h2"/>',
  fortress: '<path d="M4 21V5h4v4h3V5h3v4h3V5h3v16H4Zm6 0v-6h4v6"/>',
  village: '<path d="m2 12 10-9 10 9M5 10v11h14V10M10 21v-7h4v7"/>',
  army: '<path d="m5 3 14 18m0-18L5 21M3 16l5 4m8 0 5-4M5 3l1 6 3-2m10-4-1 6-3-2"/>',
}
export function markerSvg(type: MarkerType) {
  return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${markerPaths[type]}</svg>`
}
