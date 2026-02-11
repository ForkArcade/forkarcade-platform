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

## Czego unikać
- Nie rób skomplikowanego sprite systemu — geometria i kolory wystarczą
- Nie rób inventory z drag&drop — prosty equip z listy
- Nie rób cutscenes — krótkie teksty przed bitwą
- Skup się na core loop: wybierz unit → rusz → atakuj → następna tura
