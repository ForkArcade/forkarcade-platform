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
    levels.push({
      id: `map-${name}`,
      name,
      grid,
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

// Autotile: compute frame index from neighbors for 16-frame wall sprites
// Frame layout: left(+8) + right(+4) + bottom(+2) + top-only(+1)
export function computeAutotileFrame(grid, x, y, tid) {
  const rows = grid.length, cols = grid[0]?.length || 0
  const isEdge = (dy, dx) => {
    const ny = y + dy, nx = x + dx
    if (ny < 0 || ny >= rows || nx < 0 || nx >= cols) return false
    return grid[ny]?.[nx] !== tid
  }
  const top = isEdge(-1, 0), bottom = isEdge(1, 0)
  const left = isEdge(0, -1), right = isEdge(0, 1)
  return (left ? 8 : 0) + (right ? 4 : 0) + (bottom ? 2 : 0) + (!bottom && top ? 1 : 0)
}

// Bake autotile frames for entire grid
// 16+ frames: neighbor-based autotile, 2-15 frames: position hash for variety
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
