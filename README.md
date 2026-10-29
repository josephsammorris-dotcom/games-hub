# Games Hub

One site listing all your games. A GitHub Action finds every public repo tagged `game`, screenshots its live site for a thumbnail, and commits `public/games.json` plus `public/thumbs/` back to this repo. Cloudflare watches the repo and publishes each commit, exactly like your game repos. No Cloudflare tokens needed.

## One-time setup
1. Create this repo on GitHub (`games-hub`) and push the code.
2. Cloudflare dashboard → Workers & Pages → Create → Import a repository → pick `games-hub`. Project name `games-hub`, build command empty, deploy command `npx wrangler deploy`.
3. GitHub → repo Settings → Actions → General → Workflow permissions → **Read and write**.
4. Actions tab → *Refresh games list* → **Run workflow**.

## Adding a game
1. Add the topic **`game`** to the game's repo (About → gear icon → Topics).
2. Put its live address in the About → Website field. If empty, the hub guesses `https://<repo>.josephsammorris.workers.dev`.
3. Add a one-line Description; it shows on the card.

The list refreshes every 6 hours, on every push here, and on demand. For instant updates, a game's deploy workflow can send a `game-published` repository_dispatch to this repo (needs a fine-grained token).

## Notes
- Remove the `game` topic (or archive the repo) to hide a game.
- Thumbnails are taken 5s after load (`SCREENSHOT_WAIT_MS`), with software WebGL.
- Preview locally: `GITHUB_OWNER=josephsammorris-dotcom npm run build && npm run preview`
