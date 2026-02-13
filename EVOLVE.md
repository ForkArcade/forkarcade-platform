# Evolve — Game Evolution Through Players and AI

Games on ForkArcade evolve. Players propose changes, vote with coins, AI implements the winner.

## Flow

```
1. Player proposes change (Evolve tab -> "Propose change")
   Platform creates GitHub issue with [EVOLVE] prefix
   |
2. Other players vote with ForkCoin (10c per vote, burned)
   Issues sorted by vote count in Evolve tab
   |
3. Issue reaches 3+ unique voters -> "ready" badge appears
   Any logged-in user can click "Evolve" to trigger
   |
4. Platform adds `evolve` label to GitHub issue
   GitHub Actions workflow triggers Claude Code
   |
5. Claude Code implements -> opens PR
   |
6. PR merge -> version workflow creates snapshot /versions/vN/
   |
7. New version live on platform
```

## Rules

- **`[EVOLVE]` prefix** — only issues with this prefix appear on the platform. Created automatically via the propose form.
- **Must play first** — user needs at least 1 score in the game before proposing changes (403 `must_play_first`)
- **Vote cost** — 10 coins per vote, must be multiple of 10. Coins are burned permanently.
- **Cannot vote on own issues** — anti-spam
- **Minimum 3 unique voters** — before evolve can be triggered
- **Manual trigger** — no automatic cycle. Someone clicks "Evolve" when ready.

## Issue Categories (labels)

| Label | Description |
|-------|-------------|
| `feature` | New mechanic or content |
| `balance` | Difficulty / balance change |
| `visual` | Graphics, animations, UI |
| `audio` | Sound, music |
| `bug` | Something doesn't work |
| `narrative` | Story, dialogue, branching |

Category is set as a GitHub label. The `evolve` label is added separately when triggered.

## Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/games/:slug/evolve-issues` | POST | yes | Create `[EVOLVE]` issue on GitHub |
| `/api/games/:slug/vote` | POST | yes | Vote on issue (burn coins) |
| `/api/games/:slug/votes` | GET | no | Aggregated vote totals per issue |
| `/api/games/:slug/evolve-trigger` | POST | yes | Add `evolve` label (triggers Actions) |

## Database

```sql
CREATE TABLE votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_user_id INTEGER NOT NULL,
  game_slug TEXT NOT NULL,
  issue_number INTEGER NOT NULL,
  coins_spent INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_votes_game_issue ON votes(game_slug, issue_number);
```

## UI — Evolve Tab (Zap icon)

- Issue list sorted by vote count (descending)
- Each row: vote count (gold) + title + category badge + `#N`
- "Vote 10c" button (disabled if: not logged in, own issue, balance < 10)
- "ready" badge when 3+ unique voters
- "Evolve" button next to ready badge
- "Propose change" form: title + body + category select

## AI Context

During evolve, Claude Code receives the GitHub issue + full game repo + template prompts. AI can only change game files — not SDK, not engine.
