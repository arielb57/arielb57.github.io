/**
 * Pulls everything the site displays from the GitHub API in one pass.
 *
 * The data is baked into the page at build time rather than fetched in the
 * browser: the site then loads with no requests, no API rate limit, no CORS,
 * and no spinner — and it still shows yesterday's numbers if GitHub is down
 * when the daily rebuild runs.
 */

const API = 'https://api.github.com';
const GRAPHQL = 'https://api.github.com/graphql';

function headers(token) {
  return {
    accept: 'application/vnd.github+json',
    'user-agent': 'arielb57-portfolio-build',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

async function rest(path, token) {
  const res = await fetch(`${API}${path}`, { headers: headers(token) });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub REST ${res.status} on ${path}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function graphql(query, variables, token) {
  const res = await fetch(GRAPHQL, {
    method: 'POST',
    headers: { ...headers(token), 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(`GitHub GraphQL: ${json.errors.map((e) => e.message).join('; ')}`);
  return json.data;
}

async function allPages(path, token, max = 300) {
  const out = [];
  for (let page = 1; out.length < max; page += 1) {
    const batch = await rest(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`, token);
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

/**
 * The contribution calendar is GraphQL-only. It reflects commits GitHub can
 * attribute to the account — commits authored with an unverified email address
 * are invisible here even though they exist in the repository.
 */
async function fetchContributions(login, token, years) {
  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
          totalPullRequestContributions
          totalIssueContributions
          totalRepositoriesWithContributedCommits
          contributionCalendar {
            totalContributions
            weeks { contributionDays { date contributionCount } }
          }
        }
      }
    }`;

  const byYear = {};
  let calendar = [];
  let totals = { commits: 0, pullRequests: 0, issues: 0, repositories: 0 };

  for (const year of years) {
    const from = `${year}-01-01T00:00:00Z`;
    const to = `${year}-12-31T23:59:59Z`;
    let data;
    try {
      data = await graphql(query, { login, from, to }, token);
    } catch (err) {
      console.warn(`  contributions for ${year} unavailable: ${err.message}`);
      continue;
    }
    const c = data?.user?.contributionsCollection;
    if (!c) continue;

    byYear[year] = {
      total: c.contributionCalendar.totalContributions,
      commits: c.totalCommitContributions,
      pullRequests: c.totalPullRequestContributions,
      issues: c.totalIssueContributions,
      repositories: c.totalRepositoriesWithContributedCommits,
    };
    totals = {
      commits: totals.commits + c.totalCommitContributions,
      pullRequests: totals.pullRequests + c.totalPullRequestContributions,
      issues: totals.issues + c.totalIssueContributions,
      repositories: Math.max(totals.repositories, c.totalRepositoriesWithContributedCommits),
    };

    const days = c.contributionCalendar.weeks.flatMap((w) =>
      w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount })),
    );
    calendar = calendar.concat(days);
  }

  // Deduplicate: adjacent yearly windows overlap at the boundary weeks.
  const seen = new Map();
  for (const day of calendar) seen.set(day.date, day);

  // The current year's window runs to 31 December, so GitHub returns the rest
  // of the year as zero-count days. Rendering those draws months of empty
  // squares that read as inactivity rather than as the future.
  const today = new Date().toISOString().slice(0, 10);

  calendar = [...seen.values()]
    .filter((day) => day.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  return { byYear, calendar, totals };
}

async function fetchRepoDetail(login, repo, token) {
  const [languages, commits] = await Promise.all([
    rest(`/repos/${login}/${repo.name}/languages`, token).catch(() => ({})),
    // `per_page=1` plus the Link header is the cheap way to get a commit count
    // without walking every page of history.
    fetch(`${API}/repos/${login}/${repo.name}/commits?per_page=1`, { headers: headers(token) })
      .then((res) => {
        const link = res.headers.get('link') || '';
        const last = link.match(/[?&]page=(\d+)>;\s*rel="last"/);
        return last ? Number(last[1]) : res.ok ? 1 : 0;
      })
      .catch(() => 0),
  ]);
  return { languages, commits };
}

export async function collect({ login, token, includeForks = false }) {
  console.log(`fetching github data for ${login}`);

  const profile = await rest(`/users/${login}`, token);

  const rawRepos = await allPages(`/users/${login}/repos?sort=pushed&type=owner`, token);
  const repos = rawRepos.filter((r) => !r.private && (includeForks || !r.fork) && !r.archived);
  console.log(`  ${repos.length} public repositories`);

  const detailed = [];
  for (const repo of repos) {
    const detail = await fetchRepoDetail(login, repo, token);
    detailed.push({
      name: repo.name,
      description: repo.description,
      url: repo.html_url,
      homepage: repo.homepage || null,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      watchers: repo.subscribers_count ?? 0,
      openIssues: repo.open_issues_count,
      language: repo.language,
      languages: detail.languages,
      commits: detail.commits,
      topics: repo.topics || [],
      size: repo.size,
      license: repo.license?.spdx_id || null,
      createdAt: repo.created_at,
      pushedAt: repo.pushed_at,
    });
  }

  const startYear = new Date(profile.created_at).getUTCFullYear();
  const thisYear = new Date().getUTCFullYear();
  const years = [];
  for (let y = startYear; y <= thisYear; y += 1) years.push(y);

  const contributions = await fetchContributions(login, token, years);

  const languages = {};
  for (const repo of detailed) {
    for (const [name, bytes] of Object.entries(repo.languages)) {
      languages[name] = (languages[name] || 0) + bytes;
    }
  }

  const totalStars = detailed.reduce((n, r) => n + r.stars, 0);
  const totalCommits = detailed.reduce((n, r) => n + r.commits, 0);
  const activeDays = contributions.calendar.filter((d) => d.count > 0).length;

  return {
    generatedAt: new Date().toISOString(),
    profile: {
      login: profile.login,
      name: profile.name || profile.login,
      bio: profile.bio,
      avatarUrl: profile.avatar_url,
      url: profile.html_url,
      location: profile.location,
      blog: profile.blog,
      followers: profile.followers,
      following: profile.following,
      createdAt: profile.created_at,
      publicRepos: profile.public_repos,
    },
    repos: detailed.sort((a, b) => b.stars - a.stars || new Date(b.pushedAt) - new Date(a.pushedAt)),
    contributions,
    languages,
    stats: {
      repos: detailed.length,
      stars: totalStars,
      forks: detailed.reduce((n, r) => n + r.forks, 0),
      commits: totalCommits,
      activeDays,
      languages: Object.keys(languages).length,
      longestStreak: longestStreak(contributions.calendar),
    },
  };
}

function longestStreak(calendar) {
  let best = 0;
  let current = 0;
  for (const day of calendar) {
    if (day.count > 0) {
      current += 1;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}
