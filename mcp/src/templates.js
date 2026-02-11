const ORG = 'ForkArcade'

export const TEMPLATES = {
  'strategy-rpg': {
    repo: `${ORG}/game-template-strategy-rpg`,
    name: 'Strategy RPG',
    description: 'Turowa strategia z jednostkami — grid-based combat, progresja, system tur',
    assets: {
      style: 'Bright tactical pixel art — jasne kolory, czytelne sylwetki, team colors (blue/red)',
      gridSize: '8x8 (renderowane w tile gridu)',
      palette: {
        'grass': '#4a4', 'forest': '#286028', 'mountain': '#888', 'water': '#48a', 'castle': '#a86', 'road': '#ba8',
        'blue-team': '#44c', 'red-team': '#c44', 'highlight': '#fff', 'select': '#fd4', 'health': '#4f4', 'attack': '#f44',
      },
      categories: {
        terrain: { sprites: ['grass', 'forest', 'mountain', 'water', 'castle', 'road'], desc: 'Tile\'e terenu mapy' },
        units: { sprites: ['warrior', 'archer', 'mage', 'healer'], desc: 'Klasy jednostek (w kolorach drużyny)' },
        ui: { sprites: ['selectCursor', 'moveRange', 'attackRange'], desc: 'Wskaźniki UI na mapie' },
        items: { sprites: ['weapon', 'armor', 'potion'], desc: 'Przedmioty i nagrody' },
        effects: { sprites: ['attack', 'heal', 'buff'], desc: 'Efekty akcji' },
      },
    },
  },
  'roguelike': {
    repo: `${ORG}/game-template-roguelike`,
    name: 'Roguelike',
    description: 'Proceduralne dungeony, permadeath, tile-based movement, FOV',
    assets: {
      style: 'Dark fantasy pixel art — ciemne kolory, fioletowe/niebieskie tło, jasne akcenty na postaciach',
      gridSize: '8x8 (renderowane w 20x20 tile)',
      palette: {
        'wall-dark': '#1e1638', 'wall-lit': '#362a5c', 'wall-top': '#4a3a7a',
        'floor-dark': '#0d0b1a', 'floor-lit': '#201c3a', 'player': '#4ef', 'attack': '#fa4', 'health': '#f4a',
        'mana': '#48f', 'gold': '#fd4', 'magic': '#f4f', 'damage': '#f44', 'heal': '#4f4',
      },
      categories: {
        tiles: { sprites: ['wall', 'wallLit', 'floor', 'floorLit', 'stairs'], desc: 'Tile\'e dungeonu — ściany, podłogi, schody' },
        enemies: { sprites: ['rat', 'phantom', 'mage', 'armor', 'golem', 'archmage'], desc: 'Potwory — od małych do bossa' },
        items: { sprites: ['potion', 'mana', 'gold', 'weapon', 'armor', 'spellbook'], desc: 'Przedmioty do zebrania' },
        player: { sprites: ['base', 'shielded'], desc: 'Postać gracza' },
        effects: { sprites: ['hit', 'heal', 'spell'], desc: 'Efekty wizualne walki i magii' },
      },
    },
  },
}

export const VALID_CATEGORIES = ['tiles', 'enemies', 'items', 'player', 'effects', 'terrain', 'units', 'ui']
export { ORG }
