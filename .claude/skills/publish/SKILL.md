---
name: publish
description: Validates and publishes a game on the ForkArcade platform — push to GitHub, GitHub Pages, registration in the game catalog.
disable-model-invocation: true
---

You are publishing a game on the ForkArcade platform. Follow these steps:

1. Use the `validate_game` tool with the path to the current game directory
2. If there are issues — fix them and validate again
3. Show the user a summary: slug, title, description
4. Ask for publication confirmation
5. Use the `publish_game` tool with the appropriate parameters
6. Show the result: link to repo, link to game on platform
