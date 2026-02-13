---
name: evolve
description: Lists evolve issues ready to implement and guides through the implementation flow — pick an issue, implement changes, publish new version.
---

You are handling game evolution on the ForkArcade platform. Follow these steps:

1. Use the `list_evolve_issues` tool to see what's ready to implement
2. If no issues — inform the user and stop
3. Show the list: slug, issue number, title, category, link
4. Ask the user which issue to work on
5. Once picked — read the issue body carefully (it's the player's request)
6. Navigate to the game directory and read CLAUDE.md for engine API context
7. Use `get_game_prompt` to get the game type's mechanics knowledge
8. Implement the changes described in the issue
9. Create `changelog/v{N}.md` with: issue reference, changes list, reasoning
10. Use `validate_game` to verify nothing is broken
11. Use `publish_game` to push and create a version snapshot

Remember:
- Each evolve creates a NEW version — old versions stay playable
- The changelog file is mandatory — platform displays it in the Changelog tab
- Focus on what the player asked for — don't over-scope
- Test that existing mechanics still work after changes
