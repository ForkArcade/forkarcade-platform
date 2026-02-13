# ForkArcade Platform

Platforma do tworzenia i grania w gry webowe publikowane na GitHub Pages.

> **TL;DR**: Gry = repozytoria w org `ForkArcade` na GitHub Pages w iframe. Szablony = dynamicznie z GitHub API (topic `forkarcade-template`), samowystarczalne (engine w środku). Platforma dostarcza SDK (scoring) + narrację. Serwer = auth + scores. Bez build stepa.

## Architektura

```
client/          React + Vite (port 5173)
server/          Express + SQLite (port 8787)
mcp/             MCP server (Python) — narzędzia dla Claude Code
sdk/
  forkarcade-sdk.js   SDK (postMessage, scoring, auth)
  fa-narrative.js     Moduł narracji (graf, zmienne, transition)
  _platform.md        Złote zasady platformy (prepended do każdego game promptu)
.claude/skills/  Skile: new-game
```

## Kluczowe decyzje

- **Katalog gier = GitHub API** — nie mamy tabeli games. Klient pobiera listę repozytoriów z org `ForkArcade` filtrując po topicu `forkarcade-game`. Nie dodawaj tabeli games.
- **Katalog szablonów = GitHub API** — szablony to repos z topicem `forkarcade-template`. MCP tools (`github_templates.py`) pobierają je dynamicznie. Metadane assetów w `_assets.json` w template repo. Nie ma hardcoded listy szablonów.
- **Gry w iframe** — każda gra działa na GitHub Pages, osadzona w `<iframe>` na platformie. Komunikacja przez postMessage (SDK).
- **Serwer jest cienki** — auth (GitHub OAuth + JWT cookie) + scores (SQLite). Nic więcej. Nie dodawaj logiki gier ani narracji po stronie serwera.
- **Narracja jest client-side** — dane narracyjne (graf, zmienne, eventy) przechodzą postMessage z iframe do parenta. Nie są persystowane w bazie.
- **Brak build stepa** — gry to vanilla JS, `<script>` tags, GitHub Pages (`build_type=legacy`). Żadnego bundlera.

## Platforma dostarcza

- **SDK** (`forkarcade-sdk.js`) — scoring, auth, postMessage. `init_game` kopiuje, `update_sdk` aktualizuje.
- **Narracja** (`fa-narrative.js`) — graf, zmienne, transition(). Misja platformy: dev skupia się na grze, narracja jest za darmo. `init_game` kopiuje z platformy.

## Engine (w szablonach)

Moduły engine leżą w template repos (każdy szablon jest samowystarczalny). `init_game` klonuje template — engine jest już w środku.

- Pattern: vanilla JS, IIFE, global namespace `window.FA`
- **dt jest w milisekundach** (~16.67ms per tick). Timery muszą używać ms (np. `life: 4000` = 4 sekundy)

## Struktura gry

Cała struktura gry jest zdefiniowana w szablonie — `.forkarcade.json` w template repo:

```json
{
  "template": "strategy-rpg",
  "engineFiles": ["fa-engine.js", "fa-renderer.js", "fa-input.js", "fa-audio.js"],
  "gameFiles": ["data.js", "map.js", "battle.js", "render.js", "main.js"]
}
```

- `engineFiles` — które moduły engine są w szablonie
- `gameFiles` — pliki gry (skeleton w template repo, implementacja przez Claude)
- `init_game` klonuje template (engine + game files już w środku) i kopiuje SDK

## Szablony (dynamiczne)

