# Strategy RPG — Game Design Prompt

Tworzysz grę typu Strategy RPG na platformę ForkArcade. Gra działa w przeglądarce, renderuje się na canvas, i komunikuje z platformą przez ForkArcade SDK.

## Kluczowe mechaniki

### System walki
- Turowy: player phase → enemy phase
- Grid-based (hex lub square) LUB menu-based (jak klasyczne JRPG)
- Każda jednostka ma: HP, ATK, DEF, SPD (speed decyduje o kolejności)
- Typy ataków: melee (sąsiednie pola), ranged (dystans), magic (AOE)
- Terrain modifiers: las (+DEF), góra (blokada), woda (spowolnienie)

### Jednostki
- Klasy: Warrior (tank), Archer (range), Mage (AOE), Healer (support)
- Każda klasa ma 2-3 unikalne umiejętności
- Jednostki mają level i XP — zdobywają za pokonanie wroga
- Recruitment: gracz buduje drużynę z dostępnych jednostek

### Progresja
- Seria bitew (levels/chapters)
- Między bitwami: equip, heal, recruit
- Difficulty scaling: więcej wrogów, silniejsi, nowe typy

### Win/Lose
- Win: pokonaj wszystkich wrogów LUB spełnij cel misji (dotarcie do punktu, ochrona VIP)
- Lose: wszyscy gracze pokonani
- Game Over → ForkArcade.submitScore()

## Scoring dla platformy
Wywołaj `ForkArcade.submitScore(score)` po zakończeniu gry. Score może być obliczony jako:
```
score = (chapters_completed * 1000) + (enemies_killed * 10) + (units_survived * 500) - (turns_total * 5)
```
Im więcej rozdziałów, mniej tur, więcej przetrwałych jednostek = lepszy score.

## Struktura kodu

```
game.js
├── Game state machine: MENU → BATTLE_SETUP → PLAYER_TURN → ENEMY_TURN → BATTLE_END → INTERMISSION
├── Grid/Board: 2D array, tile types, unit positions
├── Unit class: stats, abilities, position, AI (for enemies)
├── BattleManager: turn order, damage calc, win/lose check
├── Renderer: canvas drawing — grid, units, UI, animations
└── InputHandler: click/tap on grid → select unit → select action → select target
```

### Game loop pattern
```js
const STATE = { MENU: 0, BATTLE: 1, PLAYER_TURN: 2, ENEMY_TURN: 3, ANIMATION: 4, RESULT: 5 }
let state = STATE.MENU

function update() {
  switch(state) {
    case STATE.PLAYER_TURN: handlePlayerInput(); break
    case STATE.ENEMY_TURN: runEnemyAI(); break
    case STATE.ANIMATION: updateAnimations(); break
    case STATE.RESULT: showResult(); break
  }
}

function render() {
  drawGrid()
  drawUnits()
  drawUI()
  drawAnimations()
}

function gameLoop() {
  update()
  render()
  requestAnimationFrame(gameLoop)
}
```

### Damage formula
```js
function calcDamage(attacker, defender, terrain) {
  const raw = attacker.atk - defender.def * terrain.defBonus
  return Math.max(1, Math.floor(raw * (0.9 + Math.random() * 0.2)))
}
```

## Canvas rendering tips
- Grid: rysuj tile po tile, kolory/patterny per typ terenu
- Jednostki: kolorowe kółka lub prostokąty z literą klasy (W/A/M/H)
- Zaznaczenie: highlight pola na które unit może się ruszyć (BFS po gridzie)
- UI: panel boczny ze statami zaznaczonej jednostki
- Animacje: proste tweeny (unit przesuwa się z pola A do B)
- HP bar: mały pasek nad jednostką

## System sprite'ów (pixel art)

Gra może używać pixel art sprite'ów zamiast geometrii. Sprite'y trzymane w `_sprites.json`, wygenerowany `sprites.js` udostępnia `drawSprite()` i `getSprite()`.

### Tworzenie sprite'ów
Użyj narzędzia `get_asset_guide` aby poznać wymagane sprite'y i paletę kolorów.
Użyj narzędzia `create_sprite` aby tworzyć sprite'y — waliduje grid i generuje sprites.js.

### Format
```json
{
  "w": 8, "h": 8,
  "palette": { "1": "#4a4", "2": "#286028" },
  "pixels": [
    ".11..11.",
    "11111111",
    "12211221",
    "12211221",
    "11111111",
    ".111111.",
    "..1111..",
    "..1..1.."
  ]
}
```

