# ForkCoin — ForkArcade Platform Currency

## Concept

ForkCoin is an internal platform currency that connects native scoring and narrative systems into a single cross-game economy. Players "mine" coins by playing games and discovering narratives. Coins are spent to influence game evolution.

## Coin Sources

### Score Mining

Each game generates coins proportional to scores earned.

- Player earns score -> server converts to coins at the game's rate
- **Rate depends on popularity**: fewer players = better rate -> incentive to discover niche games
- **Diminishing returns**: first scores in a game yield more coins, then decreasing -> incentive to play different games instead of grinding one
- **New personal record = bonus** -> reward for progress, not repetition

### Narrative Milestones

Narrative stops being "free" — it has real value.

- Game creator defines milestones in the narrative graph (reaching a node, unlocking a branch, changing a variable)
- Reaching a milestone = one-time coin bonus
- Narrative events (`FA_NARRATIVE_UPDATE`) already flow to the platform — just need server-side evaluation

### Discovery

- First session in a new game = "Explorer" bonus
- Playing all games of a given template = "Completionist" bonus
- Playing a newly published game (< 48h) = "Early Adopter" bonus

## What to Spend Coins On

### Evolve Voting (killer feature)

- Each game has GitHub issues -> change proposals
- Players vote with coins on the issue they want -> AI (Claude Code) implements the highest-voted one
- This closes the loop: **play -> earn -> vote -> game evolves -> play more**
- Vote cost: e.g. 10 coins per vote, no limit

### Boost

- Player pays coins to boost a game in the catalog (on the home page)
- Boost lasts X hours, visible as a badge on the card
- Game creator can boost their own game

### Profile

- Titles and ranks (based on lifetime coins earned)
- Position in global player ranking (not per game — cross-platform)

## Monetization

### Free-to-play

- Coins are earned exclusively through playing and narratives
- Zero pay-to-win: coins don't give in-game advantages
- Model is fair — grinding is real and enjoyable (because you play games)

### Premium (optional, for later)

- Buy coins with real money (shortcut, not the only path)
- Premium templates/games unlocked with coins (earned OR purchased)
- Subscription: X coins per month + priority in evolve queue

## Technical Architecture

### Database

One new table:

```sql
CREATE TABLE wallets (
  user_id INTEGER REFERENCES users(id),
  balance INTEGER DEFAULT 0,
  lifetime_earned INTEGER DEFAULT 0,
  PRIMARY KEY (user_id)
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  amount INTEGER NOT NULL,          -- + earn, - spend
  type TEXT NOT NULL,                -- 'score_mine', 'narrative', 'explorer', 'evolve_vote', 'boost'
  game_slug TEXT,
  metadata TEXT,                     -- JSON: {score, milestone, issue_number, ...}
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### New Server Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/wallet` | GET | Player balance and lifetime |
| `/api/wallet/transactions` | GET | Transaction history |
| `/api/games/:slug/vote` | POST | Vote with coins on an issue |
| `/api/games/:slug/boost` | POST | Boost game in catalog |

Minting (earning) happens server-side — on `POST /api/games/:slug/score` the server automatically calculates coins and adds them to the wallet. The client doesn't decide how many coins to award.

### PostMessage Protocol (SDK extension)

| Type | Direction | Description |
|------|-----------|-------------|
| `FA_COIN_EARNED` | platform -> game | How many coins the player just earned (fire-and-forget, optional — game can show a notification) |

The game does NOT mint coins — the server does. The game only sends score and narrative events as before. Zero SDK changes except optional `FA_COIN_EARNED` reception.

### Score -> Coin Rate

```
coins = floor(score * base_rate * popularity_multiplier * diminishing_factor)

base_rate          = 0.1 (configurable per template)
popularity_mult    = 1 / log2(active_players + 2)   — fewer players = more coins
diminishing_factor = 1 / (1 + user_plays_count / 10) — decreases with each session
```

## Value Loop

```
Player plays -> earns score/narrative
    |
Server mints coins
    |
Player votes with coins on evolve issue
    |
AI implements highest-voted issue
    |
Game evolves -> new version
    |
Player returns to play new version
    |
(repeat)
```

This is a flywheel: more players = more votes = faster game evolution = more players return.

## Implementation Phases

### Phase 1: Wallet + Score Mining
- `wallets` + `transactions` tables
- Mint on score submit
- Display balance in UI (toolbar)
- Profile page with history

### Phase 2: Evolve Voting
- Vote with coins on issues
- Integration with GitHub Actions (evolve workflow reads votes)
- UI: issue list with vote counts on GamePage

### Phase 3: Narrative Milestones + Discovery
- Server-side evaluation of narrative events
- Discovery bonuses
- Achievement system

### Phase 4: Boost + Monetization
- Game boost in catalog
- Optional coin purchase
- Global player rankings
