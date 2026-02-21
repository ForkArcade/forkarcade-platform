# ForkCoin — Platform Currency

Internal currency connecting gameplay to game evolution. Players earn coins by playing, spend them by voting on changes.

## Earning

Coins are minted server-side on every score submit:

```
coins = floor(score * 0.1)
if personal record: coins = floor(coins * 1.5)
```

- Server calculates coins automatically — game only submits score as before
- Coins added to balance automatically after score submit
- Balance displayed in toolbar (`{balance}c`, gold, monospace)

## Spending

Coins are spent on **evolve voting** (see EVOLVE.md):

- 1 vote = 10 coins, burned permanently
- Multiple votes per issue allowed (stake more = stronger voice)
- Cannot vote on own issues

## Database

```sql
CREATE TABLE wallets (
  github_user_id INTEGER PRIMARY KEY,
  balance INTEGER DEFAULT 0
);
```

No transaction log — balance only. Minting = `ON CONFLICT DO UPDATE SET balance = balance + ?`. Voting = `UPDATE ... SET balance = balance - ? WHERE balance >= ?` (atomic).

## Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/wallet` | GET | yes | Current balance |

Minting happens inside `POST /api/games/:slug/score` — no separate endpoint.

## Value Loop

```
play -> earn score -> mint coins -> vote on evolve issue -> AI implements -> new version -> play more
```
