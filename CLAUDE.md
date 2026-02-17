# ForkArcade Platform

A platform for creating and playing web games published on GitHub Pages.

> **TL;DR**: Games = repositories in the `ForkArcade` org on GitHub Pages in iframes. Templates = dynamically discovered via GitHub API (topic `forkarcade-template`), self-contained (engine inside). Platform provides SDK (scoring) + narrative. Server = auth + scores + wallet + voting. No build step.

## Architecture

```
client/              React + Vite (port 5173)
  src/pages/         HomePage, GamePage, TemplatesPage, TemplateDetailPage, RotEditorPage
  src/components/    ui.jsx (shared), Leaderboard, NarrativePanel, EvolvePanel, VotingPanel, etc.
  src/theme.js       Design tokens (colors, spacing, typography) — imported as T everywhere
  src/api.js         API client (apiFetch, githubFetch, githubRawUrl)
server/              Express + Turso/libsql (port 8787)
  src/routes/        scores.js, wallet.js (evolve + new-game + voting), github.js (proxy + cache)
mcp/                 MCP server (Python) — tools for Claude Code
  src/handlers/      workflow.py, assets.py, versions.py, thumbnail.py
sdk/
  forkarcade-sdk.js  SDK (postMessage, scoring, auth)
  fa-narrative.js    Narrative module (graph, variables, transition)
  _platform.md       Platform golden rules (prepended to every game prompt)
.claude/skills/      Skills: new-game, evolve, publish
```

## Key Decisions

- **Game catalog = GitHub API** — there is no games table. Client fetches repository list from the `ForkArcade` org filtered by the `forkarcade-game` topic. Do not add a games table.
- **Template catalog = GitHub API** — templates are repos with the `forkarcade-template` topic. MCP tools (`github_templates.py`) fetch them dynamically. Asset metadata lives in `_assets.json` in the template repo. No hardcoded template list.
- **Games in iframe** — each game runs on GitHub Pages, embedded in an `<iframe>` on the platform. Communication via postMessage (SDK).
- **Server is thin** — auth (GitHub OAuth + JWT cookie) + scores + wallet + evolve voting (Turso/libsql). Do not add game logic or narrative on the server side.
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
| `FA_INIT` | platform -> game | Passes `{ slug, version }` |
| `FA_SUBMIT_SCORE` | game -> platform | Submits score (requestId) |
| `FA_SCORE_RESULT` | platform -> game | Response (requestId) |
| `FA_GET_PLAYER` | game -> platform | Requests player info (requestId) |
| `FA_PLAYER_INFO` | platform -> game | Response (requestId) |
| `FA_NARRATIVE_UPDATE` | game -> platform | Narrative state (fire-and-forget) |
| `FA_COIN_EARNED` | platform -> game | Coins earned after score submit (fire-and-forget) |
| `FA_SPRITES_UPDATE` | platform -> game | Hot-reload sprite definitions (fire-and-forget) |

## Server — Endpoints

**Auth:**
- `GET /auth/github` -> redirect to GitHub OAuth
- `GET /auth/github/callback` -> exchange code for token, upsert user, set cookie
- `POST /auth/logout` -> clear cookie

**User:**
- `GET /api/me` (auth) -> current user
- `GET /api/wallet` (auth) -> coin balance

**Scores:**
- `POST /api/games/:slug/score` (auth) -> save score, mint coins (`floor(score * 0.1)`, no bonus for personal record currently)
- `GET /api/games/:slug/leaderboard?version=N` -> top 50 per game, filtered by version if provided

**Evolve (game changes):**
- `POST /api/games/:slug/evolve-issues` (auth) -> create `[EVOLVE]` issue on GitHub
- `POST /api/games/:slug/vote` (auth) -> vote on evolve issue (burn coins)
- `GET /api/games/:slug/votes` -> aggregated vote totals per issue
- `POST /api/games/:slug/evolve-trigger` (auth) -> add `evolve` label (threshold: 3+ unique voters OR author voted)

**New Game proposals:**
- `POST /api/new-game/issues` (auth) -> create `[NEW-GAME]` issue on platform repo
- `POST /api/new-game/vote` (auth) -> vote on new-game issue (burn coins)
- `GET /api/new-game/votes` -> aggregated vote totals per issue
- `POST /api/new-game/trigger` (auth) -> add `approved` label (threshold: 10+ unique voters)

**GitHub proxy (authenticated, cached, avoids rate limits):**
- `GET /api/github/repos` -> org repos (5-min cache)
- `GET /api/github/proxy/*` -> generic GitHub API proxy (2-min cache)
- `GET /api/github/raw/*` -> raw file proxy (5-min cache)
- All endpoints serve stale data on upstream error

## Database (Turso/libsql)

