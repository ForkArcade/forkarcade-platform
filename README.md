# ForkArcade Platform

A platform for creating and playing web games with Claude Code. Games published on GitHub Pages, loaded directly into the platform page.

> **TL;DR**: Tell Claude "make me a roguelike about zombies" — you get a GitHub repo with a working game, sprites, and a leaderboard.

## Quick Start

### 1. Run the platform

```bash
# Server
cd server && cp .env.example .env && npm install && npm run dev

# Client (separate terminal)
cd client && npm install && npm run dev
```

Fill in `server/.env`:
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` — from GitHub OAuth App
- `JWT_SECRET` — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 2. Connect MCP to Claude Code

```bash
claude mcp add forkarcade /FULL/PATH/TO/forkarcade-platform/mcp/.venv/bin/python3 /FULL/PATH/TO/forkarcade-platform/mcp/src/main.py
```

One-time setup — Claude Code will remember it.

### 3. Create a game

```
make me a roguelike about exploring an abandoned castle
```

Claude will pick a template, fork the repo, implement the game, create sprites, and publish it.

### 4. Play

http://localhost:5173 — the game will appear in the catalog.

## Skills

| Command | Context | Description |
|---------|---------|-------------|
| `/new-game` | `cd forkarcade-platform && claude` | Create a new game from template |
| (edit) | `cd ../games/<slug> && claude` | Edit an existing game |
| `/evolve` | `cd ../games/<slug> && claude` | Implement voted evolve issue |
| `/publish` | `cd ../games/<slug> && claude` | Validate and publish |

## MCP Tools

**Workflow**: `list_templates` `init_game` `validate_game` `publish_game` `get_sdk_docs` `get_game_prompt` `update_sdk` `list_evolve_issues`

**Assets**: `get_asset_guide` `create_sprite` `validate_assets` `preview_assets`

**Other**: `get_versions` `create_thumbnail`

## How It Works

```
User -> Claude Code -> MCP tools -> GitHub (repo + Pages)
                                         |
Platform (direct load) <-- GitHub Pages <-+
     |
     +-- Leaderboard (server + SQLite)
     +-- Narrative (bridge callback)
```

1. **init_game** — forks a template repo to the `ForkArcade` org, clones locally, copies SDK
2. Claude implements the game in JS files (data.js, game.js, render.js, main.js)
3. **create_sprite** — creates pixel art sprites (matrix format: frames + origin)
4. **publish_game** — pushes to GitHub, enables Pages, creates version snapshot

## Templates

Templates are repositories in the `ForkArcade` org with the `forkarcade-template` topic. Discovered dynamically via GitHub API.

Each template has:
- `.forkarcade.json` — configuration (gameFiles, template key)
- `_assets.json` — asset metadata (palette, sprite categories)
- Skeleton game files with comments

Adding a new template = creating a repo on GitHub with the right topics. Zero changes to platform code.

## Engine

Each template contains its own set of engine modules (vanilla JS, zero build step). The template is self-contained — `init_game` simply clones the template repo.

API: `window.FA` — `FA.setState()`, `FA.getState()`, `FA.addLayer()`, `FA.draw.*`, `FA.input.*`, `FA.narrative.*`

## Narrative Layer

Narrative panel next to the game (tab "Narrative"):
- **Story graph** — visualization of narrative paths
- **Story variables** — progress bars, checkmarks
- **Event log** — last 20 events

Game reports via SDK:
```js
ForkArcade.updateNarrative({
  variables: { karma: 3, has_key: true },
  currentNode: 'dark-cellar',
  graph: { nodes: [...], edges: [...] },
  event: 'Entered dark cellar'
});
```

## Game Evolution

Games evolve through GitHub issues with the `evolve` label:
1. Player proposes `[EVOLVE]` issue via platform -> votes reach threshold -> `evolve` label added
2. Use `/evolve` skill to see ready issues and implement
3. Create `changelog/v{N}.md`, then `/publish` to push + snapshot
4. Platform displays version selector + changelog

## Structure

```
forkarcade-platform/
  client/           React + Vite (port 5173)
  server/           Express + SQLite (port 8787)
  mcp/src/          MCP server (Python)
    github_templates.py   Dynamic templates from GitHub API
    handlers/             workflow, assets, versions
  sdk/
    forkarcade-sdk.js     SDK (bridge / legacy postMessage)
    fa-narrative.js       Narrative module
    _platform.md          Platform golden rules
  .claude/skills/   new-game, evolve, publish
```
