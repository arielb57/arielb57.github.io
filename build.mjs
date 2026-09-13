#!/usr/bin/env node
/**
 * Build the site.
 *
 *   node build.mjs                 fetch from GitHub and write dist/
 *   node build.mjs --offline       rebuild from the last cached fetch
 *   node build.mjs --out public    write somewhere other than dist/
 *
 * The last successful fetch is cached to .cache/github.json. If GitHub is
 * unreachable during a scheduled rebuild, the site is rebuilt from the cache
 * with a warning instead of the deploy failing and taking the live page with it.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collect } from './scripts/fetch-github.mjs';
import { render } from './scripts/render.mjs';
import { about } from './src/content.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const CACHE = join(ROOT, '.cache', 'github.json');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const LOGIN = value('login', process.env.GITHUB_LOGIN || 'arielb57');
const OUT = join(ROOT, value('out', 'dist'));
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;

function loadCache() {
  if (!existsSync(CACHE)) return null;
  try {
    return JSON.parse(readFileSync(CACHE, 'utf8'));
  } catch {
    return null;
  }
}

function saveCache(data) {
  mkdirSync(dirname(CACHE), { recursive: true });
  writeFileSync(CACHE, `${JSON.stringify(data, null, 2)}\n`);
}

async function getData() {
  if (flag('offline')) {
    const cached = loadCache();
    if (!cached) throw new Error('--offline requested but .cache/github.json does not exist');
    console.log(`using cached data from ${cached.generatedAt}`);
    return cached;
  }

  if (!token) {
    console.warn('! no GITHUB_TOKEN set — using unauthenticated requests (60/hour, no contribution calendar)');
  }

  try {
    const data = await collect({ login: LOGIN, token });
    saveCache(data);
    return data;
  } catch (err) {
    const cached = loadCache();
    if (!cached) throw err;
    console.warn(`! GitHub fetch failed (${err.message})`);
    console.warn(`! falling back to cached data from ${cached.generatedAt}`);
    return cached;
  }
}

const data = await getData();

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'index.html'), render(data, { about }));
copyFileSync(join(ROOT, 'src', 'styles.css'), join(OUT, 'styles.css'));
copyFileSync(join(ROOT, 'src', 'app.js'), join(OUT, 'app.js'));

// Published so the numbers on the page are inspectable, and so anything else
// can consume them without scraping the HTML.
writeFileSync(join(OUT, 'data.json'), `${JSON.stringify(data, null, 2)}\n`);

// Tells GitHub Pages not to run the output through Jekyll.
writeFileSync(join(OUT, '.nojekyll'), '');

const kb = (path) => Math.round(readFileSync(join(OUT, path)).length / 1024);

console.log(`
built ${OUT}
  index.html   ${kb('index.html')} KB
  styles.css   ${kb('styles.css')} KB
  app.js       ${kb('app.js')} KB
  data.json    ${kb('data.json')} KB

  ${data.stats.repos} repositories · ${data.stats.commits} commits · ${data.stats.stars} stars
  contribution days on record: ${data.contributions.calendar.length}
`);
