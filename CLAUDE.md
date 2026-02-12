# ForkArcade Platform

Platforma do tworzenia i grania w gry webowe publikowane na GitHub Pages.

## Architektura

```
client/          React + Vite (port 5173)
server/          Express + SQLite (port 8787)
mcp/             MCP server (Python) — narzędzia dla Claude Code
prompts/         Prompt library per typ gry
.claude/skills/  Skile: new-game, publish
```

## Kluczowe decyzje

- **Katalog gier = GitHub API** — nie mamy tabeli games. Klient pobiera listę repozytoriów z org `ForkArcade` filtrując po topicu `forkarcade-game`. Nie dodawaj tabeli games.
- **Gry w iframe** — każda gra działa na GitHub Pages, osadzona w `<iframe>` na platformie. Komunikacja przez postMessage (SDK).
- **Serwer jest cienki** — auth (GitHub OAuth + JWT cookie) + scores (SQLite). Nic więcej. Nie dodawaj logiki gier ani narracji po stronie serwera.
- **Narracja jest client-side** — dane narracyjne (graf, zmienne, eventy) przechodzą postMessage z iframe do parenta. Nie są persystowane w bazie.
- **Template repos** — `ForkArcade/game-template-strategy-rpg` i `ForkArcade/game-template-roguelike` na GitHub. Oznaczone jako template repos. Mają wbudowany narrative engine.

## PostMessage protocol (SDK ↔ Platforma)

| Type | Kierunek | Opis |
|------|----------|------|
| `FA_READY` | gra → platforma | Gra gotowa |
| `FA_INIT` | platforma → gra | Przekazuje slug |
| `FA_SUBMIT_SCORE` | gra → platforma | Wysyła wynik (requestId) |
| `FA_SCORE_RESULT` | platforma → gra | Odpowiedź (requestId) |
| `FA_GET_PLAYER` | gra → platforma | Prosi o info gracza (requestId) |
| `FA_PLAYER_INFO` | platforma → gra | Odpowiedź (requestId) |
| `FA_NARRATIVE_UPDATE` | gra → platforma | Stan narracji (fire-and-forget) |

## Serwer — endpointy

- `GET /auth/github` → redirect do GitHub OAuth
- `GET /auth/github/callback` → wymiana code na token, upsert user, set cookie
- `POST /auth/logout` → clear cookie
- `POST /api/games/:slug/score` (auth) → zapis wyniku
- `GET /api/games/:slug/leaderboard` → top 50 per gra
- `GET /api/me` (auth) → aktualny user
- `GET /sdk/forkarcade-sdk.js` → statyczny plik SDK

## Baza danych (SQLite)

Dwie tabele: `users` (github_user_id, login, avatar) i `scores` (game_slug, score, created_at). Scores identyfikowane po `game_slug` (TEXT), nie po FK do games.

## Klient — routing

- `/` → HomePage — katalog gier z GitHub API
- `/play/:slug` → GamePage — iframe + taby (Leaderboard | Narrative)

## MCP (mcp/src/main.py)

11 narzędzi:
- **Workflow**: `list_templates`, `init_game`, `get_sdk_docs`, `get_game_prompt`, `validate_game`, `publish_game`
- **Assets**: `get_asset_guide`, `create_sprite`, `validate_assets`, `preview_assets`
- **Wersje**: `get_versions`

Publish ustawia topic `forkarcade-game`, włącza GitHub Pages i tworzy version snapshot (`/versions/v{N}/`). Asset tools tworzą pixel art sprite'y w formacie `_sprites.json` → generowany `sprites.js`.

## Wersjonowanie gier

Gry ewoluują przez GitHub issues. Każda wersja jest grywalna.

### Flow
1. User tworzy issue z labelem `evolve` → GitHub Actions odpala Claude Code
2. Claude Code implementuje → otwiera PR
3. PR merge → workflow tworzy snapshot w `/versions/v{N}/`
4. Platforma wyświetla version selector + changelog

### Struktura wersji w repo gry
```
/index.html          ← latest
/game.js
/versions/v1/        ← snapshot v1
/versions/v2/        ← snapshot v2
/.forkarcade.json    ← metadata z versions array
/.github/workflows/  ← evolve.yml + version.yml
```

### Scores
Scores mają kolumnę `version` — SDK automatycznie dołącza wersję. Leaderboard filtrowany per wersja (`?version=N`).

## Konwencje

- Inline styles (nie ma CSS framework)
- ESM (`import`/`export`), nie CommonJS
- Vanilla JS w SDK (bez frameworków — musi działać w dowolnej grze)
- Prompty i CLAUDE.md po polsku
