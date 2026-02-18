# ForkArcade Platform

> **TL;DR**: Games = repos in `ForkArcade` org on GitHub Pages in iframes. Templates = discovered via GitHub API (topic `forkarcade-template`), self-contained. Platform provides SDK + narrative. Server = auth + scores + wallet + voting. No build step.

## Architecture

```
client/              React + Vite (port 5173)
  src/pages/         HomePage, GamePage, TemplatesPage, TemplateDetailPage, RotEditorPage
  src/components/    ui.jsx (shared), Leaderboard, NarrativePanel, EvolvePanel, VotingPanel
  src/theme.js       Design tokens — imported as T everywhere
  src/api.js         API client (apiFetch, githubFetch, githubRawUrl)
server/              Express + Turso/libsql (port 8787)
  src/routes/        scores.js, wallet.js, github.js (proxy + cache)
mcp/                 MCP server (Python) — tools for Claude Code
sdk/                 forkarcade-sdk.js, fa-narrative.js, _platform.md
.claude/skills/      Skills: new-game, evolve, publish
docs/                Reference docs (endpoints, protocol, versioning, data formats)
```

## Key Decisions

- **Game catalog = GitHub API** — no games table. Repos filtered by `forkarcade-game` topic.
- **Template catalog = GitHub API** — repos with `forkarcade-template` topic. No hardcoded list.
- **Games in iframe** — GitHub Pages, communication via postMessage (SDK).
- **Server is thin** — auth + scores + wallet + voting only. No game logic server-side.
- **Narrative is client-side** — not persisted in database.
- **No build step** — vanilla JS, `<script>` tags, GitHub Pages (`build_type=legacy`).

## Game Structure

Defined by `.forkarcade.json` in template repo: `template`, `engineFiles`, `gameFiles`. `init_game` clones template + copies SDK. Engine is vanilla JS, IIFE, `window.FA`. **dt is in milliseconds**.

## Reference Docs

Detailed reference moved to `docs/` to save tokens:
- `docs/api-endpoints.md` — all server endpoints + database schema
- `docs/protocol.md` — postMessage types (SDK <-> Platform)
- `docs/versioning.md` — evolve flows (text-based + data-patch), version structure, changelog
- `docs/data-formats.md` — sprites/maps data pattern, `_maps.json` format, editor architecture

## Client Routing

- `/` -> HomePage (game catalog + about sidebar)
- `/templates` -> TemplatesPage
- `/templates/:slug` -> TemplateDetailPage
- `/play/:slug` -> GamePage (iframe + tabs + version selector)
- `/edit/:slug` -> RotEditorPage (map + sprite editor, localStorage, hot-reload)

## MCP Tools

15 tools: `list_templates`, `init_game`, `get_sdk_docs`, `get_game_prompt`, `validate_game`, `publish_game`, `update_sdk`, `get_asset_guide`, `create_sprite`, `validate_assets`, `preview_assets`, `create_thumbnail`, `get_versions`, `list_evolve_issues`, `apply_data_patch`

## Skills

- `/new-game` — template selection -> implementation -> publish
- `/evolve` — list ready issues, implement, publish new version
- `/publish` — validate + publish

## WORKING WITH TEMPLATES — CRITICAL

- **Templates live in `../templates/`** — NEVER clone elsewhere.
- **Template work = template repo only** — NEVER modify platform files.
- **The OLD sprite system is DELETED** — do NOT recreate SpriteEditorPage, SpritePanel, etc. New system: RotEditorPage + editors/*.

## ZERO OVERENGINEERING RULE

- Do EXACTLY what was asked — nothing more, nothing less.
- NEVER create bonus files, features, or propose extras.

## Conventions

- Inline styles (no CSS framework), ESM imports, English only
- Vanilla JS in SDK/engine (no frameworks), IIFE in games, `window.FA`
- SDK copied by `init_game`, engine lives in template repo
