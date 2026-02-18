# Server API Endpoints

## Auth
- `GET /auth/github` -> redirect to GitHub OAuth
- `GET /auth/github/callback` -> exchange code for token, upsert user, set cookie
- `POST /auth/logout` -> clear cookie

## User
- `GET /api/me` (auth) -> current user
- `GET /api/wallet` (auth) -> coin balance

## Scores
- `POST /api/games/:slug/score` (auth) -> save score, mint coins (`floor(score * 0.1)`)
- `GET /api/games/:slug/leaderboard?version=N` -> top 50 per game, filtered by version

## Evolve (game changes)
- `POST /api/games/:slug/evolve-issues` (auth) -> create `[EVOLVE]` issue on GitHub
- `POST /api/games/:slug/vote` (auth) -> vote on evolve issue (burn coins)
- `GET /api/games/:slug/votes` -> aggregated vote totals per issue
- `POST /api/games/:slug/evolve-trigger` (auth) -> add `evolve` label (threshold: 3+ unique voters OR author voted)

## New Game proposals
- `POST /api/new-game/issues` (auth) -> create `[NEW-GAME]` issue on platform repo
- `POST /api/new-game/vote` (auth) -> vote on new-game issue (burn coins)
- `GET /api/new-game/votes` -> aggregated vote totals per issue
- `POST /api/new-game/trigger` (auth) -> add `approved` label (threshold: 10+ unique voters)

## GitHub proxy (authenticated, cached)
- `GET /api/github/repos` -> org repos (5-min cache)
- `GET /api/github/proxy/*` -> generic GitHub API proxy (2-min cache)
- `GET /api/github/raw/*` -> raw file proxy (5-min cache)
- All endpoints serve stale data on upstream error

## Database (Turso/libsql)

Four tables: `users`, `scores` (game_slug, score, version), `wallets` (github_user_id, balance), `votes` (game_slug, issue_number, coins_spent). Scores identified by `game_slug` (TEXT), not by FK to games. Votes are coins-based: min 10, multiples of 10.
