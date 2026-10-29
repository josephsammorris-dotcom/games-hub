// Builds the games hub:
// 1. Lists your public GitHub repos tagged with the "game" topic
// 2. Screenshots each game's live URL for a thumbnail
// 3. Writes public/games.json for the hub page to read
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OWNER = process.env.GITHUB_OWNER;
const OWNER_DEFAULT_SUBDOMAIN = 'josephsammorris'; // your workers.dev account subdomain
const TOPIC = process.env.GAME_TOPIC || 'game';
const SUBDOMAIN = process.env.WORKERS_SUBDOMAIN || OWNER_DEFAULT_SUBDOMAIN;
const WAIT_MS = Number(process.env.SCREENSHOT_WAIT_MS || 5000);
const OUT = 'public';
const THUMBS = path.join(OUT, 'thumbs');

if (!OWNER) throw new Error('GITHUB_OWNER is not set');

const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'games-hub' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function listGameRepos() {
  const repos = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`https://api.github.com/users/${OWNER}/repos?per_page=100&page=${page}&sort=pushed`, { headers });
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
    const batch = await res.json();
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return repos.filter(r => !r.archived && !r.fork && (r.topics || []).includes(TOPIC));
}

const prettify = name => name.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// Reuse last run's thumbnails (committed in the repo) for games that haven't changed.
async function previousGames() {
  try {
    const list = JSON.parse(await fs.readFile(path.join(OUT, 'games.json'), 'utf8'));
    return Object.fromEntries(list.map(g => [g.id, g]));
  } catch { return {}; }
}

async function haveThumb(file) {
  try { await fs.access(file); return true; } catch { return false; }
}

async function main() {
  await fs.mkdir(THUMBS, { recursive: true });
  const repos = await listGameRepos();
  console.log(`Found ${repos.length} game repo(s) tagged "${TOPIC}"`);
  const prev = await previousGames();

  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

  const games = [];
  for (const r of repos) {
    const url = r.homepage?.trim() || `https://${r.name.toLowerCase()}.${SUBDOMAIN}.workers.dev`;
    const id = r.name.toLowerCase();
    const thumbRel = `thumbs/${id}.jpg`;
    const thumbFile = path.join(OUT, thumbRel);
    let thumb = null;

    // A hand-picked thumbnail (public/custom-thumbs/<id>.jpg|png|webp) always wins over a screenshot.
    let custom = null;
    for (const ext of ['jpg', 'png', 'webp']) {
      if (await haveThumb(path.join(OUT, 'custom-thumbs', `${id}.${ext}`))) { custom = `custom-thumbs/${id}.${ext}`; break; }
    }

    const old = prev[id];
    if (custom) {
      thumb = custom;
      console.log(`  ★ ${r.name}: using custom thumbnail`);
    } else if (old && old.updated === r.pushed_at && old.url === url && await haveThumb(thumbFile)) {
      thumb = thumbRel;
      console.log(`  ↺ ${r.name}: unchanged, reused thumbnail`);
    } else {
      const page = await context.newPage();
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        await page.waitForTimeout(WAIT_MS); // let three.js scenes render
        await page.screenshot({ path: thumbFile, type: 'jpeg', quality: 80 });
        thumb = thumbRel;
        console.log(`  ✓ ${r.name}: screenshot taken`);
      } catch (e) {
        console.warn(`  ✗ ${r.name}: screenshot failed (${e.message.split('\n')[0]})`);
      } finally {
        await page.close();
      }
    }

    games.push({
      id,
      title: prettify(r.name),
      description: r.description || '',
      url,
      repo: r.html_url,
      thumb,
      created: r.created_at,
      updated: r.pushed_at,
    });
  }

  await browser.close();
  games.sort((a, b) => b.updated.localeCompare(a.updated));
  await fs.writeFile(path.join(OUT, 'games.json'), JSON.stringify(games, null, 2));
  console.log(`Wrote ${games.length} game(s) to public/games.json`);
}

main().catch(e => { console.error(e); process.exit(1); });
