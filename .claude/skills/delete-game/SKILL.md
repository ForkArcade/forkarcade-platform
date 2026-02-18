---
name: delete-game
description: Deletes a game from the ForkArcade platform — removes GitHub repo, scores, votes, and local files.
---

You are deleting a game from the ForkArcade platform. Follow these steps:

1. Ask the user which game to delete (slug / repo name)
2. Confirm with the user: "This will permanently delete the GitHub repo ForkArcade/{slug}, all scores, all votes, and the local game directory. Are you sure?"
3. Only proceed after explicit confirmation
4. Use the `delete_game` MCP tool with the slug
5. Show the results to the user

Remember:
- This is irreversible — the GitHub repo and all data will be permanently deleted
- Always confirm before proceeding
- The tool requires ADMIN_SECRET env var to be configured for database cleanup
