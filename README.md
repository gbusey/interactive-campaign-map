# Kislev Campaign Map

A shared map for a PF2e war campaign in Kislev. Built with React, TypeScript, Vite, and Leaflet, and hosted on GitHub Pages. See [PLAN.md](PLAN.md) for the full plan.

## Map viewer

- Pan by dragging; zoom with the mouse wheel, pinch gestures, or +/− controls. **Fit map** returns to the full image.
- Click or tap a city, fortress, village, or army for its allegiance, description, faction, and intelligence age in campaign days.
- **Search** finds locations and armies, including those on hidden layers. Selecting a result reveals its layer and centers the marker.
- **Layers** toggles marker types and shows the allegiance color legend. Labels appear as you zoom in.
- Details and tools use a side panel on desktop/landscape phones and a bottom panel on portrait phones. Close with × or Escape.
- The map supports keyboard panning/zooming when focused, and Enter or Space activates focused markers.

The viewer uses `data/Map-Kislev-1-Color.jpg` (2829 × 2000). `src/campaign.ts` contains the map dimensions and initial marker data; coordinates are image pixels measured from the top-left, independent of zoom. The image is bundled by Vite so it works under the Pages repository path.

**Initial markers are explicitly labeled sample data.** Their allegiance, reports, and campaign day are illustrative. No live campaign state, editing, persistence, publishing, or travel calculation is implemented yet. The original map image is unchanged.

## Local development

Use Node.js 22.12 or newer (Node 22 is specified in `.nvmrc`).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, including `/interactive-campaign-map/`.

```sh
npm run typecheck   # Check TypeScript
npm run build       # Type-check and build static files into dist/
npm run preview     # Serve the production build locally
```

## Deployment

In repository Settings → Pages, set Source to **GitHub Actions**.

- Pull requests targeting `main` run the production build without deploying.
- Pushes to `main` build and deploy `dist/` to Pages.
- The workflow can also be run manually; only runs on `main` deploy.
- No separate deployment branch or committed build output is needed.
- Deployment uses GitHub's built-in workflow token; no personal token or repository secret is required for this release.

Once merged and deployed, the site will be available at <https://gbusey.github.io/interactive-campaign-map/>. The feature branch does not publish to the live site.

`vite.config.ts` sets the asset base to `/interactive-campaign-map/`. Update it if the repository name or hosting path changes. The app currently has one entry page and does not require server-side routing.

## Next steps

1. Campaign editor, intelligence dates, undo, and local saving.
2. Campaign publishing and automatic viewer updates.
3. Route measurement and PF2e travel calculations.
