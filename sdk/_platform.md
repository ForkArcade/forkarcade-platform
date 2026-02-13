# ForkArcade — Platform Rules

These rules apply to EVERY game on the ForkArcade platform, regardless of template.

## 3 Screens (mandatory)

Every game MUST have at least 3 screens (`screen` state):

1. **Start screen** (`screen: 'start'`) — game title, short description, controls, prompt to begin (e.g. `[SPACE]`)
2. **Game screen** (`screen: 'playing'`) — actual gameplay
3. **End screen** (`screen: 'victory'` / `screen: 'defeat'` / `screen: 'death'`) — narrative text, stats, score, prompt to restart (e.g. `[R]`)

## Narrative (mandatory)

Narrative is the platform's mission — dev focuses on the game, narrative comes for free. But the player MUST see it in the game.

- Register narrative texts: `FA.register('narrativeText', nodeId, { text, color })`
- Display them in the game (e.g. bar at the top of the screen with fade out)
- Call `showNarrative(nodeId)` at key moments
- End screen shows appropriate narrative text

`showNarrative` pattern:
```js
function showNarrative(nodeId) {
  var textDef = FA.lookup('narrativeText', nodeId);
  if (textDef) {
    // life is in milliseconds! dt in the engine is in ms (~16.67ms per tick)
    FA.setState('narrativeMessage', { text: textDef.text, color: textDef.color, life: 4000 });
  }
  FA.narrative.transition(nodeId);
}
```
In the game loop count down: `if (state.narrativeMessage && state.narrativeMessage.life > 0) state.narrativeMessage.life -= dt;`
In the renderer display the bar with `alpha = Math.min(1, state.narrativeMessage.life / 1000)` for smooth fade out.

## Timing

**dt is in milliseconds** (~16.67ms per tick). Timers must use ms:
- `life: 4000` = 4 seconds
- `life: 2000` = 2 seconds
- NOT `life: 3` (that's 3ms = invisible)

## SDK

- `ForkArcade.onReady(callback)` — call on startup
- `ForkArcade.submitScore(score)` — call at end of game
- `ForkArcade.updateNarrative(data)` — report narrative state to the platform

## Sprite Fallback

`FA.draw.sprite(category, name, x, y, size, fallbackChar, fallbackColor)` — if sprite is missing, draws text. Game MUST work without sprites.

## Platform Files (do not edit)

- `forkarcade-sdk.js` — SDK (scoring, auth)
- `fa-narrative.js` — narrative module (graph, variables, transition)
- `sprites.js` — generated from `_sprites.json`