### Wzorzec integracji (fallback na geometrię)
```js
// W renderze — sprite z fallbackiem na geometrię
var sprite = typeof getSprite === 'function' && getSprite('units', unit.className)
if (sprite) {
  drawSprite(ctx, sprite, sx, sy, tileSize)
} else {
  ctx.fillStyle = unit.team === 'player' ? '#44c' : '#c44'
  ctx.fillRect(sx + 2, sy + 2, tileSize - 4, tileSize - 4)
  ctx.fillStyle = '#fff'
  ctx.fillText(unit.char, sx + tileSize/2, sy + tileSize/2)
}
```

Pamiętaj dodać `<script src="sprites.js"></script>` w index.html przed game.js.

## Czego unikać
- Nie rób inventory z drag&drop — prosty equip z listy
- Nie rób cutscenes — krótkie teksty przed bitwą
- Skup się na core loop: wybierz unit → rusz → atakuj → następna tura

## Warstwa narracji

Platforma ForkArcade wyświetla w czasie rzeczywistym panel narracyjny obok gry — graf scenariusza, zmienne fabularne, log zdarzeń. Gra raportuje stan narracji przez SDK.

### Zmienne fabularne
Definiuj zmienne które wpływają na fabułę i są widoczne dla gracza:
```js
const narrative = {
  variables: { morale: 5, betrayals: 0, alliance_formed: false },
  currentNode: 'chapter-1',
  graph: { nodes: [], edges: [] },
};
```

Zmienne numeryczne (0-10) są wyświetlane jako paski postępu. Boolean jako checkmarks.

### Graf narracyjny
Graf to state machine — nodes to sceny/rozdziały, edges to przejścia:
```js
graph: {
  nodes: [
    { id: 'chapter-1', label: 'Obrona wioski', type: 'scene' },
    { id: 'choice-ally', label: 'Sojusz czy zdrada?', type: 'choice' },
    { id: 'path-loyal', label: 'Lojalny sojusznik', type: 'scene' },
    { id: 'path-betray', label: 'Zdrada', type: 'scene' },
    { id: 'cond-morale', label: 'Morale > 5?', type: 'condition' },
  ],
  edges: [
    { from: 'chapter-1', to: 'choice-ally' },
    { from: 'choice-ally', to: 'path-loyal', label: 'Sojusz' },
    { from: 'choice-ally', to: 'path-betray', label: 'Zdrada' },
    { from: 'path-loyal', to: 'cond-morale' },
  ]
}
```

Typy nodów: `scene` (prostokąt), `choice` (romb), `condition` (trójkąt).

### Raportowanie stanu
Wywołuj `ForkArcade.updateNarrative()` przy zmianie sceny, zmiennej lub ważnym zdarzeniu:
```js
// Przejście do nowego rozdziału
narrative.currentNode = 'chapter-2';
ForkArcade.updateNarrative({
  variables: narrative.variables,
  currentNode: narrative.currentNode,
  graph: narrative.graph,
  event: 'Rozpoczęto Rozdział 2: Oblężenie'
});

// Zmiana zmiennej po decyzji gracza
narrative.variables.morale += 2;
ForkArcade.updateNarrative({
  variables: narrative.variables,
  currentNode: narrative.currentNode,
  graph: narrative.graph,
  event: 'morale +2 (gracz obronił cywili)'
});
```

### Wiązanie mechaniki z narracją
- Wynik bitwy → zmiana node'a (wygrana → path A, przegrana → path B)
- Decyzje przed bitwą (np. kogo wysłać) → zmiana zmiennych
- Utrata kluczowej jednostki → zdarzenie fabularne
- Znalezienie artefaktu → odblokowanie ścieżki w grafie

### Wzorzec narrative engine
```js
const narrative = {
  variables: { morale: 5, betrayals: 0, has_artifact: false },
  currentNode: 'chapter-1',
  graph: { nodes: [...], edges: [...] },

  transition(nodeId, event) {
    this.currentNode = nodeId;
    ForkArcade.updateNarrative({
      variables: this.variables,
      currentNode: this.currentNode,
      graph: this.graph,
      event: event
    });
  },

  setVar(name, value, reason) {
    this.variables[name] = value;
    ForkArcade.updateNarrative({
      variables: this.variables,
      currentNode: this.currentNode,
      graph: this.graph,
      event: reason || (name + ' = ' + value)
    });
  }
};
```
