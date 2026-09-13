/**
 * Renders the site to static HTML with its data inlined.
 *
 * Everything measurable comes from `data`; nothing here invents a number. If a
 * section has no data behind it, it renders an honest empty state rather than
 * a placeholder that implies work that does not exist.
 */

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Safe to embed in a <script> tag: closes no tag and starts no comment. */
const jsonScript = (value) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

const LANGUAGE_COLORS = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5', Rust: '#dea584',
  Go: '#00ADD8', HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', C: '#555555',
  'C++': '#f34b7d', Java: '#b07219', Ruby: '#701516', Swift: '#F05138', Kotlin: '#A97BFF',
  SQL: '#e38c00', PLpgSQL: '#336790', Dockerfile: '#384d54', Makefile: '#427819',
  Vue: '#41b883', Svelte: '#ff3e00', Zig: '#ec915c', Lua: '#000080',
};

const colorFor = (language) => LANGUAGE_COLORS[language] || '#8c8c82';

const nf = new Intl.NumberFormat('en-US');

function relativeDate(iso) {
  if (!iso) return '—';
  const days = Math.floor((Date.now() - new Date(iso)) / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

/* --- contribution heatmap ---------------------------------------------------
   Drawn as inline SVG rather than a div grid: one element instead of ~370,
   and it scales cleanly without touching layout.
   --------------------------------------------------------------------------- */

function heatmap(calendar) {
  const DAYS = 371; // 53 weeks
  const CELL = 11;
  const GAP = 3;
  const TOP = 18;
  const LEFT = 26;

  const recent = calendar.slice(-DAYS);
  if (recent.length === 0) return '<p class="empty">No contribution data available.</p>';

  const max = Math.max(...recent.map((d) => d.count), 1);
  const level = (count) => {
    if (count === 0) return 0;
    const ratio = count / max;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  };

  // Align the first column to a Sunday so weekday rows read correctly.
  const first = new Date(`${recent[0].date}T00:00:00Z`);
  const offset = first.getUTCDay();

  const cells = [];
  const monthLabels = [];
  let lastMonth = -1;

  recent.forEach((day, i) => {
    const index = i + offset;
    const week = Math.floor(index / 7);
    const weekday = index % 7;
    const x = LEFT + week * (CELL + GAP);
    const y = TOP + weekday * (CELL + GAP);

    const date = new Date(`${day.date}T00:00:00Z`);
    const month = date.getUTCMonth();
    if (month !== lastMonth && weekday <= 1) {
      monthLabels.push(
        `<text x="${x}" y="12" class="hm-label">${date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}</text>`,
      );
      lastMonth = month;
    }

    const label = `${day.count} contribution${day.count === 1 ? '' : 's'} on ${day.date}`;
    cells.push(
      `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="var(--grid-${level(day.count)})"><title>${esc(label)}</title></rect>`,
    );
  });

  const weekdays = ['', 'Mon', '', 'Wed', '', 'Fri', '']
    .map((name, i) => (name ? `<text x="0" y="${TOP + i * (CELL + GAP) + 9}" class="hm-label">${name}</text>` : ''))
    .join('');

  const weeks = Math.ceil((recent.length + offset) / 7);
  const width = LEFT + weeks * (CELL + GAP);
  const height = TOP + 7 * (CELL + GAP);

  return `
    <div class="heatmap-scroll">
      <svg class="heatmap" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img"
           aria-label="Contribution activity over the last year">
        <style>.hm-label{font-family:var(--font-mono);font-size:9px;fill:var(--text-faint)}</style>
        ${monthLabels.join('')}${weekdays}${cells.join('')}
      </svg>
    </div>
    <div class="heatmap__legend">
      <span>Less</span>
      ${[0, 1, 2, 3, 4].map((l) => `<span class="heatmap__swatch" style="background:var(--grid-${l})"></span>`).join('')}
      <span>More</span>
    </div>`;
}

function languageBars(languages) {
  const entries = Object.entries(languages).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (entries.length === 0) return '<p class="empty">No language data yet.</p>';

  const total = Object.values(languages).reduce((n, v) => n + v, 0);
  return `<div class="bars">${entries
    .map(([name, bytes]) => {
      const pct = (bytes / total) * 100;
      return `
        <div>
          <div class="bar__head">
            <span class="bar__name"><span class="dot" style="background:${colorFor(name)}"></span>${esc(name)}</span>
            <span class="bar__value">${pct.toFixed(1)}%</span>
          </div>
          <div class="bar__track"><div class="bar__fill" style="width:${pct.toFixed(2)}%;background:${colorFor(name)}"></div></div>
        </div>`;
    })
    .join('')}</div>`;
}

function yearTable(byYear) {
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);
  if (years.length === 0) return '<p class="empty">No yearly data available.</p>';

  return `
    <div class="table-scroll">
    <table class="table">
      <thead><tr><th>Year</th><th class="num">Commits</th><th class="num">PRs</th><th class="num">Issues</th><th class="num">Total</th></tr></thead>
      <tbody>
        ${years
          .map((y) => {
            const d = byYear[y];
            return `<tr><td>${y}</td><td class="num">${nf.format(d.commits)}</td><td class="num">${nf.format(d.pullRequests)}</td><td class="num">${nf.format(d.issues)}</td><td class="num">${nf.format(d.total)}</td></tr>`;
          })
          .join('')}
      </tbody>
    </table>
    </div>`;
}

function repoTable(repos) {
  const rows = repos.slice(0, 12);
  if (rows.length === 0) return '<p class="empty">No repositories yet.</p>';

  return `
    <div class="table-scroll">
    <table class="table">
      <thead><tr><th>Repository</th><th>Language</th><th class="num">Commits</th><th class="num">Stars</th><th class="num">Updated</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (r) => `<tr>
              <td><a href="${esc(r.url)}">${esc(r.name)}</a></td>
              <td>${r.language ? `<span class="dot" style="background:${colorFor(r.language)}"></span>${esc(r.language)}` : '—'}</td>
              <td class="num">${nf.format(r.commits)}</td>
              <td class="num">${nf.format(r.stars)}</td>
              <td class="num">${esc(relativeDate(r.pushedAt))}</td>
            </tr>`,
          )
          .join('')}
      </tbody>
    </table>
    </div>`;
}

function projectCards(repos) {
  if (repos.length === 0) {
    return `<div class="empty">
      No public repositories yet. This page rebuilds from the GitHub API every day,
      so anything published will appear here on the next build.
    </div>`;
  }

  return `<div class="grid" id="project-grid">${repos
    .map(
      (r) => `
      <a class="card" href="${esc(r.url)}" data-language="${esc(r.language || 'other')}"
         data-origin="${r.forge ? 'generated' : 'hand-written'}" data-topics="${esc((r.topics || []).join(' '))}">
        <div class="card__top">
          <span class="card__name">${esc(r.name)}</span>
          ${r.stars > 0 ? `<span class="card__stars">★ ${nf.format(r.stars)}</span>` : ''}
        </div>
        ${r.forge
          ? `<p class="provenance" title="${esc(r.forge.trendOrigin || 'Built by the forge pipeline')}">
               Generated by forge${r.forge.tests ? ` · ${r.forge.tests} tests, ${r.forge.assertions} assertions` : ''}
             </p>`
          : ''}
        <p class="card__desc">${esc(r.description || 'No description.')}</p>
        <div class="card__meta">
          ${r.language ? `<span><span class="dot" style="background:${colorFor(r.language)}"></span>${esc(r.language)}</span>` : ''}
          <span>${nf.format(r.commits)} commits</span>
          <span>${esc(relativeDate(r.pushedAt))}</span>
        </div>
        ${(r.topics || []).length ? `<div class="tags">${r.topics.slice(0, 5).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
      </a>`,
    )
    .join('')}</div>`;
}

function filterChips(repos) {
  const languages = [...new Set(repos.map((r) => r.language).filter(Boolean))].sort();
  const generated = repos.filter((r) => r.forge).length;
  const mixed = generated > 0 && generated < repos.length;
  if (languages.length < 2 && !mixed) return '';

  const origin = mixed
    ? `<button class="chip" data-origin-filter="hand-written" aria-pressed="false">Hand-written</button>
       <button class="chip" data-origin-filter="generated" aria-pressed="false">Generated</button>`
    : '';

  return `
    <div class="filters" role="group" aria-label="Filter projects">
      <button class="chip" data-filter="all" aria-pressed="true">All</button>
      ${languages.map((l) => `<button class="chip" data-filter="${esc(l)}" aria-pressed="false">${esc(l)}</button>`).join('')}
      ${origin}
    </div>`;
}

export function render(data, { about }) {
  const { repos, stats, contributions, languages } = data;
  // The GitHub profile may carry no display name; content.mjs is authoritative.
  const profile = { ...data.profile, name: about.name || data.profile.name || data.profile.login };
  const yearNow = new Date().getUTCFullYear();
  const thisYear = contributions.byYear[yearNow];

  const statCards = [
    { value: nf.format(stats.repos), label: 'public repositories' },
    { value: nf.format(stats.commits), label: 'commits across them' },
    { value: nf.format(stats.stars), label: 'stars received' },
    { value: nf.format(stats.languages), label: 'languages used' },
    { value: nf.format(stats.activeDays), label: 'days with activity' },
    { value: nf.format(stats.longestStreak), label: 'longest daily streak' },
  ];

  return `<!doctype html>
<html lang="en" data-theme="">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(profile.name)} — engineering work</title>
<meta name="description" content="${esc(about.tagline)}">
<meta property="og:title" content="${esc(profile.name)} — engineering work">
<meta property="og:description" content="${esc(about.tagline)}">
<meta property="og:type" content="website">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='42' fill='%23b4441f'/></svg>">
<link rel="stylesheet" href="styles.css">
</head>
<body>

