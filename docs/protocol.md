# PostMessage Protocol (SDK <-> Platform)

| Type | Direction | Description |
|------|-----------|-------------|
| `FA_READY` | game -> platform | Game ready |
| `FA_INIT` | platform -> game | Passes `{ slug, version }` |
| `FA_SUBMIT_SCORE` | game -> platform | Submits score (requestId) |
| `FA_SCORE_RESULT` | platform -> game | Response (requestId) |
| `FA_GET_PLAYER` | game -> platform | Requests player info (requestId) |
| `FA_PLAYER_INFO` | platform -> game | Response (requestId) |
| `FA_NARRATIVE_UPDATE` | game -> platform | Narrative state (fire-and-forget) |
| `FA_COIN_EARNED` | platform -> game | Coins earned after score submit (fire-and-forget) |
| `FA_SPRITES_UPDATE` | platform -> game | Hot-reload sprite definitions (fire-and-forget) |
| `FA_MAP_UPDATE` | platform -> game | Hot-reload map definitions (fire-and-forget) |
