/**
 * Renders the site to static HTML with its data inlined.
 *
 * Everything measurable comes from `data`; nothing here invents a number. If a
 * section has no data behind it, it renders an honest empty state rather than
 * a placeholder that implies work that does not exist. The words come from
 * src/content.mjs, which also decides which repositories to show first and how
 * to group the rest; this file only joins those choices to what the API said.
 */

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const LANGUAGE_COLORS = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5', Rust: '#dea584',
  Go: '#00ADD8', HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', C: '#555555',
  'C++': '#f34b7d', Java: '#b07219', Ruby: '#701516', Swift: '#F05138', Kotlin: '#A97BFF',
  SQL: '#e38c00', PLpgSQL: '#336790', Dockerfile: '#384d54', Makefile: '#427819',
  Vue: '#41b883', Svelte: '#ff3e00', Zig: '#ec915c', Lua: '#000080',
};

const colorFor = (language) => LANGUAGE_COLORS[language] || '#8c8c82';

const nf = new Intl.NumberFormat('en-US');

const plural = (n, word, many = `${word}s`) => `${nf.format(n)} ${n === 1 ? word : many}`;

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

const languageDot = (language) =>
  language
    ? `<span class="lang"><span class="dot" style="background:${colorFor(language)}"></span>${esc(language)}</span>`
    : '';

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

    const label = `${plural(day.count, 'contribution')} on ${day.date}`;
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
  const rows = [...repos].sort((a, b) => new Date(b.pushedAt) - new Date(a.pushedAt)).slice(0, 12);
  if (rows.length === 0) return '<p class="empty">No repositories yet.</p>';

  return `
    <div class="table-scroll">
    <table class="table">
      <thead><tr><th>Repository</th><th>Language</th><th class="num">Commits</th><th class="num">Stars</th><th class="num">Pushed</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (r) => `<tr>
              <td><a href="${esc(r.url)}">${esc(r.name)}</a></td>
              <td>${r.language ? languageDot(r.language) : '—'}</td>
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

/* --- work ------------------------------------------------------------------ */

/** The forge pipeline marks its output with a topic; a manifest, when present, adds the gate's counts. */
function provenance(repo) {
  if (!repo.forge) return '';
  const counts = repo.forge.tests
    ? ` · ${plural(repo.forge.tests, 'test')}, ${plural(repo.forge.assertions ?? 0, 'assertion')}`
    : '';
  return `<span class="provenance" title="${esc(repo.forge.trendOrigin || 'Built by the forge pipeline from a specification, reviewed before publication')}">Built by forge${counts}</span>`;
}

/**
 * The five repositories content.mjs asks to show first, joined to the live
 * data. One that the API did not return is skipped, not shown with blanks: a
 * blank next to a real number would look like a number.
 */
function startHereList(startHere, byName) {
  const present = startHere.repos
    .map((entry) => ({ ...entry, repo: byName.get(entry.name) }))
    .filter((entry) => entry.repo);

  if (present.length === 0) {
    return `<p class="empty">
      None of the repositories chosen for this list were in the data this build fetched.
      The page rebuilds from the GitHub API every day; they will be back on the next build that finds them.
    </p>`;
  }

  return `<ol class="start__list">${present
    .map(
      ({ repo, what, look }) => `
      <li class="start__item">
        <div class="start__body">
          <a class="start__name" href="${esc(repo.url)}">${esc(repo.name)}</a>
          <p class="start__what">${esc(what)}</p>
          <p class="start__look">${esc(look)}</p>
          <p class="start__meta">
            ${languageDot(repo.language)}
            <span>${plural(repo.commits, 'commit')}</span>
            <span>pushed ${esc(relativeDate(repo.pushedAt))}</span>
            ${repo.forge ? '<span>built by forge</span>' : ''}
          </p>
        </div>
      </li>`,
    )
    .join('')}</ol>`;
}

/**
 * Places every repository in exactly one group: the first group in
 * content.mjs that names it, or "Everything else". Groups that end up empty
 * are dropped; "Everything else" is only added when something lands in it.
 */
function groupRepos(repos, groups, everythingElse) {
  const byName = new Map(repos.map((r) => [r.name, r]));
  const placed = new Set();
  const out = [];

  for (const group of groups) {
    const members = [];
    for (const name of group.repos) {
      const repo = byName.get(name);
      if (repo && !placed.has(name)) {
        members.push(repo);
        placed.add(name);
      }
    }
    if (members.length > 0) out.push({ ...group, repos: members });
  }

  const rest = repos.filter((r) => !placed.has(r.name));
  if (rest.length > 0) out.push({ ...everythingElse, repos: rest });

  return out;
}

