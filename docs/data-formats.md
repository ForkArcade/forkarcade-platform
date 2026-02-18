# Data Formats

## Unified Data Pattern (sprites AND maps)
Both sprites and maps follow the same pattern:
- `_sprites.json` / `_maps.json` — source of truth (JSON)
- `sprites.js` / `maps.js` — generated files with global data (`SPRITE_DEFS` / `MAP_DEFS`). Sprite runtime (`drawSprite`, `getSprite`, `spriteFrames`) lives in `fa-renderer.js`; map helpers live in `maps.js`.
- Hot-reload: SDK replaces globals on `FA_SPRITES_UPDATE` / `FA_MAP_UPDATE`
- `apply_data_patch` MCP tool handles both `type: "sprites"` and `type: "maps"`

## `_maps.json` format
```json
{
  "mapName": {
    "w": 40, "h": 25,
    "grid": ["111..."],
    "zones": ["..a..."],
    "zoneDefs": { "a": "forest" },
    "objects": [{ "x": 5, "y": 10, "type": "chest", "sprite": "items/chest", "rot": 0 }],
    "playerStart": { "x": 13, "y": 1 }
  }
}
```
- Grid rows are strings (digits 0-9)
- Objects are RimWorld-style: grid-placed, type + sprite + rotation
- `maps.js` provides: `getMap(name)`, `getMapGrid(name)`, `getMapObjects(name)`, `getMapZones(name)`

## Editor Architecture (RotEditorPage)
- Route: `/edit/:slug` -> `RotEditorPage.jsx`
- Three edit modes: tiles, zones, objects
- Modules: `editors/mapUtils.js`, `editors/useMapSprites.js`, `editors/RightPanel.jsx`, `editors/SpriteEditor.jsx`
- `client/src/utils/sprite.js` — renderSpriteToCanvas, spriteToDataUrl, setPixel, nextPaletteKey
- Editor fetches `_maps.json` first, falls back to `data.js` parsing (legacy)
- Objects: click to place, right-click to remove, rotation N/E/S/W, type field
