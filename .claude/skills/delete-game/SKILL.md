---
name: delete-game
description: Deletes a game from the ForkArcade platform — removes GitHub repo, scores, votes, and local files.
---

You are deleting a game from the ForkArcade platform. Follow these steps:

1. Ask the user which game to delete (slug / repo name)
2. Confirm with the user: "This will permanently delete the GitHub repo ForkArcade/{slug}, all scores, all votes, and the local game directory. Are you sure?"
3. Only proceed after explicit confirmation
4. Execute these 3 steps in order:

### Step 1: Delete GitHub repo
```bash
gh repo delete ForkArcade/{slug} --yes
```

### Step 2: Clean database (scores + votes)
Read ADMIN_SECRET from server/.env, then call the server cleanup endpoint:
```bash
curl -s -X DELETE http://localhost:8787/api/games/{slug}/data \
  -H "X-Admin-Secret: {ADMIN_SECRET from server/.env}"
```
The response will show `deleted_scores` and `deleted_votes` counts.
If the server is not running, warn the user and suggest starting it first (`cd server && npm start`).

### Step 3: Delete local game directory
```bash
rm -rf ../games/{slug}
```

5. Show summary to user: repo deleted, N scores + M votes cleaned, local dir removed.

Remember:
- This is irreversible — the GitHub repo and all data will be permanently deleted
- Always confirm before proceeding
- ADMIN_SECRET is in server/.env — read it with grep, never hardcode it
- Server must be running on port 8787 for DB cleanup to work