<header class="topbar">
  <div class="shell topbar__inner">
    <a class="brand" href="#top">${esc(profile.login)}</a>
    <nav class="nav">
      <a href="#work">Work</a>
      <a href="#activity">Activity</a>
      <a href="#about" data-optional>About</a>
      <a href="${esc(profile.url)}">GitHub</a>
      <button class="theme-toggle" id="theme-toggle" aria-label="Switch colour theme">◐</button>
    </nav>
  </div>
</header>

<main id="top">

  <section class="shell hero">
    <p class="hero__eyebrow">${esc(about.eyebrow)}</p>
    <h1>${esc(about.headline)}</h1>
    <p>${esc(about.tagline)}</p>
    <div class="hero__links">
      <a class="button button--primary" href="#work">See the work</a>
      <a class="button" href="${esc(profile.url)}">GitHub profile</a>
    </div>
  </section>

  <section class="shell section" id="work">
    <div class="section__head">
      <h2>Work</h2>
      <p class="section__note">
        Every repository below is public, and every number is read from the GitHub API when this page is built.
        ${stats.generated > 0
          ? `${stats.generated} of ${stats.repos} were produced by the <a href="https://github.com/${esc(profile.login)}/forge">forge</a> pipeline and are marked as such.`
          : ''}
      </p>
    </div>
    ${filterChips(repos)}
    ${projectCards(repos)}
  </section>

  <section class="shell section" id="activity">
    <div class="section__head">
      <h2>Activity</h2>
      <p class="section__note">
        ${thisYear
          ? `${nf.format(thisYear.total)} contributions in ${yearNow}, across ${nf.format(thisYear.repositories)} repositories.`
          : 'Contribution data is read from the GitHub GraphQL API.'}
      </p>
    </div>

    <div class="stats">
      ${statCards.map((s) => `<div class="stat"><div class="stat__value">${s.value}</div><div class="stat__label">${esc(s.label)}</div></div>`).join('')}
    </div>

    <div class="panels">
      <div class="panel panel--wide">
        <h3 class="panel__title">Contributions, last 12 months</h3>
        ${heatmap(contributions.calendar)}
      </div>
      <div class="panel">
        <h3 class="panel__title">Languages by volume</h3>
        ${languageBars(languages)}
      </div>
      <div class="panel">
        <h3 class="panel__title">By year</h3>
        ${yearTable(contributions.byYear)}
      </div>
      <div class="panel panel--wide">
        <h3 class="panel__title">Repositories</h3>
        ${repoTable(repos)}
      </div>
    </div>
  </section>

  <section class="shell section" id="about">
    <div class="section__head"><h2>About</h2></div>
    <div class="prose">${about.body}</div>
  </section>

</main>

<footer class="footer">
  <div class="shell footer__inner">
    <span>Built from the GitHub API on <span class="mono">${esc(data.generatedAt.slice(0, 10))}</span>.</span>
    <span><a href="${esc(about.sourceUrl)}">Source of this site</a></span>
  </div>
</footer>

<script id="site-data" type="application/json">${jsonScript({ repos: repos.map((r) => ({ name: r.name, language: r.language })) })}</script>
<script src="app.js"></script>
</body>
</html>
`;
}
