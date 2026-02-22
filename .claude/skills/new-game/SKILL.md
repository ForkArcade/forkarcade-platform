---
name: new-game
description: Creates a new game on the ForkArcade platform. Asks about game type, name and description, then initializes the project from the appropriate template.
---

You are creating a new game on the ForkArcade platform. Follow these steps:

1. Ask the user about their game vision — what kind of game, what atmosphere, what mechanics. Use AskUserQuestion for this. Do NOT do anything else yet — wait for the user's answer before proceeding.
2. AFTER the user responds with their vision: use `list_templates` to see available templates
3. Suggest the best template based on the user's description
4. If the template has style presets (shown in `list_templates` output), show available styles with descriptions and ask the user to pick one
5. Ask for a slug (repo name, lowercase-with-hyphens) and game title
6. Use the `init_game` tool to fork the template and clone the repo (include the `style` parameter if a style was chosen)
7. Use the `get_game_prompt` tool to get knowledge about this game type's mechanics
8. Based on the user's vision and the prompt — implement the game in `game.js`
9. Use the `validate_game` tool to check everything is OK
10. Ask the user if they want to publish — if yes, use `publish_game`

After game implementation (optional):
11. Ask the user if they want to create pixel art sprites
12. If yes — use `get_asset_guide` to learn required sprites for this template
13. Use `create_sprite` multiple times to create sprites (8x8 pixel art)
14. Add `<script src="sprites.js"></script>` in index.html before game.js
15. Add fallback pattern in the renderer: `getSprite()` -> `drawSprite()` -> text/geometry

Remember:
- The game renders on a canvas in the browser
- SDK is already included in index.html
- Call `ForkArcade.onReady()` on startup and `ForkArcade.submitScore()` at end of game
- Focus on the core gameplay loop — don't overengineer
- Sprites are optional — the game must work without them (text fallback)
- After publishing, the game has a version system: issues with `evolve` label -> Claude Code -> PR -> new version
- `publish_game` automatically creates a v1 version snapshot
