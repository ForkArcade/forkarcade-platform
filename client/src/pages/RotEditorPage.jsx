import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { T } from '../theme'
import { Button } from '../components/ui'
import { GITHUB_ORG, githubRawUrl } from '../api'
import { renderSpriteToCanvas, spriteToDataUrl } from '../utils/sprite'
import SpriteEditor from '../editors/SpriteEditor'

const DEFAULT_W = 40
const DEFAULT_H = 25
const ZONE_COLORS = ['#4fc3f7','#81c784','#e57373','#ffb74d','#ba68c8','#4db6ac','#fff176','#f06292']

function createEmptyGrid(w, h) {
  return Array.from({ length: h }, () => Array(w).fill(1))
}

function createEmptyZoneGrid(w, h) {
  return Array.from({ length: h }, () => Array(w).fill('.'))
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

const STORAGE_KEY = slug => `fa-maps-${slug}`

function loadLevels(slug) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(slug))
    if (raw) {
      const data = JSON.parse(raw)
      if (data.levels?.length) return data
    }
  } catch {}
  return null
}

function saveLevels(slug, data) {
  localStorage.setItem(STORAGE_KEY(slug), JSON.stringify(data))
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

function parseMapsFromDataJs(text) {
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
function computeAutotileFrame(grid, x, y, tid) {
  const rows = grid.length, cols = grid[0]?.length || 0
  const isEdge = (dy, dx) => {
    const ny = y + dy, nx = x + dx
    if (ny < 0 || ny >= rows || nx < 0 || nx >= cols) return false
    return grid[ny][nx] !== tid
  }
  const top = isEdge(-1, 0), bottom = isEdge(1, 0)
  const left = isEdge(0, -1), right = isEdge(0, 1)
  return (left ? 8 : 0) + (right ? 4 : 0) + (bottom ? 2 : 0) + (!bottom && top ? 1 : 0)
}

// Bake autotile frames for entire grid (only touches >=16 frame sprites, preserves others)
function bakeAllAutotiles(grid, frameGrid, tiles) {
  const rows = grid.length, cols = grid[0]?.length || 0
  const result = frameGrid
    ? frameGrid.map(row => [...row])
    : grid.map(row => row.map(() => 0))
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const tid = grid[y][x]
      if (tiles[tid]?.def.frames.length >= 16) {
        result[y][x] = computeAutotileFrame(grid, x, y, tid)
      }
    }
  }
  return result
}

