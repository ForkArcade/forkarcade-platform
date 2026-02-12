# Strategy RPG — Game Design Prompt

Tworzysz grę typu Strategy RPG na platformę ForkArcade. Gra używa multi-file architektury z silnikiem FA.

## Architektura plików

```
forkarcade-sdk.js   — SDK platformy (nie modyfikuj)
sprites.js          — generowany z _sprites.json (nie modyfikuj ręcznie)
fa-engine.js        — ENGINE: game loop, event bus, state, registry (nie modyfikuj)
fa-renderer.js      — ENGINE: canvas, layers, draw helpers (nie modyfikuj)
fa-input.js         — ENGINE: keyboard/mouse, keybindings (nie modyfikuj)
fa-audio.js         — ENGINE: Web Audio, dźwięki (nie modyfikuj)
fa-narrative.js     — ENGINE: narrative engine (nie modyfikuj)
data.js             — DANE GRY: definicje jednostek, ability, terenu, bitew
game.js             — LOGIKA GRY: battle setup, turny, combat, AI
render.js           — RENDERING: hex/grid, jednostki, UI panel, overlay
main.js             — ENTRY POINT: keybindings, wiring, ForkArcade.onReady
```

**Modyfikujesz tylko: `data.js`, `game.js`, `render.js`, `main.js`.**

## Kluczowe mechaniki

### System walki
- Turowy: player phase → enemy phase
- Grid-based (hex lub square)
- Każda jednostka: HP, ATK, DEF, SPD, range, move
- Terrain modifiers: las (+DEF), góra (blokada), woda (niedostępna)

### Jednostki
- Klasy: Warrior (tank), Archer (range), Mage (AOE), Healer (support)
- Każda klasa ma 2 unikalne ability
- Definiowane w registry jako data

### Progresja
- Seria bitew (chapters)
- Difficulty scaling: więcej wrogów, nowe typy

### Win/Lose
- Win: zniszcz zamek / pokonaj wszystkich
- Lose: wszyscy gracze pokonani
- Koniec → `ForkArcade.submitScore()`

## Scoring
```
score = (chapters * 1000) + (kills * 10) + (survived * 500) - (turns * 5)
```

## Jak dodawać zawartość (data.js)

### Nowy typ jednostki
```js
FA.register('unitTypes', 'paladin', {
  name: 'Paladin', char: 'P',
  hp: 35, atk: 8, def: 10, spd: 2,
  range: 1, move: 2,
  abilities: ['holyStrike', 'divineShield']
});
```

### Nowy ability
```js
FA.register('abilities', 'holyStrike', {
  name: 'Holy Strike',
  targetType: 'enemy',
  range: 1,
  effect: function(attacker, target, state) {
    var dmg = attacker.atk + 5 - target.def;
    target.hp -= Math.max(1, dmg);
    return { msg: 'Holy Strike!', color: '#ff0' };
  }
});
```

### Nowy teren
```js
FA.register('terrain', 'swamp', {
  name: 'Swamp', color: '#4a6a3a',
  moveCost: 2, defBonus: 0.8
});
```

### Nowa bitwa
```js
FA.register('battles', 2, {
  name: 'Forest Stronghold',
  enemyTypes: ['warrior', 'archer', 'mage', 'warrior'],
  castlePos: { col: 7, row: 0 },
  terrainBias: { forest: 0.25, water: 0.05 }
});
```

## Event bus — kluczowe eventy

| Event | Payload | Kiedy |
|-------|---------|-------|
| `input:click` | `{ x, y }` | Klik na canvas |
| `input:action` | `{ action, key }` | Klawisz akcji |
| `entity:damaged` | `{ entity, damage, attacker }` | Obrażenia |
| `entity:killed` | `{ entity, killer }` | Jednostka pokonana |
| `turn:player` | `{}` | Tura gracza |
| `turn:enemy` | `{}` | Tura wroga |
| `battle:end` | `{ victory }` | Koniec bitwy |
| `game:over` | `{ victory, score }` | Koniec gry |
| `message` | `{ text, color }` | Floating message |

## Rendering (render.js)

Używaj layer system i FA.draw helpers:
```js
FA.addLayer('grid', function(ctx) {
  // rysuj hex grid — FA.draw.hex(cx, cy, size, fill, stroke)
}, 0);

FA.addLayer('units', function(ctx) {
  // rysuj jednostki — FA.draw.sprite + FA.draw.bar (HP)
}, 10);

FA.addLayer('highlights', function(ctx) {
  // reachable tiles, attack targets
}, 5);

FA.addLayer('ui', function(ctx) {
  // panel boczny ze statami, przyciski akcji
}, 30);
```

## Hex math (game.js)
```js
function hexToPixel(col, row) { /* offset coords → pixel */ }
function pixelToHex(px, py) { /* pixel → offset coords */ }
function hexDistance(c1, r1, c2, r2) { /* cube distance */ }
function hexNeighbors(col, row) { /* 6 sąsiadów */ }
```

## Narrative

Używaj `FA.narrative` (z engine):
```js
FA.narrative.init({
  startNode: 'chapter-1',
  variables: { morale: 5, battles_won: 0, casualties: 0 },
  graph: { nodes: [...], edges: [...] }
});

FA.narrative.transition('chapter-2', 'Advancing to Forest Stronghold');
FA.narrative.setVar('morale', 7, 'Victory boost');
```

Typy nodów: `scene`, `choice`, `condition`.

## Sprite'y

Użyj `create_sprite` i `get_asset_guide`. Integracja:
```js
FA.draw.sprite('units', 'warrior', x - size, y - size, size * 2, 'W', '#44c')
```

## Czego unikać
- Drag & drop inventory
- Cutscenes — krótkie teksty przed bitwą
- Modyfikowanie plików ENGINE (fa-*.js)
- Skup się na: wybierz unit → rusz → atakuj → następna tura