Four tables: `users`, `scores` (game_slug, score, version), `wallets` (github_user_id, balance), `votes` (game_slug, issue_number, coins_spent). Scores identified by `game_slug` (TEXT), not by FK to games. Votes are coins-based: min 10, multiples of 10.

## Client — Routing

- `/` -> HomePage — game catalog from GitHub API (topic `forkarcade-game`) + about sidebar (General/Coins/Evolve/Propose tabs)
- `/templates` -> TemplatesPage — template catalog from GitHub API (topic `forkarcade-template`)
- `/templates/:slug` -> TemplateDetailPage — template details (_prompt.md + engine/game files + palette + sprites)
- `/play/:slug` -> GamePage — iframe + tabs (Info | Leaderboard | Narrative | Evolve | Appearance | Changelog) + version selector
- `/edit/:slug` -> RotEditorPage — map + sprite editor. Edits `_sprites.json` and map data. Saves to localStorage, hot-reloads in game iframe. Ctrl+V pastes image. "Propose sprites" button creates `data-patch` evolve issue.

## MCP (mcp/src/main.py)

15 tools, templates fetched dynamically from GitHub API (`github_templates.py`):

- **Workflow**: `list_templates`, `init_game`, `get_sdk_docs`, `get_game_prompt`, `validate_game`, `publish_game`, `update_sdk`
- **Assets**: `get_asset_guide`, `create_sprite`, `validate_assets`, `preview_assets`, `create_thumbnail`
- **Versions**: `get_versions`
- **Evolve**: `list_evolve_issues`, `apply_data_patch` — deterministic apply of visual changes (sprites) without LLM interpretation

Publish sets the `forkarcade-game` topic + category topic, enables GitHub Pages, and creates a version snapshot (`/versions/v{N}/`). Asset tools create pixel art sprites in `_sprites.json` format -> generated `sprites.js`.

## Skills (.claude/skills/)

- `/new-game` — full game creation flow (template selection → implementation → publish)
- `/evolve` — list evolve-ready issues, pick one, implement, publish new version
- `/publish` — validate + publish current game

## Game Versioning

Games evolve through GitHub issues. Every version is playable.

### Flow (text-based — mechanics, balance, features)
1. Player proposes `[EVOLVE]` issue via platform -> votes reach threshold -> `evolve` label added
2. Use `/evolve` skill (or `list_evolve_issues` MCP tool) to see ready issues
3. Implement changes locally, create `changelog/v{N}.md`
4. Use `/publish` to push and create version snapshot
5. Platform displays version selector + changelog

### Flow (data-patch — sprites, visual changes)
1. Player edits sprites in RotEditorPage (`/edit/:slug`)
2. Player clicks "Propose sprites" -> creates `[EVOLVE]` issue with `data-patch` label + JSON data in body
3. Community votes (same mechanism, same threshold)
4. `/evolve` skill detects `data-patch` label -> calls `apply_data_patch` MCP tool
5. Tool writes `_sprites.json` + regenerates `sprites.js` deterministically — no LLM interpretation
6. Changelog + publish as usual

Issue body format: human-readable summary + ` ```json:data-patch ` code block with `{ "type": "sprites", "data": { ...full _sprites.json... } }`.

### Version Structure in Game Repo
```
/index.html          <- latest
/game.js
/versions/v1/        <- snapshot v1
/versions/v2/        <- snapshot v2
/changelog/v1.md     <- LLM reasoning log for v1
/changelog/v2.md     <- LLM reasoning log for v2
/.forkarcade.json    <- metadata with versions array
```

### Changelog Files
Each evolve creates `changelog/v{N}.md` — structured LLM log with: issue reference, changes list, reasoning/tradeoffs, files modified. Convention defined in `_platform.md`. Platform displays in Changelog tab (click to view full log).

### Scores
Scores have a `version` column — SDK automatically includes the version. Leaderboard filtered per version (`?version=N`).

## WORKING WITH TEMPLATES — CRITICAL

- **Templates live in `../templates/`** (relative to platform root, i.e. `/home/dadmor/code/FORK-ARCADE/templates/`). NEVER clone template repos elsewhere.
- **Before cloning a template repo**, check if it already exists in `../templates/`. If it does, work there.
- **Template work = template repo only** — when fixing/updating a template, NEVER modify platform files (`client/`, `server/`, `sdk/`). Templates are separate repos.
- **Platform files are sacred** — do not delete, rename, or restructure platform components unless explicitly asked to change the platform.
- **The OLD sprite system is DELETED** — SpriteEditorPage, SpritePanel, SpriteSidebar, FramesPanel, PalettePanel, PixelGrid are all gone. Do NOT recreate or restore them. The NEW system is RotEditorPage + editors/SpriteEditor.jsx.

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
