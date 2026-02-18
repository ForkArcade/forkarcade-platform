# Game Versioning

Games evolve through GitHub issues. Every version is playable.

## Flow (text-based — mechanics, balance, features)
1. Player proposes `[EVOLVE]` issue via platform -> votes reach threshold -> `evolve` label added
2. Use `/evolve` skill (or `list_evolve_issues` MCP tool) to see ready issues
3. Implement changes locally, create `changelog/v{N}.md`
4. Use `/publish` to push and create version snapshot
5. Platform displays version selector + changelog

## Flow (data-patch — sprites, visual changes)
1. Player edits sprites in RotEditorPage (`/edit/:slug`)
2. Player clicks "Propose sprites" -> creates `[EVOLVE]` issue with `data-patch` label + JSON data in body
3. Community votes (same mechanism, same threshold)
4. `/evolve` skill detects `data-patch` label -> calls `apply_data_patch` MCP tool
5. Tool writes `_sprites.json` + regenerates `sprites.js` deterministically — no LLM interpretation
6. Changelog + publish as usual

Issue body format: human-readable summary + ` ```json:data-patch ` code block with `{ "type": "sprites"|"maps", "data": {...} }`.

## Version Structure in Game Repo
```
/index.html          <- latest
/game.js
/versions/v1/        <- snapshot v1
/versions/v2/        <- snapshot v2
/changelog/v1.md     <- LLM reasoning log for v1
/changelog/v2.md     <- LLM reasoning log for v2
/.forkarcade.json    <- metadata with versions array
```

## Changelog Files
Each evolve creates `changelog/v{N}.md` — structured LLM log with: issue reference, changes list, reasoning/tradeoffs, files modified. Convention defined in `_platform.md`. Platform displays in Changelog tab.

## Scores
Scores have a `version` column — SDK automatically includes the version. Leaderboard filtered per version (`?version=N`).
