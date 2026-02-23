// Frame index → single char encoding for compact frameGrid storage in _maps.json
export const FRAME_CHARS = '0123456789abcdefghij'

export const DEFAULT_W = 40
export const DEFAULT_H = 25
export const ZONE_COLORS = ['#4fc3f7','#81c784','#e57373','#ffb74d','#ba68c8','#4db6ac','#fff176','#f06292']

export function createEmptyGrid(w, h) {
  return Array.from({ length: h }, () => Array(w).fill(1))
}

export function createEmptyZoneGrid(w, h) {
  return Array.from({ length: h }, () => Array(w).fill('.'))
}

export function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function parseZonesFromSection(section) {
  const zonesMatch = section.match(/zones:\s*\[([\s\S]*?)\]/)
  if (!zonesMatch) return { zoneGrid: null, zoneDefs: [] }
  const zoneStrings = [...zonesMatch[1].matchAll(/['"]([.a-z]+)['"]/g)].map(m => m[1])
  if (zoneStrings.length === 0) return { zoneGrid: null, zoneDefs: [] }
  const zoneGrid = zoneStrings.map(s => [...s])
  const defsMatch = section.match(/zoneDefs:\s*\{([^}]*)\}/)
  const zoneDefs = []
  if (defsMatch) {
    for (const m of defsMatch[1].matchAll(/(\w):\s*['"]([^'"]+)['"]/g)) {
      zoneDefs.push({ key: m[1], name: m[2], color: ZONE_COLORS[zoneDefs.length % ZONE_COLORS.length] })
    }
  }
  return { zoneGrid, zoneDefs }
}

export function parseMapsFromDataJs(text) {
  const maps = []
  const sections = text.split('FA.register')
  for (const section of sections) {
    const nameMatch = section.match(/['"]config['"]\s*,\s*['"](\w+)['"]/)
    if (!nameMatch) continue
    const mapMatch = section.match(/map:\s*\[([\s\S]*?)\]/)
    if (!mapMatch) continue
    const strings = [...mapMatch[1].matchAll(/['"]([0-9]+)['"]/g)].map(m => m[1])
    if (strings.length > 0 && strings[0].length > 0) {
      const { zoneGrid, zoneDefs } = parseZonesFromSection(section)
      maps.push({ name: nameMatch[1], grid: strings.map(s => [...s].map(Number)), zoneGrid, zoneDefs })
    }
  }
  return maps
}

export const ROTATIONS = [
  { value: 0, label: 'N' },
  { value: 1, label: 'E' },
  { value: 2, label: 'S' },
  { value: 3, label: 'W' },
]

// Convert editor internal level to _maps.json entry
function levelToMapDef(level, zoneDefs) {
  const def = {
    w: level.grid[0]?.length || DEFAULT_W,
    h: level.grid.length || DEFAULT_H,
    grid: level.grid.map(row => row.join('')),
  }
  if (level.zoneGrid && zoneDefs.length > 0 && level.zoneGrid.some(row => row.some(c => c !== '.'))) {
    def.zones = level.zoneGrid.map(row => row.join(''))
    const usedKeys = new Set(level.zoneGrid.flat().filter(c => c !== '.'))
    def.zoneDefs = Object.fromEntries(zoneDefs.filter(z => usedKeys.has(z.key)).map(z => [z.key, z.name]))
  }
  if (level.frameGrid) {
    def.frameGrid = level.frameGrid.map(row =>
      row.map(f => FRAME_CHARS[f] || '0').join('')
    )
  }
  if (level.objects?.length > 0) {
    def.objects = level.objects
  }
  if (level.playerStart) {
    def.playerStart = level.playerStart
  }
  return def
}

// Convert _maps.json dict to editor internal levels
export function mapDefsToLevels(data) {
  const levels = []
  const allZoneDefs = []
  for (const [name, mapDef] of Object.entries(data)) {
    if (!mapDef?.grid) continue
    const grid = mapDef.grid.map(s => [...s].map(Number))
    const zoneGrid = mapDef.zones
      ? mapDef.zones.map(s => [...s])
      : createEmptyZoneGrid(grid[0]?.length || DEFAULT_W, grid.length || DEFAULT_H)
    if (mapDef.zoneDefs) {
      for (const [key, zoneName] of Object.entries(mapDef.zoneDefs)) {
        if (!allZoneDefs.find(z => z.key === key)) {
          allZoneDefs.push({ key, name: zoneName, color: ZONE_COLORS[allZoneDefs.length % ZONE_COLORS.length] })
        }
      }
    }
    const frameGrid = mapDef.frameGrid
      ? mapDef.frameGrid.map(s => [...s].map(c => FRAME_CHARS.indexOf(c)))
      : null
    levels.push({
      id: `map-${name}`,
      name,
      grid,
      frameGrid,
      zoneGrid,
      objects: mapDef.objects || [],
      playerStart: mapDef.playerStart || null,
      source: 'game',
    })
  }
  return { levels, zoneDefs: allZoneDefs }
}

// Convert all editor levels to _maps.json format
export function levelsToMapDefs(levels, zoneDefs) {
  const result = {}
  for (const level of levels) {
    const name = level.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    result[name] = levelToMapDef(level, zoneDefs)
  }
  return result
}

// Autotile: compute frame index from neighbors for 20-frame wall sprites
// Frames 0-15: cardinal bitmask — left(+8) + right(+4) + bottom(+2) + top-only(+1)
// Frames 16-19: inner corners (SE, SW, NE, NW) when all cardinals are same tile
export function computeAutotileFrame(grid, x, y, tid) {
  const rows = grid.length, cols = grid[0]?.length || 0
  const isSame = (dy, dx) => {
    const ny = y + dy, nx = x + dx
    if (ny < 0 || ny >= rows || nx < 0 || nx >= cols) return true
    return grid[ny]?.[nx] === tid
  }
  const n = isSame(-1, 0), s = isSame(1, 0)
  const w = isSame(0, -1), e = isSame(0, 1)
  const mask = (w ? 0 : 8) + (e ? 0 : 4) + (s ? 0 : 2) + (n ? 0 : 1)
  // Inner corners: only when all 4 cardinal neighbors are the same tile
  if (mask === 0) {
    if (s && e && !isSame(1, 1)) return 16  // SE
    if (s && w && !isSame(1, -1)) return 17 // SW
    if (n && e && !isSame(-1, 1)) return 18 // NE
    if (n && w && !isSame(-1, -1)) return 19 // NW
  }
  return mask
}

// Resolve tiling mode: explicit > legacy fallback by frame count
export function resolveTiling(def) {
  if (!def) return null
  if (def.tiling) return def.tiling
  if (def.frames?.length >= 16) return 'autotile'
  return null
}

// Bake frame grid from tile grid, or create empty one
export function bakeFrameGrid(grid, tiles) {
  return tiles.length > 0 ? bakeAllAutotiles(grid, null, tiles) : grid.map(r => r.map(() => 0))
}

// Merge zone defs, skipping duplicates by key
export function mergeZoneDefs(existing, fresh) {
  const keys = new Set(existing.map(z => z.key))
  const newDefs = fresh.filter(z => !keys.has(z.key))
  return newDefs.length > 0 ? [...existing, ...newDefs] : existing
}

// Bake autotile frames for entire grid
export function bakeAllAutotiles(grid, frameGrid, tiles) {
  const rows = grid.length, cols = grid[0]?.length || 0
  const result = frameGrid
    ? frameGrid.map(row => [...row])
    : grid.map(row => row.map(() => 0))
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const tid = grid[y]?.[x]
      const def = tid != null ? tiles[tid]?.def : null
      if (!def || !def.frames?.length) continue
      const tiling = def.tiling
      if (tiling === 'autotile') {
        result[y][x] = computeAutotileFrame(grid, x, y, tid)
      } else if (tiling === 'checker') {
        result[y][x] = (x + y) % def.frames.length
      } else if (!tiling && def.frames.length >= 16) {
        result[y][x] = computeAutotileFrame(grid, x, y, tid)
      } else if (!tiling && def.frames.length > 1) {
        result[y][x] = (x * 31 + y * 17) % def.frames.length
      }
    }
  }
  return result
}
