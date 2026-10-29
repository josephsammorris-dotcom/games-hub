# Games Hub

A plain list of all your games. A GitHub Action finds every public repo tagged `game` and commits `public/games.json` to this repo. Cloudflare watches the repo and publishes each commit.

## Adding a game
1. Add the topic **`game`** to the game's repo (About → gear icon → Topics).
2. Put its live address in the About → Website field. If empty, the hub guesses `https://<repo>.josephsammorris.workers.dev`.
3. Add a one-line Description; it shows under the title.

The list refreshes every 6 hours, on every push here, and on demand (Actions → *Refresh games list* → Run workflow). For instant updates, a game's deploy workflow can send a `game-published` repository_dispatch to this repo (needs a fine-grained token).

## Notes
- Remove the `game` topic (or archive the repo) to hide a game.
- Preview locally: `GITHUB_OWNER=josephsammorris-dotcom npm run build && npm run preview`
