# Kislev Campaign Map

An interactive campaign atlas for a Pathfinder Second Edition game set in Kislev, from Warhammer Fantasy. The game master tracks settlements, armies, and their last known allegiance. Players follow changes on their phones and use the same map to estimate travel.

**[Open the live map](https://gbusey.github.io/interactive-campaign-map/)** · [Project plan](PLAN.md)

## What you can do

- **Explore the campaign.** Pan and zoom, search for locations, filter marker layers, and inspect reports. Each report shows its age in campaign days.
- **Update the map during play.** Add, move, and edit markers, advance the campaign clock, and undo changes. Edits autosave in your browser and can be exported as a JSON backup.
- **Share changes with the table.** Publish a draft from the editor. Open viewers receive the new campaign data after deployment while keeping their map position and zoom.
- **Plan a journey.** Plot waypoints and choose the terrain for each leg. The calculator shows travel days, arrival day, hours on the move, and total distance. Travel defaults to eight hours a day and supports up to sixteen. [PF2e travel rules](https://2e.aonprd.com/Rules.aspx?ID=2441)

## How it works

The app uses **React**, **TypeScript**, **Leaflet**, and **Vite**. Leaflet renders a 2,829 × 2,000 image in a flat coordinate system. Routes use coordinates on the original image, so distances stay consistent at every zoom level. The printed scale converts pixel lengths to imperial miles, and the calculator applies the selected terrain to each leg’s travel time.

GitHub Pages serves the app and a versioned campaign JSON file. The editor uses the GitHub Contents API to commit updates. It checks the file revision before writing to protect newer published data from stale drafts. Viewers check for changes about every 30 seconds while the tab is visible and when they return to it.

## Run locally

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Run `npm test` for the campaign, publishing, and travel tests, or `npm run build` to type-check and build the site. Run `npm run preview` to serve the production build locally.

## Publishing a campaign

1. Create a fine-grained GitHub token scoped to `gbusey/interactive-campaign-map` with **Contents → Read and write**. Use an account that can commit directly to `main`. [Create a token](https://github.com/settings/personal-access-tokens/new)
2. Open **Edit → Campaign**, enter the token, and select **Publish changes**. The token stays in page memory until you clear it or reload.
3. GitHub Actions builds and deploys the commit to Pages. Viewers pick up the new version on their next check.

Use **Campaign → Export backup** to keep a separate copy. In Edit mode, **Import backup** restores a validated snapshot, and **Start empty campaign** clears the map so you can begin again. If a newer version blocks publishing, export your draft, load the published campaign, and reapply your changes.

Pull requests to `main` run tests and build checks. Changes to `main` also deploy to GitHub Pages.
