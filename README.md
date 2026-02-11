# ForkArcade Platform

## Tworzenie gier z Claude Code

### 1. Uruchom platformę

```bash
cd server && cp .env.example .env && npm install && npm run dev
cd client && npm install && npm run dev
```

Uzupełnij `server/.env` — wpisz GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET i wygeneruj JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Podłącz MCP w Claude Code

Otwórz **nowy terminal** (osobna sesja Claude Code do tworzenia gier) i wykonaj:

```bash
claude mcp add forkarcade node /PEŁNA/ŚCIEŻKA/DO/forkarcade-platform/mcp/src/index.js
```

Na przykład:
```bash
claude mcp add forkarcade node /home/dadmor/code/fork-arcade/forkarcade-platform/mcp/src/index.js
```

To jednorazowa konfiguracja — Claude Code zapamięta ten MCP server.

### 3. Twórz grę

Dostępne typy gier (template'y):
- **Strategy RPG** — turowa strategia, grid-based combat, jednostki z progresją
- **Roguelike** — proceduralne dungeony, permadeath, tile-based exploration

Uruchom Claude Code w dowolnym katalogu i powiedz:

```
zrób mi grę roguelike o eksploracji opuszczonego zamku
```

Claude sam wybierze odpowiedni template, sforkuje go do org ForkArcade i zaimplementuje grę.

Claude ma dostęp do narzędzi ForkArcade:
- **list_templates** — pokaże dostępne typy gier
- **init_game** — stworzy repo z template'u w org ForkArcade
- **get_game_prompt** — pobierze wiedzę o mechanikach danego typu gry
- **get_sdk_docs** — dokumentacja SDK
- **validate_game** — sprawdzi czy gra jest poprawna
- **publish_game** — opublikuje grę (GitHub Pages + rejestracja w platformie)

### 4. Graj

Otwórz http://localhost:5173 — gra pojawi się w katalogu.
