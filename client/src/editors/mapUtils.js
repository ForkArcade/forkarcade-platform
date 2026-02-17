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

export function parseZonesFromSection(section) {
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
// 16+ frames: neighbor-based autotile, 2 frames: checkerboard (x+y)%2
export function bakeAllAutotiles(grid, frameGrid, tiles) {
  const rows = grid.length, cols = grid[0]?.length || 0
  const result = frameGrid
    ? frameGrid.map(row => [...row])
    : grid.map(row => row.map(() => 0))
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const tid = grid[y]?.[x]
      const fc = tid != null ? tiles[tid]?.def?.frames?.length : 0
      if (fc >= 16) {
        result[y][x] = computeAutotileFrame(grid, x, y, tid)
      } else if (fc === 2) {
        result[y][x] = (x + y) % 2
      }
    }
  }
  return result
}