Szablony odkrywane z GitHub API po topicu `forkarcade-template`. Każdy template repo ma:
- Topic `forkarcade-template` + topic kategorii (np. `strategy-rpg`, `roguelike`)
- `.forkarcade.json` — `template` (klucz), `engineFiles`, `gameFiles`
- `_assets.json` — metadane assetów (styl, paleta, kategorie sprite'ów)
- `_prompt.md` — game design prompt dla Claude (mechaniki, scoring, eventy, rendering)
- `CLAUDE.md` — dokumentacja engine API dla Claude
- Skeleton plików gry z komentarzami

Dodanie nowego szablonu = stworzenie repo na GitHub z odpowiednimi topicami i plikami. Zero zmian w kodzie platformy.

## PostMessage protocol (SDK <-> Platforma)

| Type | Kierunek | Opis |
|------|----------|------|
| `FA_READY` | gra -> platforma | Gra gotowa |
| `FA_INIT` | platforma -> gra | Przekazuje slug |
| `FA_SUBMIT_SCORE` | gra -> platforma | Wysyła wynik (requestId) |
| `FA_SCORE_RESULT` | platforma -> gra | Odpowiedź (requestId) |
| `FA_GET_PLAYER` | gra -> platforma | Prosi o info gracza (requestId) |
| `FA_PLAYER_INFO` | platforma -> gra | Odpowiedź (requestId) |
| `FA_NARRATIVE_UPDATE` | gra -> platforma | Stan narracji (fire-and-forget) |

## Serwer -- endpointy

- `GET /auth/github` -> redirect do GitHub OAuth
- `GET /auth/github/callback` -> wymiana code na token, upsert user, set cookie
- `POST /auth/logout` -> clear cookie
- `POST /api/games/:slug/score` (auth) -> zapis wyniku
- `GET /api/games/:slug/leaderboard` -> top 50 per gra
- `GET /api/me` (auth) -> aktualny user

## Baza danych (SQLite)

Dwie tabele: `users` (github_user_id, login, avatar) i `scores` (game_slug, score, version, created_at). Scores identyfikowane po `game_slug` (TEXT), nie po FK do games.

## Klient -- routing

- `/` -> HomePage -- katalog gier z GitHub API (topic `forkarcade-game`)
- `/templates` -> TemplatesPage -- lista szablonow z GitHub API (topic `forkarcade-template`)
- `/play/:slug` -> GamePage -- iframe + taby (Leaderboard | Narrative)

## MCP (mcp/src/main.py)

12 narzedzi, szablony pobierane dynamicznie z GitHub API (`github_templates.py`):

- **Workflow**: `list_templates`, `init_game`, `get_sdk_docs`, `get_game_prompt`, `validate_game`, `publish_game`, `update_sdk`
- **Assets**: `get_asset_guide`, `create_sprite`, `validate_assets`, `preview_assets`
- **Wersje**: `get_versions`

Publish ustawia topic `forkarcade-game` + topic kategorii, wlacza GitHub Pages i tworzy version snapshot (`/versions/v{N}/`). Asset tools tworza pixel art sprite'y w formacie `_sprites.json` -> generowany `sprites.js`.

## Wersjonowanie gier

Gry ewoluuja przez GitHub issues. Kazda wersja jest grywalna.

### Flow
1. User tworzy issue z labelem `evolve` -> GitHub Actions odpala Claude Code
2. Claude Code implementuje -> otwiera PR
3. PR merge -> workflow tworzy snapshot w `/versions/v{N}/`
4. Platforma wyswietla version selector + changelog

### Struktura wersji w repo gry
```
/index.html          <- latest
/game.js
/versions/v1/        <- snapshot v1
/versions/v2/        <- snapshot v2
/.forkarcade.json    <- metadata z versions array
/.github/workflows/  <- evolve.yml + version.yml
```

### Scores
Scores maja kolumne `version` -- SDK automatycznie dolacza wersje. Leaderboard filtrowany per wersja (`?version=N`).

## ZASADA ZERO NADGORLIWOŚCI

- **NIGDY nie twórz bonusowych plików** — żadnych CLI wrapperów, helper scriptów, dodatkowych narzędzi "na wszelki wypadek"
- **NIGDY nie dodawaj ficzerów których nikt nie prosił** — każdy niepotrzebny plik to dług techniczny
- **Rób DOKŁADNIE to o co proszono** — nic więcej, nic mniej
- **Nie proponuj "bonusów"** — jak user chce dodatkowy tool, sam poprosi

## Konwencje

- Inline styles (nie ma CSS framework)
- ESM (`import`/`export`) w kliencie i serwerze, nie CommonJS
- Vanilla JS w SDK i engine (bez frameworkow -- musi dzialac w dowolnej grze)
- IIFE pattern w grach, global namespace `window.FA`
- **SDK jest lokalny** -- `forkarcade-sdk.js` kopiowany do repo gry przez `init_game`, aktualizowany przez `update_sdk`. Source of truth: `sdk/forkarcade-sdk.js`
- **Engine jest w szablonie** -- pliki engine przychodzą z template repo. Każdy szablon jest samowystarczalny.
- **Narracja jest w platformie** -- `fa-narrative.js` kopiowany z `sdk/` przez `init_game`. Misja platformy.
- Prompty i CLAUDE.md po polsku
