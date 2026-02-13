# ForkArcade Platform

A platform for creating and playing web games published on GitHub Pages.

> **TL;DR**: Games = repositories in the `ForkArcade` org on GitHub Pages in iframes. Templates = dynamically discovered via GitHub API (topic `forkarcade-template`), self-contained (engine inside). Platform provides SDK (scoring) + narrative. Server = auth + scores. No build step.

## Architecture

```
client/          React + Vite (port 5173)
server/          Express + SQLite (port 8787)
mcp/             MCP server (Python) — tools for Claude Code
sdk/
  forkarcade-sdk.js   SDK (postMessage, scoring, auth)
  fa-narrative.js     Narrative module (graph, variables, transition)
  _platform.md        Platform golden rules (prepended to every game prompt)
.claude/skills/  Skills: new-game
```

## Key Decisions

- **Game catalog = GitHub API** — there is no games table. Client fetches repository list from the `ForkArcade` org filtered by the `forkarcade-game` topic. Do not add a games table.
- **Template catalog = GitHub API** — templates are repos with the `forkarcade-template` topic. MCP tools (`github_templates.py`) fetch them dynamically. Asset metadata lives in `_assets.json` in the template repo. No hardcoded template list.
- **Games in iframe** — each game runs on GitHub Pages, embedded in an `<iframe>` on the platform. Communication via postMessage (SDK).
- **Server is thin** — auth (GitHub OAuth + JWT cookie) + scores + wallet + evolve voting (SQLite). Do not add game logic or narrative on the server side.
- **Narrative is client-side** — narrative data (graph, variables, events) passes through postMessage from iframe to parent. Not persisted in the database.
- **No build step** — games are vanilla JS, `<script>` tags, GitHub Pages (`build_type=legacy`). No bundler.

## Platform Provides

- **SDK** (`forkarcade-sdk.js`) — scoring, auth, postMessage. `init_game` copies it, `update_sdk` updates it.
- **Narrative** (`fa-narrative.js`) — graph, variables, transition(). Platform mission: dev focuses on the game, narrative comes for free. `init_game` copies from platform.

## Engine (in templates)

Engine modules live in template repos (each template is self-contained). `init_game` clones the template — engine is already inside.

- Pattern: vanilla JS, IIFE, global namespace `window.FA`
- **dt is in milliseconds** (~16.67ms per tick). Timers must use ms (e.g. `life: 4000` = 4 seconds)

## Game Structure

The entire game structure is defined in the template — `.forkarcade.json` in the template repo:

```json
{
  "template": "strategy-rpg",
  "engineFiles": ["fa-engine.js", "fa-renderer.js", "fa-input.js", "fa-audio.js"],
  "gameFiles": ["data.js", "map.js", "battle.js", "render.js", "main.js"]
}
```

- `engineFiles` — which engine modules are in the template
- `gameFiles` — game files (skeleton in template repo, implementation by Claude)
- `init_game` clones the template (engine + game files already inside) and copies SDK

## Templates (dynamic)

Templates discovered via GitHub API by the `forkarcade-template` topic. Each template repo has:
- Topic `forkarcade-template` + category topic (e.g. `strategy-rpg`, `roguelike`)
- `.forkarcade.json` — `template` (key), `engineFiles`, `gameFiles`
- `_assets.json` — asset metadata (style, palette, sprite categories)
- `_prompt.md` — game design prompt for Claude (mechanics, scoring, events, rendering)
- `CLAUDE.md` — engine API documentation for Claude
- Skeleton game files with comments

Adding a new template = creating a repo on GitHub with the appropriate topics and files. Zero changes to platform code.

## PostMessage Protocol (SDK <-> Platform)

| Type | Direction | Description |
|------|-----------|-------------|
| `FA_READY` | game -> platform | Game ready |
| `FA_INIT` | platform -> game | Passes slug |
| `FA_SUBMIT_SCORE` | game -> platform | Submits score (requestId) |
| `FA_SCORE_RESULT` | platform -> game | Response (requestId) |
| `FA_GET_PLAYER` | game -> platform | Requests player info (requestId) |
| `FA_PLAYER_INFO` | platform -> game | Response (requestId) |
| `FA_NARRATIVE_UPDATE` | game -> platform | Narrative state (fire-and-forget) |
| `FA_COIN_EARNED` | platform -> game | Coins earned after score submit (fire-and-forget) |

