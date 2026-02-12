# Roguelike — Game Design Prompt

Tworzysz grę typu Roguelike na platformę ForkArcade. Gra używa multi-file architektury z silnikiem FA.

## Architektura plików

```
forkarcade-sdk.js   — SDK platformy (nie modyfikuj)
sprites.js          — generowany z _sprites.json (nie modyfikuj ręcznie)
fa-engine.js        — ENGINE: game loop, event bus, state, registry (nie modyfikuj)
fa-renderer.js      — ENGINE: canvas, layers, draw helpers (nie modyfikuj)
fa-input.js         — ENGINE: keyboard/mouse, keybindings (nie modyfikuj)
fa-audio.js         — ENGINE: Web Audio, dźwięki (nie modyfikuj)
fa-narrative.js     — ENGINE: narrative engine (nie modyfikuj)
data.js             — DANE GRY: definicje wrogów, spelli, itemów, floor'ów
game.js             — LOGIKA GRY: dungeon gen, FOV, combat, turny, AI
render.js           — RENDERING: mapa, entity, UI, overlay
main.js             — ENTRY POINT: keybindings, wiring, ForkArcade.onReady
```

**Modyfikujesz tylko: `data.js`, `game.js`, `render.js`, `main.js`.**

## Kluczowe mechaniki

### Dungeon generation
- Proceduralna generacja (BSP / cellular automata / drunkard walk)
- Tile-based: wall, floor, stairs
- Każdy nowy floor = trudniejszy

### Ruch i eksploracja
- Turowy: gracz rusza się → wrogowie reagują → render
- FOV: raycasting, radius 5-7 tile'i
- Odkryte ale niewidoczne = przyciemnione

### Combat
- Bump-to-attack
- Formuła: `damage = atk - def + FA.rand(-1, 2)`
- Wrogowie definiowani przez behavior w registry

### Permadeath
- Śmierć = koniec runu → `ForkArcade.submitScore()`

## Scoring
```
score = (floor * 100) + (kills * 10) + gold + (items * 25) + (boss ? 500 : 0)
```

## Jak dodawać zawartość (data.js)

### Nowy wróg
```js
FA.register('enemies', 'shadow_drake', {
  name: 'Shadow Drake', char: 'D', color: '#808',
  hp: 35, atk: 7, def: 2, xp: 25,
  behavior: 'ranged',
  lore: 'Smok cieni polujący w ciemnościach'
});
```

### Nowy spell
```js
FA.register('spells', 'Chain Lightning', {
  name: 'Chain Lightning', cost: 5, type: 'chain', range: 6,
  sound: 'spell', effectColor: '#48f',
  effect: function(caster, targets, state) {
    var dmg = 6;
    targets.forEach(function(e) { e.hp -= dmg; });
    return { msg: 'Chain Lightning!', color: '#48f' };
  }
});
```

### Nowy item
```js
FA.register('items', 'fire_ring', {
  name: 'Ring of Fire', char: 'o', color: '#f84',
  type: 'accessory', atk: 3,
  description: 'Pierścień płomieni — +3 ATK'
});
```

### Nowy floor
```js
FA.register('floors', 3, {
  name: 'Zbrojownia',
  enemies: [['phantom', 1], ['mage', 2], ['armor', 2]],
  ambientMessages: ['Metal szczęka...', 'Zbroja się obraca...'],
  encounters: ['ghost-knight']
});
```

### Nowe zachowanie wroga (behavior)
```js
FA.register('behaviors', 'ranged', {
  act: function(enemy, state) {
    var p = state.player;
    var dist = Math.abs(p.x - enemy.x) + Math.abs(p.y - enemy.y);
    if (dist <= 1) return { type: 'flee', target: p };
    if (dist <= 3) return { type: 'ranged_attack', target: p };
    return { type: 'chase', target: p };
  }
});
```

## Event bus — kluczowe eventy

| Event | Payload | Kiedy |
|-------|---------|-------|
| `input:action` | `{ action, key }` | Gracz nacisnął klawisz |
| `entity:damaged` | `{ entity, damage, attacker }` | Ktoś otrzymał obrażenia |
| `entity:killed` | `{ entity, killer }` | Ktoś zginął |
| `item:pickup` | `{ item, entity }` | Podniesiono przedmiot |
| `floor:changed` | `{ floor, name }` | Nowe piętro |
| `game:over` | `{ victory, score }` | Koniec gry |
| `message` | `{ text, color }` | Wiadomość do logu |
| `narrative:transition` | `{ from, to, event }` | Zmiana node'a narracji |

## Rendering (render.js)

Używaj layer system:
```js
FA.addLayer('map', function(ctx) {
  // rysuj tile'e z FOV
}, 0);

FA.addLayer('entities', function(ctx) {
  // rysuj wrogów i gracza — FA.draw.sprite z fallbackiem
}, 10);

FA.addLayer('ui', function(ctx) {
  // HP/MP bar, floor info, spells — FA.draw.bar, FA.draw.text
}, 30);
```

## Narrative

Używaj `FA.narrative` (z engine):
```js
FA.narrative.init({
  startNode: 'surface',
  variables: { corruption: 0, npcs_saved: 0, cursed: false },
  graph: { nodes: [...], edges: [...] }
});

FA.narrative.transition('dungeon-1', 'Zszedł na poziom 1');
FA.narrative.setVar('corruption', 3, 'Dotknął mrocznego artefaktu');
```

Typy nodów: `scene`, `choice`, `condition`.

## Sprite'y

Użyj `create_sprite` i `get_asset_guide` z MCP tools. Integracja:
```js
FA.draw.sprite('enemies', 'rat', x, y, tileSize, 'r', '#a86')
```
Ostatnie 2 argumenty = fallback char i kolor gdy brak sprite'a.

## Czego unikać
- Real-time zamiast turowego
- Skomplikowany inventory/crafting
- Animacje między turami (instant feedback)
- Modyfikowanie plików ENGINE (fa-*.js)