function card(repo, groupId) {
  const primary = (repo.language || '').toLowerCase();
  // The pill already says "forge" and the dot already says the language, so
  // neither topic earns a tag of its own.
  const tags = (repo.topics || []).filter((t) => t !== 'forge-built' && t !== primary).slice(0, 4);

  return `
    <a class="card" href="${esc(repo.url)}"
       data-language="${esc(repo.language || 'other')}"
       data-origin="${repo.forge ? 'pipeline' : 'direct'}"
       data-group="${esc(groupId)}">
      <span class="card__top">
        <span class="card__name">${esc(repo.name)}</span>
        ${repo.stars > 0 ? `<span class="card__stars" title="${esc(plural(repo.stars, 'star'))}">★ ${nf.format(repo.stars)}</span>` : ''}
      </span>
      ${provenance(repo)}
      <span class="card__desc">${esc(repo.description || 'No description on GitHub.')}</span>
      <span class="card__meta">
        ${languageDot(repo.language)}
        <span>${plural(repo.commits, 'commit')}</span>
        <span>${esc(relativeDate(repo.pushedAt))}</span>
      </span>
      ${tags.length ? `<span class="tags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</span>` : ''}
    </a>`;
}

function groupSections(grouped) {
  if (grouped.length === 0) {
    return `<div class="empty">
      No public repositories yet. This page rebuilds from the GitHub API every day,
      so anything published will appear here on the next build.
    </div>`;
  }

  return `<div class="groups" id="project-groups">${grouped
    .map(
      (g) => `
      <section class="group" data-group="${esc(g.id)}" aria-labelledby="group-${esc(g.id)}">
        <div class="group__head">
          <h3 class="group__title" id="group-${esc(g.id)}">
            ${esc(g.title)}
            <span class="group__count" data-total="${g.repos.length}">${g.repos.length}</span>
          </h3>
          ${g.note ? `<p class="group__note">${esc(g.note)}</p>` : ''}
        </div>
        <div class="grid">${g.repos.map((r) => card(r, g.id)).join('')}</div>
      </section>`,
    )
    .join('')}</div>
    <p class="empty" id="no-match" hidden>
      Nothing matches those filters.
      <button type="button" class="link-button" id="reset-filters">Show everything</button>
    </p>`;
}

function filterRow(label, dim, options) {
  const chip = (value, text, pressed = false) =>
    `<button type="button" class="chip" data-dim="${esc(dim)}" data-value="${esc(value)}" aria-pressed="${pressed}">${esc(text)}</button>`;
  return `
    <div class="filter-row" role="group" aria-label="Filter by ${esc(label.toLowerCase())}">
      <span class="filter-row__label" aria-hidden="true">${esc(label)}</span>
      <div class="filter-row__chips">
        ${chip('all', 'All', true)}
        ${options.map(([value, text]) => chip(value, text)).join('')}
      </div>
    </div>`;
}

function filters(grouped, repos) {
  const rows = [];

  if (grouped.length > 1) rows.push(filterRow('Topic', 'group', grouped.map((g) => [g.id, g.title])));

  const languages = [...new Set(repos.map((r) => r.language).filter(Boolean))].sort();
  if (languages.length > 1) rows.push(filterRow('Language', 'language', languages.map((l) => [l, l])));

  // Not "hand-written vs generated": everything here was written with AI
  // assistance, and a label claiming otherwise would be the dishonest part.
  // The real distinction is how autonomously each one was produced.
  const generated = repos.filter((r) => r.forge).length;
  if (generated > 0 && generated < repos.length) {
    rows.push(filterRow('Made', 'origin', [['direct', 'Directly'], ['pipeline', 'By the forge pipeline']]));
  }

  return rows.length ? `<div class="filters">${rows.join('')}</div>` : '';
}

/* --- page ------------------------------------------------------------------ */

export function render(data, { about, startHere, groups, everythingElse }) {
  const { repos, stats, contributions, languages } = data;
  // The GitHub profile may carry no display name; content.mjs is authoritative.
  const profile = { ...data.profile, name: about.name || data.profile.name || data.profile.login };
  const yearNow = new Date().getUTCFullYear();
  const thisYear = contributions.byYear[yearNow];
  const since = data.profile.createdAt ? new Date(data.profile.createdAt).getUTCFullYear() : null;

  const byName = new Map(repos.map((r) => [r.name, r]));
  const grouped = groupRepos(repos, groups, everythingElse);

  // Primary language per repository, as GitHub assigns it. Distinct from the
  // by-bytes breakdown in the Activity section, which also counts CSS and
  // shell scripts; a visitor asking "what does he write in" wants this one.
  const primary = new Map();
  for (const r of repos) if (r.language) primary.set(r.language, (primary.get(r.language) || 0) + 1);
  const primaryList = [...primary.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const heroStats = [
    { value: stats.repos, label: 'public repositories' },
    { value: stats.commits, label: 'commits across them' },
    { value: stats.activeDays, label: 'days with activity' },
    { value: primaryList.length, label: 'languages' },
  ];

  const activityStats = [
    thisYear ? { value: thisYear.total, label: `contributions in ${yearNow}` } : null,
    { value: stats.longestStreak, label: 'days, longest streak' },
    { value: stats.stars, label: 'stars received' },
    since ? { value: since, label: 'on GitHub since', raw: true } : null,
  ].filter(Boolean);

  const statTile = (s) =>
    `<div class="stat"><div class="stat__value">${s.raw ? esc(s.value) : nf.format(s.value)}</div><div class="stat__label">${esc(s.label)}</div></div>`;

  // The About text may point at the provenance pills; that pointer is only
  // true when the build actually found something to mark.
  const body = about.body.replace('{{forge-marked}}', stats.generated > 0 ? about.forgeMarked || '' : '');

  const title = `${esc(profile.login)} — ${esc(profile.name)}`;

  return `<!doctype html>
<html lang="en" data-theme="">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${esc(about.tagline)}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${esc(about.tagline)}">
<meta property="og:type" content="website">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='42' fill='%23b4441f'/></svg>">
<link rel="stylesheet" href="styles.css">
</head>
<body>

<a class="skip" href="#work">Skip to the work</a>

<header class="topbar">
  <div class="shell topbar__inner">
    <a class="brand" href="#top">${esc(profile.login)}</a>
    <nav class="nav" aria-label="Sections">
      <a href="#work">Work</a>
      <a href="#activity">Activity</a>
      <a href="#about" data-optional>About</a>
      <a href="${esc(profile.url)}">GitHub</a>
      <button class="theme-toggle" id="theme-toggle" type="button" aria-label="Switch colour theme">◐</button>
    </nav>
  </div>
</header>

<main id="top">

  <section class="shell hero" aria-labelledby="hero-title">
    <p class="hero__eyebrow">${esc(profile.name)}</p>
    <h1 id="hero-title">${esc(profile.login)}</h1>
    <p class="hero__line">${esc(about.tagline)}</p>
    <div class="hero__stats" role="list" aria-label="Figures from the GitHub API">
      ${heroStats.map((s) => `<div class="hero__stat" role="listitem"><span class="hero__value">${nf.format(s.value)}</span><span class="hero__label">${esc(s.label)}</span></div>`).join('')}
    </div>
    ${primaryList.length
      ? `<p class="hero__langs">${primaryList.map(([name, n]) => `<span class="lang"><span class="dot" style="background:${colorFor(name)}"></span>${esc(name)} <b>${nf.format(n)}</b></span>`).join('')}<span class="hero__langs-note">primary language per repository</span></p>`
      : ''}
    <div class="hero__links">
      <a class="button button--primary" href="#start-here">Start here</a>
      <a class="button" href="${esc(profile.url)}">GitHub profile</a>
    </div>
  </section>

  <section class="shell section" id="work" aria-labelledby="work-title">
    <div class="section__head">
      <h2 id="work-title">Work</h2>
      <p class="section__note">
        ${plural(stats.repos, 'public repository', 'public repositories')}. Every number here is read from the GitHub API when this page is built.
        ${stats.generated > 0
          ? `${nf.format(stats.generated)} of them came out of the <a href="https://github.com/${esc(profile.login)}/forge">forge</a> pipeline and are marked as such.`
          : ''}
      </p>
    </div>

    <div class="start" id="start-here">
      <div class="start__head">
        <h3 class="start__title">Start here</h3>
        <p class="start__intro">${esc(startHere.intro)}</p>
      </div>
      ${startHereList(startHere, byName)}
    </div>

    <div class="all">
      <div class="all__head">
        <h3 class="all__title">Everything public</h3>
        <p class="all__intro">Grouped by what each one refuses to get wrong. Filters combine, and nothing is hidden by default.</p>
      </div>
      ${filters(grouped, repos)}
      ${groupSections(grouped)}
    </div>
  </section>

  <section class="shell section" id="activity" aria-labelledby="activity-title">
    <div class="section__head">
      <h2 id="activity-title">Activity</h2>
      <p class="section__note">
        ${thisYear
          ? `${plural(thisYear.total, 'contribution')} in ${yearNow}, across ${plural(thisYear.repositories, 'repository', 'repositories')}. What GitHub can attribute to the account, nothing more.`
          : 'Contribution data is read from the GitHub GraphQL API.'}
      </p>
    </div>

    <div class="stats">${activityStats.map(statTile).join('')}</div>

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
        <h3 class="panel__title">Most recently pushed</h3>
        ${repoTable(repos)}
      </div>
    </div>
  </section>

  <section class="shell section" id="about" aria-labelledby="about-title">
    <div class="section__head"><h2 id="about-title">About</h2></div>
    <div class="prose">${body}</div>
  </section>

</main>

<footer class="footer">
  <div class="shell footer__inner">
    <span>Built from the GitHub API on <span class="mono">${esc(data.generatedAt.slice(0, 10))}</span>. No framework, no runtime dependencies, no requests from the browser.</span>
    <span><a href="${esc(about.sourceUrl)}">Source of this site</a></span>
  </div>
</footer>

<script src="app.js"></script>
</body>
</html>
`;
}
