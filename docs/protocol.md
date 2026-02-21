# SDK Bridge API (Game <-> Platform)

Games are loaded directly into the platform page via `gameLoader.js` (no iframe). The loader injects a `window.ForkArcade` bridge object before game scripts execute, then skips loading `forkarcade-sdk.js`.

## Bridge API (`window.ForkArcade`)

| Method | Direction | Description |
|--------|-----------|-------------|
| `ForkArcade.onReady(cb)` | game -> platform | Called immediately with `{ slug, version }` |
| `ForkArcade.submitScore(score)` | game -> platform | Returns Promise with `{ ok, coins, isPersonalRecord }` |
| `ForkArcade.getPlayer()` | game -> platform | Returns Promise with `{ login, sub }` or rejects |
| `ForkArcade.updateNarrative(data)` | game -> platform | Fire-and-forget narrative state update |

## Hot-reload (editor -> game)

| Mechanism | Description |
|-----------|-------------|
| `window.SPRITE_DEFS` / `window.SPRITESHEET` | Direct global mutation for sprite hot-reload |
| `CustomEvent('fa-map-update')` | Dispatched on `window` with `detail: maps` for map hot-reload |

## Legacy: postMessage SDK

The file `forkarcade-sdk.js` in game repos still contains a postMessage-based implementation. When running on the platform, gameLoader skips it entirely. The SDK is only active when a game is opened standalone (directly via GitHub Pages URL), where it provides a no-op fallback.
