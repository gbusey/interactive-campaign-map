# Kislev Campaign Map

A shared map for a PF2e war campaign in Kislev. Built with React, TypeScript, Vite, and Leaflet, and hosted on GitHub Pages. See [PLAN.md](PLAN.md) for the full plan.

## Map viewer

- Pan by dragging; zoom with the mouse wheel, pinch gestures, or +/− controls. **Fit map** returns to the full image.
- Click or tap a city, fortress, village, or army for its allegiance, description, faction, and intelligence age in campaign days.
- **Search** finds locations and armies, including those on hidden layers. Selecting a result reveals its layer and centers the marker.
- **Layers** toggles marker types and shows the allegiance color legend. Labels appear as you zoom in.
- Details and tools use a side panel on desktop/landscape phones and a bottom panel on portrait phones. Close with × or Escape.
- The map supports keyboard panning/zooming when focused, and Enter or Space activates focused markers.

The viewer uses `data/Map-Kislev-1-Color.jpg` (2829 × 2000). The bundled sample data is in `src/campaign.ts`; the versioned data format and map dimensions are in `src/campaignModel.ts`. Coordinates are image pixels measured from the top-left, independent of zoom.

## Editing the campaign

1. Select **Edit**. Use **Add marker**, then click/tap the map or choose **Place at crosshair**. Fill the form and select **Save marker**.
2. Drag a marker to move it, or use **Move on map** in its details. **Edit details** changes its fields; **Report today** explicitly updates the report date.
3. Open **Campaign** to set the campaign day. Reports age automatically; ordinary edits keep their original report dates. **Undo** reverses up to 50 changes in the current session.
4. Saved changes are stored in this browser. Use **Campaign → Export backup** for a separate copy. In Edit mode, **Import backup** validates the file before replacing the campaign; the replacement can be undone.

The initial campaign is labeled sample data. To begin with a clean slate, choose **Edit → Campaign → Start empty campaign**. You can also edit the sample markers and turn off **Sample dataset** when the data is ready. Drafts stay on the current device until shared publishing is implemented.

## Local development

Use Node.js 22.12 or newer (Node 22 is specified in `.nvmrc`).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, including `/interactive-campaign-map/`.

```sh
npm run typecheck   # Check TypeScript
npm test            # Validate backups, campaign dates, undo, and draft recovery
npm run build       # Type-check and build static files into dist/
npm run preview     # Serve the production build locally
```

## Deployment

In repository Settings → Pages, set Source to **GitHub Actions**.

- Pull requests targeting `main` run tests and the production build without deploying.
- Pushes to `main` build and deploy `dist/` to Pages.
- The workflow can also be run manually; only runs on `main` deploy.
- No separate deployment branch or committed build output is needed.
- Deployment uses GitHub's built-in workflow token; no personal token or repository secret is required for this release.

Once merged and deployed, the site will be available at <https://gbusey.github.io/interactive-campaign-map/>. The feature branch does not publish to the live site.

`vite.config.ts` sets the asset base to `/interactive-campaign-map/`. Update it if the repository name or hosting path changes. The app currently has one entry page and does not require server-side routing.

## Next steps

1. Campaign publishing and automatic viewer updates.
2. Route measurement and PF2e travel calculations.
