# arielb57.github.io

My portfolio and GitHub activity dashboard. Static, no framework, no runtime dependencies, rebuilt from the GitHub API once a day.

**Live:** https://arielb57.github.io

## What it does

One build step reads the GitHub REST and GraphQL APIs and writes a complete static page:

- **Work** — every public repository, with its real commit count, stars, language and topics, filterable by language.
- **Activity** — a contribution heatmap for the last 12 months, language breakdown by bytes, per-year commit/PR/issue totals, and a repository table.
- **About** — the only hand-written text on the site, in `src/content.mjs`.

Every number comes from the API at build time. Nothing is hard-coded, and a section with no data renders an honest empty state rather than a placeholder.

## Why it is built this way

**Data is baked in, not fetched in the browser.** The page loads with zero requests: no API rate limit, no CORS preflight, no loading spinner, and no way for a visitor to see a broken page because GitHub is slow. The cost is that the numbers are up to 24 hours old, which for a portfolio is not a cost at all.

**The last successful fetch is cached.** If GitHub is unreachable during the scheduled rebuild, `build.mjs` falls back to `.cache/github.json` and rebuilds with a warning. A failed API call must not take the live site down — it should just serve yesterday's numbers.

**Commit counts come from the `Link` header.** Asking for the full commit list of a repository costs one request per hundred commits. Requesting `per_page=1` and reading the `rel="last"` page number from the response header costs one request regardless of history length.

**The heatmap is one inline SVG.** A div-per-day grid is ~370 elements that the browser has to lay out; a single `<svg>` with `<rect>` children scales cleanly, prints correctly, and carries its own `<title>` tooltips with no JavaScript.

**Themes have three states, not two.** Light, dark, and "follow the OS" — the toggle cycles through all three, so a visitor who clicks once by accident can get back to automatic. Every colour is defined on bare `:root` first and only *redefined* under the dark queries, so no value can exist in one theme and be missing in the other.

## Build

```bash
npm run build            # fetch from GitHub, write dist/
npm run build:offline    # rebuild from the cached fetch
npm run serve            # preview dist/ at localhost:4321
```

Set `GITHUB_TOKEN` to raise the rate limit from 60/hour to 5000/hour and to enable the contribution calendar, which is GraphQL-only:

```bash
GITHUB_TOKEN=$(gh auth token) npm run build
```

Options: `--login <user>`, `--out <dir>`, `--offline`.

## Deployment

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every push to `main` and daily at 06:15 UTC. The schedule is deliberately off the hour — GitHub's cron queue is heavily contended at `:00` and jobs there are routinely delayed or dropped.

The workflow checks the output before deploying: the three files must exist, be non-empty, and `index.html` must contain a closing `</html>` tag. A truncated page is worse than a stale one.

To enable Pages on a fresh clone: **Settings → Pages → Source → GitHub Actions**.

## A note on the contribution graph

The contribution heatmap shows what GitHub can attribute to the account. Two things make real work invisible there:

1. **Commits authored with an email that is not verified on the account.** They exist in the repository and count for nothing on the profile.
2. **Work in private repositories**, unless *Settings → Profile → Include private contributions on my profile* is enabled. That setting shows the activity without revealing repository names.

Both are worth checking before concluding that a quiet graph reflects a quiet year.

## Layout

```
build.mjs                 orchestration, caching, output checks
scripts/fetch-github.mjs  REST + GraphQL collection
scripts/render.mjs        HTML generation, heatmap, charts
scripts/serve.mjs         local preview server
src/content.mjs           hand-written copy
src/styles.css            design tokens and layout
src/app.js                theme cycling and project filtering
```

## License

MIT
