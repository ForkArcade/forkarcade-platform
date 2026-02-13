# Evolve — Game Evolution Through Players and AI

## Vision

Games on ForkArcade don't have a single author. Games **evolve** — players decide what changes, AI implements it. Each game is a living organism driven by community feedback and AI autonomy.

GitHub issues are the DNA of change. ForkCoin is the selection mechanism. Claude Code is the mutation engine.

## Actors

### Player
- Plays games -> earns ForkCoin
- Writes issues (change proposals) on the game's GitHub repo
- Votes with coins on others' issues
- Tests new versions after merge

### AI (Claude Code)
- Receives the highest-voted issue
- Analyzes game code, engine, prompt
- Implements changes -> opens PR
- PR merge -> new game version (snapshot in `/versions/vN/`)

### Platform
- Aggregates votes, manages evolve queue
- Triggers GitHub Actions workflow
- Archives versions, displays changelog
- Enforces fairness (limits, cooldowns)

## Flow

```
1. Player writes a GitHub issue
   "Add a crafting system from gathered resources"
   |
2. Issue appears on the platform (GamePage -> Issues tab)
   Other players see the proposal
   |
3. Players vote with coins
   10 coins = 1 vote, no limit per issue
   Coins are burned — they don't come back
   |
4. Evolve trigger
   Every X hours (or after reaching a vote threshold)
   platform picks the issue with the most votes
   |
5. GitHub Actions workflow
   Label `evolve` + comment with vote context
   Claude Code gets issue + codebase + game prompt
   |
6. AI implements -> PR
   PR contains: code changes, description, test notes
   |
7. Auto-merge (or review by creator)
   Version workflow creates snapshot /versions/vN/
   |
8. New version live on the platform
   Players see changelog, can play the new version
   New cycle begins
```

## GitHub Issues — Conventions

### Who can write issues
- Anyone with a GitHub account (public repo = public issues)
- Platform can offer a form that creates issues via GitHub API (simplified UX)

### Issue categories (labels)

| Label | Description | Example |
|-------|-------------|---------|
| `feature` | New mechanic or content | "Add a crafting system" |
| `balance` | Balance / difficulty change | "Too many enemies on lvl 3" |
| `visual` | Graphics, animations, UI | "Better explosions" |
| `audio` | Sound, music | "Add a shooting sound effect" |
| `bug` | Something doesn't work | "Player walks through walls" |
| `narrative` | Story, dialogue, branching | "Add an alternative ending" |

### Issue format (template)

```markdown
## What I want to change
[Description — what the player should see/feel]

## Why
[Motivation — what's wrong now or what's missing]

## How it could look (optional)
[Implementation details, if the player has an idea]
```

Platform can prepopulate the template when creating an issue from the UI.

## Voting Mechanism

### Rules
- **1 vote = 10 ForkCoin** (configurable per game)
- Player can cast multiple votes on one issue (stake more coins = stronger voice)
- Coins are **burned** on voting — they don't come back. This gives them value.
- Can only vote on open issues with the appropriate label
- Cannot vote on own issues (anti-spam)

### Display
- GamePage -> new tab (icon: `Vote` / `Megaphone`) next to Leaderboard/Narrative/Changelog
- Open issues sorted by vote count
- For each issue: title, category, vote count, "Vote" button
- After voting: coin animation, balance update

### Anti-gaming
- Minimum 1 session in the game before you can vote (must play to have an opinion)
- Rate limit: max X votes per game per day
- Game creator can close issues if spam/trolling

## Evolve Trigger — When AI Starts Working

### Option A: Vote threshold
- Issue collects N votes -> automatic trigger
- Threshold increases with each game version (v1: 10 votes, v2: 15, v3: 20...)
- Prevents too-frequent changes in the early phase

### Option B: Time cycle
- Every 48h/72h the platform checks the highest-voted issue
- If there's an issue with > 0 votes -> trigger
- Predictable evolution rhythm

### Option C: Hybrid (recommended)
- Cycle every 48h, BUT issue with > N votes triggers immediately
- Urgent fixes (bugs) can have a lower threshold
- Game creator can manually trigger evolve

## Game Creator's Role

The creator (whoever ran `init_game` + `publish_game`) has special privileges:

- **Veto** — can close issues that don't fit the game's vision
- **Priority** — can mark issues as `priority` (AI takes them first, regardless of votes)
- **Manual trigger** — can fire evolve without waiting for votes
- **Review PR** — can require review before merge (instead of auto-merge)
- **Freeze** — can freeze the game (no evolve) for a set period

Creator CANNOT:
- Vote with coins on their own game's issues
- Mint coins outside of normal play

## AI Context — What Claude Code Receives

During evolve workflow, AI receives:

```
1. GitHub issue (title, body, labels, comments)
2. Vote context (how many votes, who voted — anonymously)
3. Full game code (repo)
4. _prompt.md from the template (mechanics, scoring, rendering)
5. CLAUDE.md from the template (engine API)
6. _platform.md (platform golden rules)
7. Previous version history (changelog)
8. Current narrative state (if relevant)
```

AI does NOT receive:
- Access to the platform database
- Ability to change SDK or engine (only game files)
- Access to other games

## Versions and Compatibility

Each evolve creates a new version:

```
/index.html          <- latest (after merge)
/versions/v1/        <- snapshot v1
/versions/v2/        <- snapshot v2 (after evolve)
/.forkarcade.json    <- versions array with descriptions
```

- Old versions always playable (snapshot is complete)
- Leaderboard per version (scores from v1 don't mix with v2)
- Player can return to any version via SegmentedControl
- Coins earned from any version (but rate may vary)

## Platform UI

### GamePage — new "Evolve" tab (icon: Zap / Rocket)

```
+-----------------------------+
| ^ 47  Add crafting system   |  <- highest voted
|       feature · #12         |
|       [Vote 10c]            |
+-----------------------------+
| ^ 23  Alternative ending    |
|       narrative · #15       |
|       [Vote 10c]            |
+-----------------------------+
| ^ 8   Better explosions     |
|       visual · #18          |
|       [Vote 10c]            |
+-----------------------------+
| ^ 3   Bug: walking through  |
|       walls                 |
|       bug · #20             |
|       [Vote 10c]            |
+-----------------------------+
  Evolve threshold: 50 votes
  Next cycle: in 18h
```

### HomePage — "Hot" badge on game cards

- Games with active voting (> N votes in last 48h) get a badge
- Encourages entering and voting

### Player Profile — vote history

- "You voted on 12 issues in 5 games"
- "3 of your proposals were implemented"
- Achievement: "Kingmaker" — your vote decided the evolve

## Implementation Phases

### Phase 1: Issues on the platform (read-only)
- New "Evolve" tab on GamePage
- Fetch issues from GitHub API (label filter)
- Display list — no voting yet
- Link to GitHub issue (opens in new window)

### Phase 2: Coin voting
- Integration with wallet (COIN.md)
- "Vote" button -> burn coins -> comment on GitHub issue with vote count
- Sort by votes
- Anti-gaming (rate limits, minimum 1 session)

### Phase 3: Automatic evolve trigger
- GitHub Actions workflow reads votes (from comments or platform API)
- Automatic trigger after reaching threshold
- Notification on platform: "New version incoming!"

### Phase 4: Issue form from the platform
- Player writes issue without leaving the platform
- Platform creates issue via GitHub API
- Template with categories (labels)
- Simplified UX for non-devs

### Phase 5: Advanced governance
- Creator: veto, priority, freeze
- Dynamic vote threshold
- Seasonality (resets, events)
- Achievement system for evolve participation
