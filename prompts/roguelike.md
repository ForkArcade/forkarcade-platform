# Roguelike — Game Design Prompt

Tworzysz grę typu Roguelike na platformę ForkArcade. Gra działa w przeglądarce, renderuje się na canvas, i komunikuje z platformą przez ForkArcade SDK.

## Kluczowe mechaniki

### Dungeon generation
- Proceduralna generacja poziomu przy każdym wejściu
- Algorytmy: BSP (binary space partitioning) dla pokoi + korytarzy, cellular automata dla jaskiń, drunkard walk dla organicznych tuneli
- Elementy poziomu: podłoga, ściana, drzwi, schody w dół, pułapki
- Każdy nowy poziom = trudniejszy (więcej wrogów, silniejsi, mniej leczenia)

### Ruch i eksploracja
- Tile-based, turowy — gracz rusza się o 1 pole, potem wrogowie
- 4-directional (prostsze) lub 8-directional
- Fog of war: gracz widzi tylko okolice (FOV radius 5-7 tiles)
- Odkryte ale niewidoczne pola — szare/ciemne

### FOV (Field of View)
- Raycasting od pozycji gracza
- Algorytm shadowcasting lub prosty BFS z blokadą ścian
- Widoczne tile = pełny kolor, odkryte = przyciemnione, nieodkryte = czarne

### Combat
- Bump-to-attack: wejdź na pole z wrogiem = atak
- Prosta formuła: damage = atk - def + random(-1, 2)
- Wrogowie: różne typy (melee, ranged, special)
- Wrogowie poruszają się w stronę gracza gdy go widzą (pathfinding A* lub prosty chase)

### Items i inventory
- Pickup: wejdź na pole z przedmiotem
- Typy: weapon (zmiana ATK), armor (zmiana DEF), potion (heal), scroll (special effect)
- Inventory: prosta lista, limit 10-15 slotów
- Use/equip/drop z klawiatury lub kliknięcia

### Permadeath
- Śmierć = koniec runu → ForkArcade.submitScore()
- Brak save/load — każdy run od zera
- Meta-progression opcjonalna (np. unlock nowych klas)

## Scoring dla platformy
Wywołaj `ForkArcade.submitScore(score)` po śmierci gracza:
```
score = (dungeon_depth * 100) + (enemies_killed * 10) + (gold_collected) + (items_found * 25)
```
Im głębiej zszedł, więcej zabił, więcej zebrał = lepszy score.

## Struktura kodu

```
game.js
├── DungeonGenerator: generuje 2D array (0=wall, 1=floor, 2=door, 3=stairs)
├── Entity: base class — pos, hp, atk, def, sprite/char
│   ├── Player: inventory, fov, input handling
│   └── Enemy: AI behavior (chase, patrol, flee)
├── FOV: shadowcasting/raycasting — zwraca Set widocznych pól
├── GameMap: 2D array + entities + items na mapie
├── TurnManager: player acts → all enemies act → next turn
├── Renderer: canvas — tiles, entities, fog, UI
└── MessageLog: "You hit the goblin for 3 damage", "You found a potion"
```

### Game loop pattern (turowy)
```js
// Nie requestAnimationFrame loop — turowy!
// Render po każdej akcji

function playerAction(direction) {
  const target = getTargetTile(player.pos, direction)

  if (isWall(target)) return
  if (hasEnemy(target)) {
    attack(player, getEnemy(target))
  } else {
    player.move(target)
    pickupItems(target)
  }

  if (isStairs(target)) nextLevel()

  // Po akcji gracza: tura wrogów
  enemies.forEach(e => e.takeTurn())

  updateFOV()
  render()
  checkDeath()
}

document.addEventListener('keydown', (e) => {
  const dirs = { ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0] }
  if (dirs[e.key]) playerAction(dirs[e.key])
})
```

### Dungeon generation (BSP)
```js
function generateDungeon(width, height) {
  const map = Array(height).fill(null).map(() => Array(width).fill(0)) // 0 = wall
  const rooms = []

  function split(x, y, w, h, depth) {
    if (depth === 0 || w < 8 || h < 8) {
      // Carve room with padding
      const rx = x + 1 + Math.floor(Math.random() * 2)
      const ry = y + 1 + Math.floor(Math.random() * 2)
      const rw = w - 3 - Math.floor(Math.random() * 2)
      const rh = h - 3 - Math.floor(Math.random() * 2)
      for (let j = ry; j < ry + rh; j++)
        for (let i = rx; i < rx + rw; i++)
          map[j][i] = 1 // floor
      rooms.push({ x: rx, y: ry, w: rw, h: rh })
      return
    }
    // Split horizontally or vertically
    if (Math.random() > 0.5 && w > 8) {
      const sx = x + 4 + Math.floor(Math.random() * (w - 8))
      split(x, y, sx - x, h, depth - 1)
      split(sx, y, w - (sx - x), h, depth - 1)
    } else {
      const sy = y + 4 + Math.floor(Math.random() * (h - 8))
      split(x, y, w, sy - y, depth - 1)
      split(x, sy, w, h - (sy - y), depth - 1)
    }
  }

  split(0, 0, width, height, 4)
  connectRooms(map, rooms) // corridors between room centers
  return { map, rooms }
}
```

## Canvas rendering tips
- Tile size: 16x16 lub 24x24 px
- Ściany: ciemny kolor (#333), podłoga: jasny (#ccc lub #aa8855)
- Gracz: @ symbol lub kolorowy kwadrat
- Wrogowie: litery (G=goblin, S=skeleton, D=dragon) w kolorach
- FOV: widoczne = pełna jasność, odkryte = 30% opacity, nieznane = czarne
- UI: HP bar na górze, message log na dole (ostatnie 5 wiadomości)
- Minimap opcjonalna: mały widok całego poziomu w rogu

## Input
- Klawiatura: strzałki/WASD = ruch, I = inventory, G = grab, Q = quaff potion
- Mouse/touch: klik na sąsiedni tile = ruch/atak
- Numpad opcjonalny (8-dir movement)

## Czego unikać
- Nie rób real-time — turowy system jest prostszy i bardziej strategiczny
- Nie rób skomplikowanego crafting systemu — pickup & use wystarczy
- Nie rób wielu klas postaci na start — jedna postać, dobrze zbalansowana
- Nie rób animacji między turami — instant movement, szybki feedback
- Skup się na core loop: explore → fight → loot → descend → die → score
