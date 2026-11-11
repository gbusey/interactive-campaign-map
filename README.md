# Kislev Campaign Map

A shared map for a PF2e war campaign in Kislev. The foundation release contains a responsive React shell and GitHub Pages deployment; interactive map features are planned in [PLAN.md](PLAN.md).

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

1. Responsive Leaflet map viewer and marker information.
2. Campaign data, editor, intelligence dates, and local saving.
3. Campaign publishing and automatic viewer updates.
4. Route measurement and PF2e travel calculations.
