---
name: new-game
description: Creates a new game on the ForkArcade platform. Asks about game type, name and description, then initializes the project from the appropriate template.
---

You are creating a new game on the ForkArcade platform. Follow these steps:

1. Ask the user about their game vision — what kind of game, what atmosphere, what mechanics
2. Use the `list_templates` tool to see available templates
3. Suggest the best template based on the user's description
4. Ask for a slug (repo name, lowercase-with-hyphens) and game title
5. Use the `init_game` tool to fork the template and clone the repo
6. Use the `get_game_prompt` tool to get knowledge about this game type's mechanics
7. Based on the user's vision and the prompt — implement the game in `game.js`
8. Use the `validate_game` tool to check everything is OK
9. Ask the user if they want to publish — if yes, use `publish_game`

After game implementation (optional):
10. Ask the user if they want to create pixel art sprites
11. If yes — use `get_asset_guide` to learn required sprites for this template
12. Use `create_sprite` multiple times to create sprites (8x8 pixel art)
13. Add `<script src="sprites.js"></script>` in index.html before game.js
14. Add fallback pattern in the renderer: `getSprite()` -> `drawSprite()` -> text/geometry

Remember:
- The game renders on a canvas in the browser
- SDK is already included in index.html
- Call `ForkArcade.onReady()` on startup and `ForkArcade.submitScore()` at end of game
- Focus on the core gameplay loop — don't overengineer
- Sprites are optional — the game must work without them (text fallback)
- After publishing, the game has a version system: issues with `evolve` label -> Claude Code -> PR -> new version
- `publish_game` automatically creates a v1 version snapshot
