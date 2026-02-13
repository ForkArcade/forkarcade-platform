# ForkArcade Platform

A platform for creating and playing web games with Claude Code. Games published on GitHub Pages, embedded in iframes.

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

## How It Works

```
User -> Claude Code -> MCP tools -> GitHub (repo + Pages)
                                         |
Platform (iframe) <----- GitHub Pages <--+
     |
     +-- Leaderboard (server + SQLite)
     +-- Narrative panel (postMessage)
```

1. **init_game** — forks a template repo to the `ForkArcade` org, clones locally, copies SDK
2. Claude implements the game in JS files (data.js, game.js, render.js, main.js)
3. **create_sprite** — creates pixel art 8x8 sprites
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

## MCP Tools

| Tool | Description |
|------|-------------|
| `list_templates` | List templates from GitHub |
| `init_game` | Fork template -> new repo |
| `get_game_prompt` | Game type mechanics knowledge |
| `get_sdk_docs` | SDK documentation |
| `validate_game` | Validate before publishing |
| `publish_game` | Push + Pages + version snapshot |
| `update_sdk` | Update SDK in the game |
| `get_asset_guide` | Sprite guide |
| `create_sprite` | Create pixel art 8x8 |
| `validate_assets` | Check sprite completeness |
| `preview_assets` | Preview sprites in HTML |
| `get_versions` | Game version history |

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
1. User creates issue -> GitHub Actions triggers Claude Code
2. Claude implements -> PR
3. Merge -> version snapshot in `/versions/v{N}/`
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
    forkarcade-sdk.js     SDK (postMessage)
  .claude/skills/   new-game
```
