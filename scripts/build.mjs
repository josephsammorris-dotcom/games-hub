// Builds the games list: finds your public GitHub repos tagged "game" and writes public/games.json
import fs from 'node:fs/promises';
import path from 'node:path';

const OWNER = process.env.GITHUB_OWNER;
const TOPIC = process.env.GAME_TOPIC || 'game';
const SUBDOMAIN = process.env.WORKERS_SUBDOMAIN || 'josephsammorris'; // your workers.dev account subdomain
if (!OWNER) throw new Error('GITHUB_OWNER is not set');

const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'games-hub' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const repos = [];
for (let page = 1; ; page++) {
  const res = await fetch(`https://api.github.com/users/${OWNER}/repos?per_page=100&page=${page}`, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  const batch = await res.json();
  repos.push(...batch);
  if (batch.length < 100) break;
}

const prettify = name => name.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const games = repos
  .filter(r => !r.archived && !r.fork && (r.topics || []).includes(TOPIC))
  .map(r => ({
    id: r.name.toLowerCase(),
    title: prettify(r.name),
    description: r.description || '',
    url: r.homepage?.trim() || `https://${r.name.toLowerCase()}.${SUBDOMAIN}.workers.dev`,
    repo: r.html_url,
    created: r.created_at,
    updated: r.pushed_at,
  }))
  .sort((a, b) => a.title.localeCompare(b.title));

await fs.mkdir('public', { recursive: true });
await fs.writeFile(path.join('public', 'games.json'), JSON.stringify(games, null, 2) + '\n');
console.log(`Wrote ${games.length} game(s): ${games.map(g => g.id).join(', ')}`);