export default function RotEditorPage() {
  const { slug } = useParams()
  const canvasRef = useRef(null)
  const offscreenRef = useRef(null)
  const containerRef = useRef(null)
  const levelsSaveRef = useRef(null)

  const [levels, setLevels] = useState(() => {
    const loaded = loadLevels(slug)
    if (loaded) return loaded.levels
    const id = uid()
    return [{ id, name: 'Level 1', grid: createEmptyGrid(DEFAULT_W, DEFAULT_H) }]
  })
  const [activeId, setActiveId] = useState(() => {
    const loaded = loadLevels(slug)
    return loaded?.activeId || levels[0]?.id
  })

  const [zoneDefs, setZoneDefs] = useState(() => {
    const loaded = loadLevels(slug)
    return loaded?.zoneDefs || []
  })
  const [editMode, setEditMode] = useState('tiles')
  const [activeZone, setActiveZone] = useState(0)
  const [showZones, setShowZones] = useState(true)

  const [spriteDefs, setSpriteDefs] = useState(null)
  const [activeCategory, setActiveCategory] = useState('tiles')
  const spriteInitialRef = useRef(true)
  const spriteSaveRef = useRef(null)

  // Load sprites from localStorage (local edits) or GitHub
  useEffect(() => {
    spriteInitialRef.current = true
    const lsKey = `fa-sprites-${slug}`
    const saved = localStorage.getItem(lsKey)
    if (saved) {
      try { setSpriteDefs(JSON.parse(saved)); spriteInitialRef.current = false; return } catch {}
    }
    fetch(githubRawUrl(`${GITHUB_ORG}/${slug}/main/_sprites.json`))
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) { setSpriteDefs(data); spriteInitialRef.current = false } })
      .catch(() => {})
  }, [slug])

  // Debounced save spriteDefs to localStorage on edit
  useEffect(() => {
    if (!spriteDefs || spriteInitialRef.current) return
    clearTimeout(spriteSaveRef.current)
    spriteSaveRef.current = setTimeout(() => {
      localStorage.setItem(`fa-sprites-${slug}`, JSON.stringify(spriteDefs))
    }, 400)
    return () => clearTimeout(spriteSaveRef.current)
  }, [spriteDefs, slug])

  // Hot-reload from sprite editor (cross-tab)
  useEffect(() => {
    const lsKey = `fa-sprites-${slug}`
    const handler = (e) => {
      if (e.key === lsKey && e.newValue) {
        try { setSpriteDefs(JSON.parse(e.newValue)) } catch {}
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [slug])

  // Build categories list from _sprites.json
  const categories = useMemo(() => {
    if (!spriteDefs) return []
    return Object.keys(spriteDefs).filter(cat =>
      Object.values(spriteDefs[cat]).some(d => d?.frames)
    )
  }, [spriteDefs])

  // Build tile list dynamically from active category
  const tiles = useMemo(() => {
    const catData = spriteDefs?.[activeCategory]
    if (!catData) return []
    return Object.entries(catData)
      .filter(([, def]) => def?.frames)
      .map(([name, def]) => ({
        name,
        label: name.replace(/_/g, ' '),
        def,
        thumb: spriteToDataUrl(def, 24, 0),
      }))
  }, [spriteDefs, activeCategory])

  const tilesRef = useRef([])
  tilesRef.current = tiles

  // Rebake autotile frames when tile defs change (sprite reload, category switch)
  useEffect(() => {
    if (tiles.length === 0) return
    setLevels(prev => {
      let changed = false
      const next = prev.map(level => {
        const baked = bakeAllAutotiles(level.grid, level.frameGrid, tiles)
        const old = level.frameGrid
        if (old && old.length === baked.length && old.every((row, y) => row.every((v, x) => v === baked[y][x]))) return level
        changed = true
        return { ...level, frameGrid: baked }
      })
      return changed ? next : prev
    })
  }, [tiles])

  const [activeTile, setActiveTile] = useState(0)
  const [activeFrame, setActiveFrame] = useState(0)

  // Pre-compute frame thumbnails for active tile (avoid spriteToDataUrl in render)
  const activeFrameThumbs = useMemo(() => {
    const tile = tiles[activeTile]
    if (!tile || tile.def.frames.length <= 1) return []
    return tile.def.frames.map((_, fi) => spriteToDataUrl(tile.def, 20, fi))
  }, [tiles, activeTile])

  // Sprite editor: update a single sprite def within spriteDefs
  const handleSpriteUpdate = useCallback((mutator) => {
    const name = tiles[activeTile]?.name
    if (!name) return
    const cat = activeCategory
    setSpriteDefs(prev => {
      const prevDef = prev[cat]?.[name]
      if (!prevDef) return prev
      const newDef = {
        ...prevDef,
        palette: { ...prevDef.palette },
        frames: prevDef.frames.map(f => [...f]),
        origin: prevDef.origin ? [...prevDef.origin] : undefined,
      }
      mutator(newDef)
      return { ...prev, [cat]: { ...prev[cat], [name]: newDef } }
    })
  }, [activeCategory, activeTile, tiles])

  // Fetch game maps from data.js on mount
  useEffect(() => {
    fetch(githubRawUrl(`${GITHUB_ORG}/${slug}/main/data.js`))
      .then(r => r.ok ? r.text() : null)
      .then(text => {
        if (!text) return
        const gameMaps = parseMapsFromDataJs(text)
        if (gameMaps.length === 0) return
        // Merge zoneDefs from all game maps
        const allGameZoneDefs = gameMaps.flatMap(m => m.zoneDefs || [])
        if (allGameZoneDefs.length > 0) {
          setZoneDefs(prev => {
            const existingKeys = new Set(prev.map(z => z.key))
            const newDefs = allGameZoneDefs.filter(z => !existingKeys.has(z.key))
            return newDefs.length > 0 ? [...prev, ...newDefs] : prev
          })
        }
        setLevels(prev => {
          if (prev.some(l => l.source === 'game')) return prev
          const curTiles = tilesRef.current
          const gameLevels = gameMaps.map(m => ({
            id: `game-${m.name}`,
            name: m.name,
            grid: m.grid,
            frameGrid: curTiles.length > 0 ? bakeAllAutotiles(m.grid, null, curTiles) : m.grid.map(r => r.map(() => 0)),
            zoneGrid: m.zoneGrid || createEmptyZoneGrid(m.grid[0]?.length || DEFAULT_W, m.grid.length || DEFAULT_H),
            source: 'game',
          }))
          const merged = [...gameLevels, ...prev]
          setActiveId(gameLevels[0].id)
          return merged
        })
      })
      .catch(() => {})
  }, [slug])

  const [isPainting, setIsPainting] = useState(false)
  const [hoverPos, setHoverPos] = useState(null)
  const [cellSize, setCellSize] = useState(20)
  const [importText, setImportText] = useState('')
  const [copied, setCopied] = useState(false)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')

  const activeLevel = levels.find(l => l.id === activeId) || levels[0]
  const grid = activeLevel.grid
  const frameGrid = activeLevel.frameGrid
  const zoneGrid = activeLevel.zoneGrid
  const cols = grid[0]?.length || DEFAULT_W
  const rows = grid.length || DEFAULT_H

  // Debounced save levels to localStorage
  useEffect(() => {
    clearTimeout(levelsSaveRef.current)
    levelsSaveRef.current = setTimeout(() => saveLevels(slug, { levels, activeId, zoneDefs }), 300)
    return () => clearTimeout(levelsSaveRef.current)
  }, [levels, activeId, slug, zoneDefs])

  // Compute cell size to fit container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect()
      const maxW = Math.floor(rect.width / cols)
      const maxH = Math.floor(rect.height / rows)
      setCellSize(Math.max(10, Math.min(maxW, maxH, 28)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [cols, rows])

  // Render sprites to offscreen canvas (incremental — only changed cells)
  const prevMapRef = useRef(null)
  const [mapVersion, setMapVersion] = useState(0)
  useEffect(() => {
    const w = cols * cellSize, h = rows * cellSize
    if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas')
    const off = offscreenRef.current
    const ctx = off.getContext('2d')
    const prev = prevMapRef.current
    const fullRedraw = off.width !== w || off.height !== h || !prev || prev.tiles !== tiles

    if (fullRedraw) {
      off.width = w
      off.height = h
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const tid = grid[y]?.[x] ?? 0
          const tile = tiles[tid]
          if (tile?.def) {
            renderSpriteToCanvas(ctx, tile.def, frameGrid?.[y]?.[x] ?? 0, x * cellSize, y * cellSize, cellSize)
          } else {
            ctx.fillStyle = '#222'
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
          }
        }
      }
    } else {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const tid = grid[y]?.[x] ?? 0
          const fid = frameGrid?.[y]?.[x] ?? 0
          if (tid === (prev.grid[y]?.[x] ?? 0) && fid === (prev.fg[y]?.[x] ?? 0)) continue
          const px = x * cellSize, py = y * cellSize
          ctx.fillStyle = '#000'
          ctx.fillRect(px, py, cellSize, cellSize)
          const tile = tiles[tid]
          if (tile?.def) {
            renderSpriteToCanvas(ctx, tile.def, fid, px, py, cellSize)
          } else {
            ctx.fillStyle = '#222'
            ctx.fillRect(px, py, cellSize, cellSize)
          }
        }
      }
    }

    prevMapRef.current = { grid, fg: frameGrid, tiles }
    setMapVersion(v => v + 1)
  }, [grid, frameGrid, cellSize, cols, rows, tiles])

  // Blit offscreen + grid lines + hover (cheap — runs on hover too)
  useEffect(() => {
    const canvas = canvasRef.current
    const off = offscreenRef.current
    if (!canvas || !off || !off.width) return
    const w = off.width, h = off.height
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(off, 0, 0)
    // Grid lines (always fresh — avoids alpha accumulation on offscreen)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= cols; x++) {
      ctx.beginPath()
      ctx.moveTo(x * cellSize + 0.5, 0)
      ctx.lineTo(x * cellSize + 0.5, h)
      ctx.stroke()
    }
    for (let y = 0; y <= rows; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * cellSize + 0.5)
      ctx.lineTo(w, y * cellSize + 0.5)
      ctx.stroke()
    }
    // Zone overlay
    if (showZones && zoneGrid) {
      const zoneColorMap = {}
      for (const zd of zoneDefs) zoneColorMap[zd.key] = zd.color
      ctx.font = `bold ${Math.max(8, cellSize * 0.5)}px ${T.mono}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const zk = zoneGrid[y]?.[x]
          if (!zk || zk === '.') continue
          const color = zoneColorMap[zk]
          if (!color) continue
          const px = x * cellSize, py = y * cellSize
          ctx.fillStyle = color + '4d' // ~30% opacity
          ctx.fillRect(px, py, cellSize, cellSize)
          ctx.fillStyle = color
          ctx.fillText(zk, px + cellSize / 2, py + cellSize / 2)
        }
      }
    }
    if (hoverPos && hoverPos.x >= 0 && hoverPos.x < cols && hoverPos.y >= 0 && hoverPos.y < rows) {
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.strokeRect(hoverPos.x * cellSize + 1, hoverPos.y * cellSize + 1, cellSize - 2, cellSize - 2)
    }
  }, [mapVersion, hoverPos, cellSize, cols, rows, showZones, zoneGrid, zoneDefs])

  // Keyboard: 0-9 to select tile
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return
      const n = parseInt(e.key)
      if (!isNaN(n) && n < tiles.length) { setActiveTile(n); setActiveFrame(0) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [tiles.length])

  useEffect(() => {
    const handler = () => setIsPainting(false)
    window.addEventListener('mouseup', handler)
    return () => window.removeEventListener('mouseup', handler)
  }, [])

  const getGridPos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / cellSize)
    const y = Math.floor((e.clientY - rect.top) / cellSize)
    if (x < 0 || x >= cols || y < 0 || y >= rows) return null
    return { x, y }
  }, [cellSize, cols, rows])

  const updateLevel = useCallback((fn) => {
    setLevels(prev => {
      let changed = false
      const next = prev.map(l => {
        if (l.id !== activeId) return l
        const update = fn(l)
        if (!update || Object.keys(update).length === 0) return l
        changed = true
        return { ...l, ...update }
      })
      return changed ? next : prev
    })
  }, [activeId])

  const paintAt = useCallback((pos) => {
    if (!pos) return
    updateLevel(level => {
      const fg = level.frameGrid || level.grid.map(row => row.map(() => 0))
      const isAutotile = tiles[activeTile]?.def.frames.length >= 16
      if (level.grid[pos.y][pos.x] === activeTile && (isAutotile || fg[pos.y][pos.x] === activeFrame)) return {}
      const nextGrid = level.grid.map(row => [...row])
      const nextFg = fg.map(row => [...row])
      nextGrid[pos.y][pos.x] = activeTile
      nextFg[pos.y][pos.x] = isAutotile
        ? computeAutotileFrame(nextGrid, pos.x, pos.y, activeTile)
        : activeFrame
      // Rebake autotile neighbors whose edge status may have changed
      for (const [dy, dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const ny = pos.y + dy, nx = pos.x + dx
        if (ny < 0 || ny >= nextGrid.length || nx < 0 || nx >= (nextGrid[0]?.length || 0)) continue
        const nTid = nextGrid[ny][nx]
        if (tiles[nTid]?.def.frames.length >= 16) {
          nextFg[ny][nx] = computeAutotileFrame(nextGrid, nx, ny, nTid)
        }
      }
      return { grid: nextGrid, frameGrid: nextFg }
    })
  }, [activeTile, activeFrame, updateLevel, tiles])

  const paintZoneAt = useCallback((pos, erase) => {
    if (!pos) return
    const key = erase ? '.' : (zoneDefs[activeZone]?.key || '.')
    updateLevel(level => {
      const zg = level.zoneGrid || createEmptyZoneGrid(level.grid[0]?.length || cols, level.grid.length || rows)
      if (zg[pos.y]?.[pos.x] === key) return {}
      const nextZg = zg.map(row => [...row])
      nextZg[pos.y][pos.x] = key
      return { zoneGrid: nextZg }
    })
  }, [zoneDefs, activeZone, updateLevel, cols, rows])

  const handleMouseDown = (e) => {
    e.preventDefault()
    setIsPainting(true)
    if (editMode === 'zones') paintZoneAt(getGridPos(e), e.button === 2)
    else paintAt(getGridPos(e))
  }
  const handleMouseMove = (e) => {
    const pos = getGridPos(e)
    setHoverPos(prev => (prev && pos && prev.x === pos.x && prev.y === pos.y) ? prev : pos)
    if (isPainting) {
      if (editMode === 'zones') paintZoneAt(pos, e.buttons === 2)
      else paintAt(pos)
    }
  }
  const handleMouseLeave = () => setHoverPos(null)

  const handleExport = () => {
    let text = 'map: [\n' + grid.map(row => `  '${row.join('')}'`).join(',\n') + '\n]'
    if (zoneGrid && zoneDefs.length > 0 && zoneGrid.some(row => row.some(c => c !== '.'))) {
      text += ',\nzones: [\n' + zoneGrid.map(row => `  '${row.join('')}'`).join(',\n') + '\n]'
      const usedKeys = new Set(zoneGrid.flat().filter(c => c !== '.'))
      const defsObj = zoneDefs.filter(z => usedKeys.has(z.key)).map(z => `${z.key}: '${z.name}'`).join(', ')
      text += `,\nzoneDefs: { ${defsObj} }`
    }
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const handleDownloadJson = () => {
    const data = { name: activeLevel?.name || 'map', w: cols, h: rows, map: grid.map(row => row.join('')) }
    if (zoneGrid && zoneDefs.length > 0 && zoneGrid.some(row => row.some(c => c !== '.'))) {
      data.zones = zoneGrid.map(row => row.join(''))
      const usedKeys = new Set(zoneGrid.flat().filter(c => c !== '.'))
      data.zoneDefs = Object.fromEntries(zoneDefs.filter(z => usedKeys.has(z.key)).map(z => [z.key, z.name]))
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.download = `${activeLevel?.name || 'map'}.json`
    a.href = url
    a.click()
    URL.revokeObjectURL(url)
  }

  const fileInputRef = useRef(null)
  const handleUploadJson = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!data.map?.length) return
        const newGrid = data.map.map(s => [...s].map(Number))
        const newZoneGrid = data.zones
          ? data.zones.map(s => [...s])
          : createEmptyZoneGrid(newGrid[0].length, newGrid.length)
        if (data.zoneDefs) {
          const parsedDefs = Object.entries(data.zoneDefs).map(([key, name], i) => ({
            key, name, color: ZONE_COLORS[i % ZONE_COLORS.length],
          }))
          setZoneDefs(prev => {
            const existingKeys = new Set(prev.map(z => z.key))
            const newDefs = parsedDefs.filter(z => !existingKeys.has(z.key))
            return newDefs.length > 0 ? [...prev, ...newDefs] : prev
          })
        }
        updateLevel(() => ({
          grid: newGrid,
          frameGrid: bakeAllAutotiles(newGrid, null, tiles),
          zoneGrid: newZoneGrid,
        }))
        if (data.name) {
          setLevels(prev => prev.map(l => l.id === activeId ? { ...l, name: data.name } : l))
        }
      } catch {}
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleImport = () => {
    const matches = importText.match(/['"]([0-9]+)['"]/g)
    if (!matches) return
    const strings = matches.map(m => m.slice(1, -1))
    if (strings.length > 0 && strings[0].length > 0) {
      const newGrid = strings.map(s => [...s].map(Number))
      const { zoneGrid: parsedZones, zoneDefs: parsedDefs } = parseZonesFromSection(importText)
      if (parsedDefs.length > 0) {
        setZoneDefs(prev => {
          const existingKeys = new Set(prev.map(z => z.key))
          const newDefs = parsedDefs.filter(z => !existingKeys.has(z.key))
          return newDefs.length > 0 ? [...prev, ...newDefs] : prev
        })
      }
      updateLevel(() => ({
        grid: newGrid,
        frameGrid: bakeAllAutotiles(newGrid, null, tiles),
        zoneGrid: parsedZones || createEmptyZoneGrid(newGrid[0].length, newGrid.length),
      }))
      setImportText('')
    }
  }

  const handleResize = (newW, newH) => {
    const w = Math.max(5, Math.min(80, newW || cols))
    const h = Math.max(5, Math.min(50, newH || rows))
    updateLevel(level => {
      const newGrid = Array.from({ length: h }, (_, y) =>
        Array.from({ length: w }, (_, x) => level.grid[y]?.[x] ?? 1)
      )
      const newZg = Array.from({ length: h }, (_, y) =>
        Array.from({ length: w }, (_, x) => level.zoneGrid?.[y]?.[x] ?? '.')
      )
      return { grid: newGrid, frameGrid: bakeAllAutotiles(newGrid, null, tiles), zoneGrid: newZg }
    })
  }

  const addLevel = () => {
    const id = uid()
    const name = `Level ${levels.length + 1}`
    const grid = createEmptyGrid(DEFAULT_W, DEFAULT_H)
    setLevels(prev => [...prev, { id, name, grid, frameGrid: grid.map(r => r.map(() => 0)), zoneGrid: createEmptyZoneGrid(DEFAULT_W, DEFAULT_H) }])
    setActiveId(id)
  }

  const deleteLevel = (id) => {
    if (levels.length <= 1) return
    setLevels(prev => prev.filter(l => l.id !== id))
    if (activeId === id) setActiveId(levels.find(l => l.id !== id).id)
  }

  const startRename = (level) => {
    setRenamingId(level.id)
    setRenameValue(level.name)
  }

  const finishRename = () => {
    if (renamingId && renameValue.trim()) {
      setLevels(prev => prev.map(l => l.id === renamingId ? { ...l, name: renameValue.trim() } : l))
    }
    setRenamingId(null)
  }

  const duplicateLevel = (level) => {
    const id = uid()
    const dup = {
      id, name: level.name + ' copy',
      grid: level.grid.map(r => [...r]),
      frameGrid: level.frameGrid ? level.frameGrid.map(r => [...r]) : level.grid.map(r => r.map(() => 0)),
      zoneGrid: level.zoneGrid ? level.zoneGrid.map(r => [...r]) : createEmptyZoneGrid(level.grid[0]?.length || DEFAULT_W, level.grid.length || DEFAULT_H),
    }
    setLevels(prev => [...prev, dup])
    setActiveId(id)
  }

  const inputStyle = {
    width: 50, padding: T.sp[2],
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: T.radius.sm, color: T.textBright,
    fontFamily: T.mono, fontSize: T.fontSize.xs,
  }

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* Left Panel: Tiles/Zones + Sprite Editor */}
      <div style={{
        width: 260, borderRight: `1px solid ${T.border}`,
        padding: T.sp[4], display: 'flex', flexDirection: 'column', gap: T.sp[1],
        overflowY: 'auto', flexShrink: 0,
      }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: T.sp[1], marginBottom: T.sp[3] }}>
          {['tiles', 'zones'].map(mode => (
            <button
              key={mode}
              onClick={() => setEditMode(mode)}
              style={{
                flex: 1, background: editMode === mode ? T.accentColor : 'transparent',
                color: editMode === mode ? '#000' : T.text,
                border: `1px solid ${editMode === mode ? T.accentColor : T.border}`,
                borderRadius: T.radius.sm, padding: '4px 0',
                fontSize: 10, fontFamily: T.mono, cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        {editMode === 'tiles' ? (<>
          {/* Category selector */}
          {categories.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: T.sp[1], marginBottom: T.sp[3] }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setActiveTile(0); setActiveFrame(0) }}
                  style={{
                    background: activeCategory === cat ? T.accentColor : 'transparent',
                    color: activeCategory === cat ? '#000' : T.text,
                    border: `1px solid ${activeCategory === cat ? T.accentColor : T.border}`,
                    borderRadius: T.radius.sm, padding: '2px 6px',
                    fontSize: 9, fontFamily: T.mono, cursor: 'pointer',
                    textTransform: 'uppercase', letterSpacing: '0.03em',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
          <div style={{ fontSize: T.fontSize.xs, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: T.sp[2] }}>
            {activeCategory}
          </div>
          {tiles.map((tile, idx) => (
            <div key={tile.name}>
              <div
                onClick={() => { setActiveTile(idx); setActiveFrame(0) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: T.sp[2],
                  padding: `${T.sp[1]}px ${T.sp[2]}px`,
                  borderRadius: T.radius.sm, cursor: 'pointer',
                  background: activeTile === idx ? T.elevated : 'transparent',
                  border: activeTile === idx ? `1px solid ${T.accentColor}` : '1px solid transparent',
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: 3,
                  border: '1px solid rgba(255,255,255,0.1)',
                  overflow: 'hidden', flexShrink: 0,
                  background: '#111',
                }}>
                  {tile.thumb && (
                    <img src={tile.thumb} alt="" width={24} height={24} style={{ display: 'block', imageRendering: 'pixelated' }} />
                  )}
                </div>
                <span style={{ fontFamily: T.mono, fontSize: 9, opacity: 0.4, width: 10, flexShrink: 0 }}>{idx}</span>
                <span style={{ fontSize: T.fontSize.xs, color: activeTile === idx ? T.textBright : T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tile.label}
                </span>
              </div>
              {/* Inline variant selector */}
              {activeTile === idx && tile.def.frames.length > 1 && (
                <div style={{ paddingLeft: 36, paddingTop: 3, paddingBottom: 3 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {tile.def.frames.map((_, fi) => (
                      <div
                        key={fi}
                        onClick={() => setActiveFrame(fi)}
                        style={{
                          width: 20, height: 20, borderRadius: 3, cursor: 'pointer',
                          border: activeFrame === fi ? `2px solid ${T.accentColor}` : '1px solid rgba(255,255,255,0.1)',
                          overflow: 'hidden', background: '#111',
                        }}
                      >
                        <img
                          src={activeFrameThumbs[fi]}
                          alt="" width={20} height={20}
                          style={{ display: 'block', imageRendering: 'pixelated' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {tiles.length === 0 && (
            <div style={{ fontSize: T.fontSize.xs, color: T.muted, padding: T.sp[3] }}>No sprites in this category</div>
          )}
          {/* Sprite pixel editor */}
          {tiles[activeTile] && (
            <div style={{ borderTop: `1px solid ${T.border}`, marginTop: T.sp[3], paddingTop: T.sp[3] }}>
              <SpriteEditor
                sprites={spriteDefs}
                activeCat={activeCategory}
                activeName={tiles[activeTile].name}
                onUpdate={handleSpriteUpdate}
              />
            </div>
          )}
        </>) : (<>
          {/* Zone definitions panel */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: T.sp[2] }}>
            <div style={{ fontSize: T.fontSize.xs, color: T.text, textTransform: 'uppercase' }}>Zones</div>
            <button
              onClick={() => {
                const usedKeys = new Set(zoneDefs.map(z => z.key))
                const key = 'abcdefghijklmnopqrstuvwxyz'.split('').find(c => !usedKeys.has(c))
                if (!key) return
                setZoneDefs(prev => [...prev, { key, name: 'zone_' + key, color: ZONE_COLORS[prev.length % ZONE_COLORS.length] }])
                setActiveZone(zoneDefs.length)
              }}
              style={{
                background: 'none', border: `1px solid ${T.border}`, borderRadius: T.radius.sm,
                color: T.accentColor, fontSize: T.fontSize.xs, padding: '2px 8px', cursor: 'pointer',
              }}
            >+</button>
          </div>
          {zoneDefs.map((zone, idx) => (
            <div
              key={zone.key}
              onClick={() => setActiveZone(idx)}
              style={{
                display: 'flex', alignItems: 'center', gap: T.sp[2],
                padding: `${T.sp[1]}px ${T.sp[2]}px`,
                borderRadius: T.radius.sm, cursor: 'pointer',
                background: activeZone === idx ? T.elevated : 'transparent',
                border: activeZone === idx ? `1px solid ${zone.color}` : '1px solid transparent',
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                background: zone.color + '80',
                border: `1px solid ${zone.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontFamily: T.mono, color: '#fff', fontWeight: 'bold',
              }}>{zone.key}</div>
              <input
                value={zone.name}
                onChange={e => setZoneDefs(prev => prev.map((z, i) => i === idx ? { ...z, name: e.target.value } : z))}
                onClick={e => e.stopPropagation()}
                style={{
                  flex: 1, background: 'transparent', border: 'none', color: activeZone === idx ? T.textBright : T.text,
                  fontFamily: T.mono, fontSize: T.fontSize.xs, padding: 0, outline: 'none',
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const key = zone.key
                  setZoneDefs(prev => prev.filter((_, i) => i !== idx))
                  if (activeZone >= zoneDefs.length - 1) setActiveZone(Math.max(0, zoneDefs.length - 2))
                  // Clear this zone from all levels
                  setLevels(prev => prev.map(l => {
                    if (!l.zoneGrid) return l
                    const hasZone = l.zoneGrid.some(row => row.includes(key))
                    if (!hasZone) return l
                    return { ...l, zoneGrid: l.zoneGrid.map(row => row.map(c => c === key ? '.' : c)) }
                  }))
                }}
                style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', fontSize: 11, padding: '0 2px' }}
              >x</button>
            </div>
          ))}
          {zoneDefs.length === 0 && (
            <div style={{ fontSize: T.fontSize.xs, color: T.muted, padding: T.sp[3] }}>No zones defined. Click + to add.</div>
          )}
          <div style={{ fontSize: T.fontSize.xs, color: T.muted, marginTop: T.sp[3], lineHeight: 1.6 }}>
            Right-click to erase zone.
          </div>
        </>)}
        <div style={{ marginTop: 'auto', paddingTop: T.sp[4] }}>
          {hoverPos && (
            <div style={{ fontSize: T.fontSize.xs, fontFamily: T.mono, color: T.muted }}>
              {hoverPos.x}, {hoverPos.y}
              {zoneGrid?.[hoverPos.y]?.[hoverPos.x] && zoneGrid[hoverPos.y][hoverPos.x] !== '.' && (
                <span style={{ color: T.accentColor, marginLeft: 6 }}>
                  [{zoneDefs.find(z => z.key === zoneGrid[hoverPos.y][hoverPos.x])?.name || zoneGrid[hoverPos.y][hoverPos.x]}]
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Center: Canvas */}
      <div
        ref={containerRef}
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#000' }}
      >
        <canvas
          ref={canvasRef}
          style={{ cursor: 'crosshair', imageRendering: 'pixelated' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      {/* Right: Controls */}
      <div style={{
        width: 220, borderLeft: `1px solid ${T.border}`,
        padding: T.sp[4], display: 'flex', flexDirection: 'column', gap: T.sp[5],
        overflowY: 'auto', flexShrink: 0,
      }}>
        <Link to={`/play/${slug}`} style={{ fontSize: T.fontSize.xs, color: T.accentColor, textDecoration: 'none', fontFamily: T.mono }}>
          &larr; {slug}
        </Link>

        {/* Levels */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: T.sp[3] }}>
            <div style={{ fontSize: T.fontSize.xs, color: T.text, textTransform: 'uppercase' }}>Levels</div>
            <button
              onClick={addLevel}
              style={{
                background: 'none', border: `1px solid ${T.border}`, borderRadius: T.radius.sm,
                color: T.accentColor, fontSize: T.fontSize.xs, padding: '2px 8px', cursor: 'pointer',
              }}
            >+</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: T.sp[1] }}>
            {levels.map(level => (
              <div
                key={level.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: T.sp[2],
                  padding: `${T.sp[1]}px ${T.sp[2]}px`,
                  borderRadius: T.radius.sm, cursor: 'pointer',
                  background: activeId === level.id ? T.elevated : 'transparent',
                  border: activeId === level.id ? `1px solid ${T.accentColor}` : '1px solid transparent',
                }}
              >
                {renamingId === level.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={finishRename}
                    onKeyDown={e => { if (e.key === 'Enter') finishRename(); if (e.key === 'Escape') setRenamingId(null) }}
                    style={{
                      flex: 1, background: T.surface, border: `1px solid ${T.border}`,
                      borderRadius: T.radius.sm, color: T.textBright, padding: '2px 4px',
                      fontFamily: T.mono, fontSize: T.fontSize.xs,
                    }}
                  />
                ) : (
                  <span
                    onClick={() => setActiveId(level.id)}
                    onDoubleClick={() => !level.source && startRename(level)}
                    style={{
                      flex: 1, fontSize: T.fontSize.xs,
                      color: activeId === level.id ? T.textBright : T.text,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {level.source && <span style={{ color: T.gold, fontSize: 9, marginRight: 4 }}>game</span>}
                    {level.name}
                  </span>
                )}
                <button
                  onClick={() => duplicateLevel(level)}
                  title="Duplicate"
                  style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 11, padding: '0 2px' }}
                >cp</button>
                {levels.length > 1 && (
                  <button
                    onClick={() => deleteLevel(level.id)}
                    title="Delete"
                    style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', fontSize: 11, padding: '0 2px' }}
                  >x</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Size */}
        <div>
          <div style={{ fontSize: T.fontSize.xs, color: T.text, textTransform: 'uppercase', marginBottom: T.sp[3] }}>Size</div>
          <div style={{ display: 'flex', gap: T.sp[3], alignItems: 'center' }}>
            <label style={{ fontSize: T.fontSize.xs, color: T.muted }}>W</label>
            <input type="number" value={cols} onChange={e => handleResize(+e.target.value, rows)} style={inputStyle} />
            <label style={{ fontSize: T.fontSize.xs, color: T.muted }}>H</label>
            <input type="number" value={rows} onChange={e => handleResize(cols, +e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Export */}
        <div>
          <div style={{ fontSize: T.fontSize.xs, color: T.text, textTransform: 'uppercase', marginBottom: T.sp[3] }}>Export</div>
          <Button onClick={handleExport} style={{ width: '100%' }}>
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </Button>
          <Button onClick={handleDownloadJson} style={{ width: '100%', marginTop: T.sp[2] }}>
            Download JSON
          </Button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleUploadJson} style={{ display: 'none' }} />
          <Button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', marginTop: T.sp[2] }}>
            Upload JSON
          </Button>
        </div>

        {/* Import */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ fontSize: T.fontSize.xs, color: T.text, textTransform: 'uppercase', marginBottom: T.sp[3] }}>Import</div>
          <textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder={"Paste map array from data.js..."}
            style={{
              flex: 1, minHeight: 120,
              padding: T.sp[3], background: T.surface,
              border: `1px solid ${T.border}`, borderRadius: T.radius.sm,
              color: T.textBright, fontFamily: T.mono,
              fontSize: 10, lineHeight: 1.4, resize: 'none',
            }}
          />
          <Button onClick={handleImport} style={{ marginTop: T.sp[3], width: '100%' }} disabled={!importText.trim()}>
            Apply
          </Button>
        </div>

        {/* Zones visibility */}
        <label style={{ display: 'flex', alignItems: 'center', gap: T.sp[2], cursor: 'pointer' }}>
          <input type="checkbox" checked={showZones} onChange={e => setShowZones(e.target.checked)} />
          <span style={{ fontSize: T.fontSize.xs, color: T.text }}>Show zones</span>
        </label>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: T.sp[2] }}>
          <Button variant="ghost" onClick={() => { const g = createEmptyGrid(cols, rows); updateLevel(() => ({ grid: g, frameGrid: g.map(r => r.map(() => 0)), zoneGrid: createEmptyZoneGrid(cols, rows) })) }} style={{ width: '100%' }}>Clear all</Button>
        </div>
      </div>
    </div>
  )
}
