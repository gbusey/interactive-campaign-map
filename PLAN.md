# Interactive Campaign Map Plan

## Purpose

A shared map for a PF2e war campaign set in Kislev in the Warhammer Fantasy universe. Settlements and armies can change allegiance, and the map represents only information known to the players. The GM uses a laptop; players primarily use phones.

## Technologies and hosting

- **React + TypeScript:** organize the interface, editor, and campaign data.
- **Vite:** build static assets for deployment to **GitHub Pages** through **GitHub Actions**, with the repository URL prefix configured correctly.
- **Leaflet with `CRS.Simple`:** display the existing map image with zoom, pan, markers, popups, and route lines using image-based coordinates.
- Store campaign data separately from the image so updates never require editing the map artwork.
- Use browser storage for local drafts and preferences; provide campaign import/export for backups and transfer.

## Map and campaign features

- Placeable icons for cities, fortresses, villages, and armies, with distinct silhouettes.
- Allegiance colors: **blue friendly, red hostile, yellow contested, grey neutral**. Also show allegiance as text.
- Click or tap a marker to see its name, type, description, allegiance, and age of intelligence; optionally record faction and intelligence source.
- Store faction separately from allegiance: ownership and relationship to the party are different concepts.
- Track intelligence against an editable **in-game campaign date**, not real-world time. Advancing that date ages reports automatically; ordinary edits do not refresh report dates.
- Army positions represent their last reported positions.
- Search locations and toggle map layers; reveal labels progressively as users zoom in.

## Interaction and responsive layout

- Separate **Browse**, **Edit**, and **Measure** modes to prevent accidental changes.
- Edit mode supports adding, moving, and deleting markers; editing descriptions, allegiance, and report dates; and undoing changes. Marker dragging is enabled only in Edit mode.
- Laptop: full-screen map with a collapsible side panel.
- Phone portrait: compact controls and a bottom sheet for details/forms.
- Phone landscape: narrow, collapsible side panel.
- Use touch-friendly controls and marker targets. Route placement supports tapping or positioning a central crosshair and choosing **Add waypoint**.
- Editor tools are available to everyone. No application accounts or GM/player permission system are needed because players are trusted.
- All published data is player knowledge; private GM notes remain outside this project in Discord.

## Saving, publishing, and shared updates

- Edits appear immediately on the editing device and autosave as a local draft.
- An explicit **Publish changes** button batches edits and writes campaign data through the GitHub Contents API, triggering Pages deployment. No manual JSON editing or Git commands are needed during sessions.
- Publishing requires a repository-authorized GitHub credential configured on the GM's laptop, kept out of published assets. Opening the editor does not grant repository write access. Exact credential setup remains an implementation decision.
- Viewers check for a new campaign version approximately every **30 seconds**, and immediately on returning to the tab. Updates arrive after deployment plus the polling interval; this is eventual synchronization rather than instant collaboration.
- Refresh campaign data without reloading the page or resetting each viewer's zoom, position, selected marker, filters, or draft route. Version checks must avoid stale caches.
- Show viewer update/offline status and a brief update notification. Distinguish local saves, publishing, and successful publication; preserve drafts when publishing fails and allow retry.
- Detect newer published versions before overwriting data to protect against stale tabs or devices.
- GitHub Pages remains static hosting; GitHub provides publishing and version history, so a separate database is unnecessary for the expected update frequency.

## Travel calculator

- Calibrate scale by clicking the image's **0 and 100 imperial mile** marks. Assume one imperial mile equals one PF2e mile initially, with a configurable conversion.
- Plot and adjust a multi-point route; sum segment lengths in fixed map coordinates so zoom does not affect distance.
- Assign terrain manually per segment. Automatic road following or terrain detection is outside the initial scope because the image contains no routing data.
- Use the party's limiting travel Speed and PF2e travel rates: Speed 20/25/30 feet corresponds to 2/2.5/3 miles per hour, or 16/20/24 miles per standard 8-hour travel day.
- Difficult terrain halves travel speed; greater difficult terrain reduces it to one-third. Calculate time per segment and sum it for mixed terrain.
- Display total miles, travel hours, and travel days. Support configurable daily travel hours, relevant exploration activity adjustments, and explicit GM overrides for weather or campaign effects. Army travel uses separate configurable profiles.
- Draft routes and viewing preferences remain personal. Shared named routes are a possible later addition; map entities, intel, campaign date, and scale are shared.

## Build sequence

1. Map display, navigation, marker types, allegiance colors, and information panels.
2. Responsive editor, campaign clock, intel age, undo, local saving, and backup import/export.
3. Scale calibration, waypoint routes, terrain segments, and PF2e travel estimates.
4. GitHub publishing, automatic viewer updates, status feedback, and stale-version protection.

The initial release should include all four stages so it supports the shared table workflow.
