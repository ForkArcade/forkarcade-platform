export const tools = [
  {
    name: 'list_templates',
    description: 'Lista dostępnych template\'ów gier ForkArcade z opisami',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'init_game',
    description: 'Tworzy nową grę — forkuje template repo do org ForkArcade i klonuje lokalnie',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Unikalna nazwa gry (lowercase, hyphens), np. "dark-dungeon"' },
        template: { type: 'string', description: 'Klucz template: strategy-rpg lub roguelike' },
        title: { type: 'string', description: 'Wyświetlana nazwa gry' },
        description: { type: 'string', description: 'Krótki opis gry' },
      },
      required: ['slug', 'template', 'title'],
    },
  },
  {
    name: 'get_sdk_docs',
    description: 'Zwraca dokumentację ForkArcade SDK — jak gra komunikuje się z platformą',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_game_prompt',
    description: 'Zwraca prompt engineeringowy dla danego typu gry — wiedza o mechanikach, wzorcach kodu, strukturze',
    inputSchema: {
      type: 'object',
      properties: {
        template: { type: 'string', description: 'Klucz template: strategy-rpg lub roguelike' },
      },
      required: ['template'],
    },
  },
  {
    name: 'validate_game',
    description: 'Sprawdza czy gra jest poprawnie skonfigurowana — SDK podpięty, index.html istnieje, submitScore wywołany',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Ścieżka do katalogu gry' },
      },
      required: ['path'],
    },
  },
  {
    name: 'publish_game',
    description: 'Publikuje grę — push do GitHub, włącza GitHub Pages, rejestruje w platformie ForkArcade',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Ścieżka do katalogu gry' },
        slug: { type: 'string', description: 'Slug gry (nazwa repo)' },
        title: { type: 'string', description: 'Tytuł gry' },
        description: { type: 'string', description: 'Opis gry' },
      },
      required: ['path', 'slug', 'title'],
    },
  },
  {
    name: 'get_asset_guide',
    description: 'Zwraca przewodnik po assetach dla danego typu gry — jakie sprite\'y stworzyć, paleta kolorów, styl',
    inputSchema: {
      type: 'object',
      properties: {
        template: { type: 'string', description: 'Klucz template: strategy-rpg lub roguelike' },
      },
      required: ['template'],
    },
  },
  {
    name: 'create_sprite',
    description: 'Tworzy pixel art sprite — waliduje, zapisuje do _sprites.json, generuje sprites.js',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Ścieżka do katalogu gry' },
        category: { type: 'string', description: 'Kategoria: tiles, enemies, items, player, effects, terrain, units, ui' },
        name: { type: 'string', description: 'Nazwa sprite\'a, np. "rat", "wallLit", "warrior"' },
        palette: { type: 'object', description: 'Mapa znaków na kolory hex: { "1": "#a86", "2": "#d9a" }' },
        pixels: { type: 'array', items: { type: 'string' }, description: 'Grid pikseli — każdy wiersz to string, "." = transparent' },
      },
      required: ['path', 'category', 'name', 'palette', 'pixels'],
    },
  },
  {
    name: 'validate_assets',
    description: 'Sprawdza czy gra ma wszystkie wymagane sprite\'y dla swojego typu',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Ścieżka do katalogu gry' },
        template: { type: 'string', description: 'Klucz template (opcjonalny — wykryje automatycznie)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'preview_assets',
    description: 'Generuje _preview.html z podglądem wszystkich sprite\'ów w różnych skalach',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Ścieżka do katalogu gry' },
      },
      required: ['path'],
    },
  },
  {
    name: 'get_versions',
    description: 'Zwraca historię wersji gry z .forkarcade.json',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Ścieżka do katalogu gry' },
      },
      required: ['path'],
    },
  },
]