## Server — Endpoints

- `GET /auth/github` -> redirect to GitHub OAuth
- `GET /auth/github/callback` -> exchange code for token, upsert user, set cookie
- `POST /auth/logout` -> clear cookie
- `POST /api/games/:slug/score` (auth) -> save score, mint coins
- `GET /api/games/:slug/leaderboard` -> top 50 per game
- `GET /api/me` (auth) -> current user
- `GET /api/wallet` (auth) -> coin balance
- `POST /api/games/:slug/evolve-issues` (auth) -> create `[EVOLVE]` issue on GitHub
- `POST /api/games/:slug/vote` (auth) -> vote on evolve issue (burn coins)
- `GET /api/games/:slug/votes` -> aggregated vote totals per issue
- `POST /api/games/:slug/evolve-trigger` (auth) -> add `evolve` label (triggers GitHub Actions)

## Database (SQLite)

Four tables: `users`, `scores`, `wallets` (github_user_id, balance), `votes` (game_slug, issue_number, coins_spent). Scores identified by `game_slug` (TEXT), not by FK to games.

## Client — Routing

- `/` -> HomePage — game catalog from GitHub API (topic `forkarcade-game`)
- `/templates` -> TemplatesPage — template list from GitHub API (topic `forkarcade-template`)
- `/play/:slug` -> GamePage — iframe + tabs (Info | Leaderboard | Narrative | Evolve | Changelog)

## MCP (mcp/src/main.py)

12 tools, templates fetched dynamically from GitHub API (`github_templates.py`):

- **Workflow**: `list_templates`, `init_game`, `get_sdk_docs`, `get_game_prompt`, `validate_game`, `publish_game`, `update_sdk`
- **Assets**: `get_asset_guide`, `create_sprite`, `validate_assets`, `preview_assets`
- **Versions**: `get_versions`

Publish sets the `forkarcade-game` topic + category topic, enables GitHub Pages, and creates a version snapshot (`/versions/v{N}/`). Asset tools create pixel art sprites in `_sprites.json` format -> generated `sprites.js`.

## Game Versioning

Games evolve through GitHub issues. Every version is playable.

### Flow
1. Player proposes `[EVOLVE]` issue via platform -> votes reach threshold -> `evolve` label added -> GitHub Actions triggers Claude Code
2. Claude Code implements -> opens PR
3. PR merge -> workflow creates snapshot in `/versions/v{N}/`
4. Platform displays version selector + changelog

### Version Structure in Game Repo
```
/index.html          <- latest
/game.js
/versions/v1/        <- snapshot v1
/versions/v2/        <- snapshot v2
/changelog/v1.md     <- LLM reasoning log for v1
/changelog/v2.md     <- LLM reasoning log for v2
/.forkarcade.json    <- metadata with versions array
/.github/workflows/  <- evolve.yml + version.yml
```

### Changelog Files
Each evolve creates `changelog/v{N}.md` — structured LLM log with: issue reference, changes list, reasoning/tradeoffs, files modified. Convention defined in `_platform.md`. Platform displays in Changelog tab (click to view full log).

### Scores
Scores have a `version` column — SDK automatically includes the version. Leaderboard filtered per version (`?version=N`).

## ZERO OVERENGINEERING RULE

- **NEVER create bonus files** — no CLI wrappers, helper scripts, extra tools "just in case"
- **NEVER add features nobody asked for** — every unnecessary file is technical debt
- **Do EXACTLY what was asked** — nothing more, nothing less
- **Don't propose "bonuses"** — if the user wants an extra tool, they'll ask

## Conventions

- Inline styles (no CSS framework)
- ESM (`import`/`export`) in client and server, not CommonJS
- Vanilla JS in SDK and engine (no frameworks — must work in any game)
- IIFE pattern in games, global namespace `window.FA`
- **SDK is local** — `forkarcade-sdk.js` copied to the game repo by `init_game`, updated by `update_sdk`. Source of truth: `sdk/forkarcade-sdk.js`
- **Engine is in the template** — engine files come from the template repo. Each template is self-contained.
- **Narrative is in the platform** — `fa-narrative.js` copied from `sdk/` by `init_game`. Platform mission.
- **English only** — all code, comments, docs, CLAUDE.md, prompts, commit messages, and generated content must be in English, regardless of the language the user communicates in.
