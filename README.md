# ForkArcade Platform

Platforma do tworzenia i grania w gry webowe z Claude Code. Gry publikowane na GitHub Pages, osadzone w iframe.

> **TL;DR**: Powiedz Claude'owi "zrob mi gre roguelike o zombiakach" -- dostaniesz repo na GitHub z dzialajaca gra, sprite'ami i leaderboardem.

## Quick Start

### 1. Uruchom platforme

```bash
# Serwer
cd server && cp .env.example .env && npm install && npm run dev

# Klient (osobny terminal)
cd client && npm install && npm run dev
```

Uzupelnij `server/.env`:
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` -- z GitHub OAuth App
- `JWT_SECRET` -- `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 2. Podlacz MCP w Claude Code

```bash
claude mcp add forkarcade /PELNA/SCIEZKA/DO/forkarcade-platform/mcp/.venv/bin/python3 /PELNA/SCIEZKA/DO/forkarcade-platform/mcp/src/main.py
```

Jednorazowa konfiguracja -- Claude Code zapamięta.

### 3. Tworz gre

```
zrob mi gre roguelike o eksploracji opuszczonego zamku
```

Claude sam wybierze szablon, sforkuje repo, zaimplementuje gre, stworzy sprite'y i opublikuje.

### 4. Graj

http://localhost:5173 -- gra pojawi sie w katalogu.

## Jak to dziala

```
Uzytkownik -> Claude Code -> MCP tools -> GitHub (repo + Pages)
                                              |
Platforma (iframe) <----- GitHub Pages <------+
     |
     +-- Leaderboard (serwer + SQLite)
     +-- Panel narracji (postMessage)
```

1. **init_game** -- forkuje template repo do org `ForkArcade`, klonuje lokalnie, kopiuje SDK
2. Claude implementuje gre w plikach JS (data.js, game.js, render.js, main.js)
3. **create_sprite** -- tworzy pixel art 8x8 sprite'y
4. **publish_game** -- pushuje na GitHub, wlacza Pages, tworzy version snapshot

## Szablony

Szablony to repozytoria w org `ForkArcade` z topicem `forkarcade-template`. Odkrywane dynamicznie z GitHub API.

Kazdy szablon ma:
- `.forkarcade.json` -- konfiguracja (gameFiles, template key)
- `_assets.json` -- metadane assetow (paleta, kategorie sprite'ow)
- Skeleton plikow gry z komentarzami

Dodanie nowego szablonu = stworzenie repo na GitHub z odpowiednimi topicami. Zero zmian w kodzie platformy.

## Engine

Kazdy szablon zawiera swoj zestaw modulow engine (vanilla JS, zero build stepa). Szablon jest samowystarczalny — `init_game` po prostu klonuje template repo.

API: `window.FA` -- `FA.setState()`, `FA.getState()`, `FA.addLayer()`, `FA.draw.*`, `FA.input.*`, `FA.narrative.*`

## MCP Tools

| Narzedzie | Opis |
|-----------|------|
| `list_templates` | Lista szablonow z GitHub |
| `init_game` | Fork template -> nowe repo |
| `get_game_prompt` | Wiedza o mechanikach typu gry |
| `get_sdk_docs` | Dokumentacja SDK |
| `validate_game` | Walidacja przed publikacja |
| `publish_game` | Push + Pages + version snapshot |
| `update_sdk` | Aktualizacja SDK w grze |
| `get_asset_guide` | Przewodnik po sprite'ach |
| `create_sprite` | Tworzenie pixel art 8x8 |
| `validate_assets` | Sprawdzenie kompletnosci sprite'ow |
| `preview_assets` | Podglad sprite'ow w HTML |
| `get_versions` | Historia wersji gry |

## Warstwa narracji

Panel narracyjny obok gry (tab "Narrative"):
- **Graf scenariusza** -- wizualizacja sciezek fabularnych
- **Zmienne fabularne** -- paski postepu, checkmarki
- **Log zdarzen** -- ostatnie 20 eventow

Gra raportuje przez SDK:
```js
ForkArcade.updateNarrative({
  variables: { karma: 3, has_key: true },
  currentNode: 'dark-cellar',
  graph: { nodes: [...], edges: [...] },
  event: 'Entered dark cellar'
});
```

## Ewolucja gier

Gry ewoluuja przez GitHub issues z labelem `evolve`:
1. User tworzy issue -> GitHub Actions odpala Claude Code
2. Claude implementuje -> PR
3. Merge -> version snapshot w `/versions/v{N}/`
4. Platforma wyswietla version selector + changelog

## Struktura

```
forkarcade-platform/
  client/           React + Vite (port 5173)
  server/           Express + SQLite (port 8787)
  mcp/src/          MCP server (Python)
    github_templates.py   Dynamiczne szablony z GitHub API
    handlers/             workflow, assets, versions
  sdk/
    forkarcade-sdk.js     SDK (postMessage)
  prompts/          Prompt library per typ gry
  .claude/skills/   new-game
```
