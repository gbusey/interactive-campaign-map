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

The initial campaign is labeled sample data. To begin with a clean slate, choose **Edit → Campaign → Start empty campaign**. You can also edit the sample markers and turn off **Sample dataset** when the data is ready. Drafts stay in your browser until you publish.

## Publishing and viewer updates

1. Create a [fine-grained GitHub token](https://github.com/settings/personal-access-tokens/new) for `gbusey/interactive-campaign-map` with **Contents → Read and write**. The token's account needs permission to commit directly to `main`.
2. Open **Edit → Campaign**, enter the token, and choose **Publish changes**. The page keeps the token in memory until you clear it or reload. The publish action commits `public/campaign.json` to `main` and triggers the Pages workflow. [GitHub Contents API permissions](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents)
3. Once Pages deploys the commit, viewers in Browse mode pick it up on the next check, about every 30 seconds while the page is visible. Returning to the tab or choosing **Campaign → Check for updates** checks sooner.

If a newer version exists, publishing stops and preserves your draft. Export it before choosing **Load published campaign**, then reapply your edits to the latest version. A draft from step 3 can publish directly if Pages still serves the original sample campaign.

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
- The deployment workflow uses GitHub's built-in token. The editor's publishing token is entered in the browser.

Once merged and deployed, the site will be available at <https://gbusey.github.io/interactive-campaign-map/>. The feature branch does not publish to the live site.

`vite.config.ts` sets the asset base to `/interactive-campaign-map/`. Update it if the repository name or hosting path changes. The app currently has one entry page and does not require server-side routing.

## Next steps

Route measurement and PF2e travel calculations.
