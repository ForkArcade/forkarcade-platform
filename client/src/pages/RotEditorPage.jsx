import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { T } from '../theme'
import { gameFileUrl } from '../api'
import { renderSpriteToCanvas, spriteToDataUrl } from '../utils/sprite'
import SpriteEditor from '../editors/SpriteEditor'
import RightPanel from '../editors/RightPanel'
import { useMapSprites } from '../editors/useMapSprites'
import {
  DEFAULT_W, DEFAULT_H, ZONE_COLORS, ROTATIONS,
  createEmptyGrid, createEmptyZoneGrid, uid,
  parseMapsFromDataJs, mapDefsToLevels, computeAutotileFrame, bakeAllAutotiles,
} from '../editors/mapUtils'
import { storageKey } from '../utils/storage'

function loadLevels(slug) {
  try {
    const raw = localStorage.getItem(storageKey.maps(slug))
    if (raw) {
      const data = JSON.parse(raw)
      if (data.levels?.length) {
        data.levels = data.levels.filter(l => l.grid?.length > 0 && l.grid[0]?.length > 0)
        if (data.levels.length > 0) return data
      }
    }
  } catch {}
  return null
}

function saveLevels(slug, data) {
  localStorage.setItem(storageKey.maps(slug), JSON.stringify(data))
}

export default function RotEditorPage({ user }) {
  const { slug } = useParams()
  const canvasRef = useRef(null)
  const offscreenRef = useRef(null)
  const containerRef = useRef(null)
  const levelsSaveRef = useRef(null)
  const mapInitialRef = useRef(true)

  const [hasLocalMapEdits, setHasLocalMapEdits] = useState(() => localStorage.getItem(storageKey.maps(slug)) !== null)

  const [levels, setLevels] = useState(() => {
    const loaded = loadLevels(slug)
    if (loaded) return loaded.levels
    const id = uid()
    return [{ id, name: 'Level 1', grid: createEmptyGrid(DEFAULT_W, DEFAULT_H), objects: [] }]
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

  // Object brush state
  const [objectBrush, setObjectBrush] = useState({ type: '', sprite: '', rot: 0 })
  const [objCategory, setObjCategory] = useState(null)
  const [activeSet, setActiveSet] = useState(null)

  const {
    spriteDefs, setSpriteDefs, hasLocalEdits, resetToPublished,
    categories, tiles, activeCategory, setActiveCategory,
    activeTile, setActiveTile, activeFrame, setActiveFrame,
    handleSpriteUpdate,
  } = useMapSprites(slug)

  const tilesRef = useRef([])
  tilesRef.current = tiles

  // All sprites from all categories for object picker
  const allSprites = useMemo(() => {
    if (!spriteDefs) return []
    const result = []
    for (const [cat, sprites] of Object.entries(spriteDefs)) {
      for (const [name, def] of Object.entries(sprites)) {
        if (!def?.frames) continue
        result.push({
          cat, name, def,
          sprite: `${cat}/${name}`,
          label: name.replace(/_/g, ' '),
          thumb: spriteToDataUrl(def, 24, 0),
        })
      }
    }
    return result
  }, [spriteDefs])

  // Categories for object picker
  const objCategories = useMemo(() => {
    if (!spriteDefs) return []
    return Object.keys(spriteDefs).filter(cat =>
      cat !== 'tiles' && Object.values(spriteDefs[cat]).some(d => d?.frames)
    )
  }, [spriteDefs])

  // Set default objCategory — prefer 'objects' category
  useEffect(() => {
    if (objCategories.length > 0 && !objCategory) {
      setObjCategory(objCategories.includes('objects') ? 'objects' : objCategories[0])
    }
  }, [objCategories, objCategory])

  // Sprites filtered by objCategory
  const objSprites = useMemo(() => {
    if (!objCategory) return allSprites
    return allSprites.filter(s => s.cat === objCategory)
  }, [allSprites, objCategory])

  // Lock tiles mode to 'tiles' category; sets handle sub-grouping
  useEffect(() => {
    if (editMode === 'tiles' && activeCategory !== 'tiles' && categories.includes('tiles')) {
      setActiveCategory('tiles')
    }
  }, [editMode, activeCategory, categories, setActiveCategory])

  // Auto-group tiles into sets by name prefix (e.g. dungeon_* → "dungeon", rest → "surface")
  const tileSets = useMemo(() => {
    if (!tiles.length) return []
    const groups = {}
    tiles.forEach((tile, idx) => {
      const ui = tile.name.indexOf('_')
      const prefix = ui > 0 ? tile.name.slice(0, ui) : '_surface'
      if (!groups[prefix]) groups[prefix] = []
      groups[prefix].push(idx)
    })
    const entries = Object.entries(groups)
    if (entries.length <= 1) return []
    return entries.map(([k, indices]) => ({ key: k === '_surface' ? 'surface' : k, indices }))
  }, [tiles])

  // Default to first set when sets change
  useEffect(() => {
    if (tileSets.length > 0 && (!activeSet || !tileSets.some(s => s.key === activeSet))) {
      setActiveSet(tileSets[0].key)
    }
  }, [tileSets, activeSet])

  // Visible tile indices filtered by active set
  const visibleTileIndices = useMemo(() => {
    if (tileSets.length === 0) return tiles.map((_, i) => i)
    const set = tileSets.find(s => s.key === activeSet)
    return set ? set.indices : tiles.map((_, i) => i)
  }, [tiles, tileSets, activeSet])

  // Rebake autotile frames when tile defs change
  useEffect(() => {
    if (tiles.length === 0) return
    setLevels(prev => {
      let changed = false
      const next = prev.map(level => {
        if (!level.grid?.length) return level
        const baked = bakeAllAutotiles(level.grid, level.frameGrid, tiles)
        const old = level.frameGrid
        if (old && old.length === baked.length && old.every((row, y) => {
          const bakedRow = baked[y]
          return bakedRow && row.length === bakedRow.length && row.every((v, x) => v === bakedRow[x])
        })) return level
        changed = true
        return { ...level, frameGrid: baked }
      })
      return changed ? next : prev
    })
  }, [tiles])

  // Fetch game maps: try _maps.json first, fall back to data.js
  useEffect(() => {
    fetch(gameFileUrl(slug, '_maps.json'))
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && Object.keys(data).length > 0) {
          const { levels: gameLevels, zoneDefs: gameZoneDefs } = mapDefsToLevels(data)
          if (gameLevels.length > 0) {
            if (gameZoneDefs.length > 0) {
              setZoneDefs(prev => {
                const existingKeys = new Set(prev.map(z => z.key))
                const newDefs = gameZoneDefs.filter(z => !existingKeys.has(z.key))
                return newDefs.length > 0 ? [...prev, ...newDefs] : prev
              })
            }
            setLevels(prev => {
              if (prev.some(l => l.source === 'game')) return prev
              const curTiles = tilesRef.current
              const withFrames = gameLevels.map(l => ({
                ...l,
                frameGrid: curTiles.length > 0 ? bakeAllAutotiles(l.grid, null, curTiles) : l.grid.map(r => r.map(() => 0)),
              }))
              setActiveId(withFrames[0].id)
              return [...withFrames, ...prev]
            })
            return
          }
        }
        // Fall back to data.js parsing (legacy)
        return fetch(gameFileUrl(slug, 'data.js'))
          .then(r => r.ok ? r.text() : null)
          .then(text => {
            if (!text) return
            const gameMaps = parseMapsFromDataJs(text)
            if (gameMaps.length === 0) return
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
                objects: [],
                source: 'game',
              }))
              setActiveId(gameLevels[0].id)
              return [...gameLevels, ...prev]
            })
          })
      })
      .catch(() => {})
  }, [slug])

  const resetMaps = useCallback(() => {
    localStorage.removeItem(storageKey.maps(slug))
    setHasLocalMapEdits(false)
    mapInitialRef.current = true
    const emptyLevel = () => {
      const id = uid()
      setLevels([{ id, name: 'Level 1', grid: createEmptyGrid(DEFAULT_W, DEFAULT_H), frameGrid: createEmptyGrid(DEFAULT_W, DEFAULT_H).map(r => r.map(() => 0)), zoneGrid: createEmptyZoneGrid(DEFAULT_W, DEFAULT_H), objects: [] }])
      setActiveId(id)
      setZoneDefs([])
    }
    fetch(gameFileUrl(slug, '_maps.json'))
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && Object.keys(data).length > 0) {
          const { levels: gameLevels, zoneDefs: gameZoneDefs } = mapDefsToLevels(data)
          if (gameLevels.length > 0) {
            setZoneDefs(gameZoneDefs)
            const curTiles = tilesRef.current
            const withFrames = gameLevels.map(l => ({
              ...l,
              frameGrid: curTiles.length > 0 ? bakeAllAutotiles(l.grid, null, curTiles) : l.grid.map(r => r.map(() => 0)),
            }))
            setLevels(withFrames)
            setActiveId(withFrames[0].id)
            return
          }
        }
        // Fall back to data.js
        return fetch(gameFileUrl(slug, 'data.js'))
          .then(r => r.ok ? r.text() : null)
          .then(text => {
            if (!text) { emptyLevel(); return }
            const gameMaps = parseMapsFromDataJs(text)
            if (gameMaps.length === 0) { emptyLevel(); return }
            const allZoneDefs = gameMaps.flatMap(m => m.zoneDefs || [])
            setZoneDefs(allZoneDefs)
            const curTiles = tilesRef.current
            const gameLevels = gameMaps.map(m => ({
              id: `game-${m.name}`, name: m.name, grid: m.grid,
              frameGrid: curTiles.length > 0 ? bakeAllAutotiles(m.grid, null, curTiles) : m.grid.map(r => r.map(() => 0)),
              zoneGrid: m.zoneGrid || createEmptyZoneGrid(m.grid[0]?.length || DEFAULT_W, m.grid.length || DEFAULT_H),
              objects: [], source: 'game',
            }))
            setLevels(gameLevels)
            setActiveId(gameLevels[0].id)
          })
      })
      .catch(() => emptyLevel())
  }, [slug])

  const [isPainting, setIsPainting] = useState(false)
  const [hoverPos, setHoverPos] = useState(null)
  const [cellSize, setCellSize] = useState(20)

  const activeLevel = levels.find(l => l.id === activeId) || levels[0]
  const grid = activeLevel?.grid || createEmptyGrid(DEFAULT_W, DEFAULT_H)
  const frameGrid = activeLevel?.frameGrid
  const zoneGrid = activeLevel?.zoneGrid
  const objects = activeLevel?.objects || []
  const cols = grid[0]?.length || DEFAULT_W
  const rows = grid.length || DEFAULT_H

  // Debounced save levels to localStorage
  useEffect(() => {
    if (mapInitialRef.current) { mapInitialRef.current = false; return }
    clearTimeout(levelsSaveRef.current)
    levelsSaveRef.current = setTimeout(() => {
      saveLevels(slug, { levels, activeId, zoneDefs })
      setHasLocalMapEdits(true)
    }, 300)
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

  // Render sprites to offscreen canvas (incremental)
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
          if (tid === (prev.grid[y]?.[x] ?? 0) && fid === (prev.fg?.[y]?.[x] ?? 0)) continue
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

  // Blit offscreen + grid lines + objects + zones + hover
  useEffect(() => {
    const canvas = canvasRef.current
    const off = offscreenRef.current
    if (!canvas || !off || !off.width) return
    const w = off.width, h = off.height
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(off, 0, 0)
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
          ctx.fillStyle = color + '4d'
          ctx.fillRect(px, py, cellSize, cellSize)
          ctx.fillStyle = color
          ctx.fillText(zk, px + cellSize / 2, py + cellSize / 2)
        }
      }
    }
    // Objects overlay
    for (const obj of objects) {
      const px = obj.x * cellSize, py = obj.y * cellSize
      const [cat, name] = (obj.sprite || '').split('/')
      const def = spriteDefs?.[cat]?.[name]
      if (def) {
        ctx.save()
        const cx = px + cellSize / 2, cy = py + cellSize / 2
        ctx.translate(cx, cy)
        ctx.rotate((obj.rot || 0) * Math.PI / 2)
        renderSpriteToCanvas(ctx, def, 0, -cellSize / 2, -cellSize / 2, cellSize)
        ctx.restore()
      } else {
        ctx.fillStyle = '#f808'
        ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4)
      }
      // Rotation indicator: small triangle
      if (obj.rot) {
        ctx.save()
        ctx.translate(px + cellSize / 2, py + cellSize / 2)
        ctx.rotate((obj.rot || 0) * Math.PI / 2)
        ctx.fillStyle = '#fff8'
        ctx.beginPath()
        ctx.moveTo(0, -cellSize / 2 + 1)
        ctx.lineTo(-3, -cellSize / 2 + 5)
        ctx.lineTo(3, -cellSize / 2 + 5)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
      // Object highlight in objects mode
      if (editMode === 'objects') {
        ctx.strokeStyle = '#f808'
        ctx.lineWidth = 1
        ctx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1)
      }
    }
    // Player start marker
    if (activeLevel?.playerStart) {
      const ps = activeLevel.playerStart
      const px = ps.x * cellSize, py = ps.y * cellSize
      ctx.strokeStyle = '#0f0'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(px + cellSize / 2, py + 3)
      ctx.lineTo(px + cellSize / 2, py + cellSize - 3)
      ctx.moveTo(px + 3, py + cellSize / 2)
      ctx.lineTo(px + cellSize - 3, py + cellSize / 2)
      ctx.stroke()
    }
    // Hover
    if (hoverPos && hoverPos.x >= 0 && hoverPos.x < cols && hoverPos.y >= 0 && hoverPos.y < rows) {
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.strokeRect(hoverPos.x * cellSize + 1, hoverPos.y * cellSize + 1, cellSize - 2, cellSize - 2)
    }
  }, [mapVersion, hoverPos, cellSize, cols, rows, showZones, zoneGrid, zoneDefs, objects, spriteDefs, editMode, activeLevel?.playerStart])

  // Keyboard: 0-9 to select tile
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return
      if (editMode !== 'tiles') return
      const n = parseInt(e.key)
      if (!isNaN(n) && n < tiles.length) { setActiveTile(n); setActiveFrame(0) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [tiles.length, setActiveTile, setActiveFrame, editMode])

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
      const isAutotile = tiles[activeTile]?.def?.frames?.length >= 16
      if (level.grid[pos.y][pos.x] === activeTile && (isAutotile || fg[pos.y][pos.x] === activeFrame)) return {}
      const nextGrid = level.grid.map(row => [...row])
      const nextFg = fg.map(row => [...row])
      nextGrid[pos.y][pos.x] = activeTile
      nextFg[pos.y][pos.x] = isAutotile
        ? computeAutotileFrame(nextGrid, pos.x, pos.y, activeTile)
        : activeFrame
      for (const [dy, dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const ny = pos.y + dy, nx = pos.x + dx
        if (ny < 0 || ny >= nextGrid.length || nx < 0 || nx >= (nextGrid[0]?.length || 0)) continue
        const nTid = nextGrid[ny][nx]
        if (tiles[nTid]?.def?.frames?.length >= 16) {
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

  const placeObjectAt = useCallback((pos) => {
    if (!pos || !objectBrush.sprite) return
    updateLevel(level => {
      const objs = [...(level.objects || [])]
      const idx = objs.findIndex(o => o.x === pos.x && o.y === pos.y)
      const newObj = { x: pos.x, y: pos.y, type: objectBrush.type || objectBrush.sprite.split('/')[1], sprite: objectBrush.sprite, rot: objectBrush.rot }
      if (idx >= 0) objs[idx] = newObj
      else objs.push(newObj)
      return { objects: objs }
    })
  }, [objectBrush, updateLevel])

  const removeObjectAt = useCallback((pos) => {
    if (!pos) return
    updateLevel(level => {
      const objs = (level.objects || []).filter(o => !(o.x === pos.x && o.y === pos.y))
      if (objs.length === (level.objects || []).length) return {}
      return { objects: objs }
    })
  }, [updateLevel])

  const handleMouseDown = (e) => {
    e.preventDefault()
    if (editMode === 'objects') {
      const pos = getGridPos(e)
      if (e.button === 2) removeObjectAt(pos)
      else placeObjectAt(pos)
    } else if (editMode === 'zones') {
      setIsPainting(true)
      paintZoneAt(getGridPos(e), e.button === 2)
    } else {
      setIsPainting(true)
      paintAt(getGridPos(e))
    }
  }
  const handleMouseMove = (e) => {
    const pos = getGridPos(e)
    setHoverPos(prev => (prev && pos && prev.x === pos.x && prev.y === pos.y) ? prev : pos)
    if (isPainting) {
      if (editMode === 'zones') paintZoneAt(pos, e.buttons === 2)
      else if (editMode === 'tiles') paintAt(pos)
      // No drag for objects
    }
  }
  const handleMouseLeave = () => setHoverPos(null)

  // Object at hover position (for status bar)
  const hoverObj = hoverPos ? objects.find(o => o.x === hoverPos.x && o.y === hoverPos.y) : null

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* Left Panel: Tiles/Zones/Objects + Sprite Editor */}
      <div style={{
        width: 260, borderRight: `1px solid ${T.border}`,
        padding: T.sp[4], display: 'flex', flexDirection: 'column', gap: T.sp[1],
        overflowY: 'auto', flexShrink: 0,
      }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: T.sp[1], marginBottom: T.sp[3] }}>
          {['tiles', 'zones', 'objects'].map(mode => (
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
              {mode === 'objects' ? 'obj' : mode}
            </button>
          ))}
        </div>

        {editMode === 'tiles' ? (<>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: T.sp[2] }}>
            <span style={{ fontSize: T.fontSize.xs, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              tiles
            </span>
            {hasLocalEdits && (
              <button
                onClick={resetToPublished}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: 9, fontFamily: T.mono, color: T.warning ?? '#ffb74d',
                  textTransform: 'uppercase', letterSpacing: '0.03em',
                  padding: '1px 4px', borderRadius: T.radius.sm,
                }}
                title="Discard local edits and reload published sprites"
              >
                local edits · reset
              </button>
            )}
          </div>
          {tileSets.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: T.sp[1], marginBottom: T.sp[3] }}>
              {tileSets.map(s => (
                <button
                  key={s.key}
                  onClick={() => { setActiveSet(s.key); setActiveTile(0); setActiveFrame(0) }}
                  style={{
                    background: activeSet === s.key ? T.accentColor : 'transparent',
                    color: activeSet === s.key ? '#000' : T.text,
                    border: `1px solid ${activeSet === s.key ? T.accentColor : T.border}`,
                    borderRadius: T.radius.sm, padding: '2px 6px',
                    fontSize: 9, fontFamily: T.mono, cursor: 'pointer',
                    textTransform: 'uppercase', letterSpacing: '0.03em',
                  }}
                >
                  {s.key}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: T.border, borderRadius: T.radius.sm, overflow: 'hidden' }}>
            {visibleTileIndices.map(idx => {
              const tile = tiles[idx]
              return (
              <div
                key={tile.name}
                onClick={() => { setActiveTile(idx); setActiveFrame(0) }}
                title={tile.label}
                style={{
                  cursor: 'pointer',
                  background: activeTile === idx ? T.elevated : '#111',
                  outline: activeTile === idx ? `2px solid ${T.accentColor}` : 'none',
                  outlineOffset: -2, overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                }}
              >
                <div style={{ aspectRatio: '1', width: '100%', overflow: 'hidden' }}>
                  {tile.thumb && (
                    <img src={tile.thumb} alt="" width="100%" height="100%" style={{ display: 'block', imageRendering: 'pixelated' }} />
                  )}
                </div>
                <div style={{ fontSize: 7, fontFamily: T.mono, color: activeTile === idx ? T.textBright : T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center', padding: '1px 2px' }}>
                  {tile.label}
                </div>
              </div>
              )
            })}
          </div>
          {visibleTileIndices.length === 0 && (
            <div style={{ fontSize: T.fontSize.xs, color: T.muted, padding: T.sp[3] }}>No sprites in this category</div>
          )}
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
        </>) : editMode === 'zones' ? (<>
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
        </>) : (<>
          {/* Objects panel */}
          {objCategories.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: T.sp[1], marginBottom: T.sp[3] }}>
              {objCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setObjCategory(cat)}
                  style={{
                    background: objCategory === cat ? T.accentColor : 'transparent',
                    color: objCategory === cat ? '#000' : T.text,
                    border: `1px solid ${objCategory === cat ? T.accentColor : T.border}`,
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: T.border, borderRadius: T.radius.sm, overflow: 'hidden' }}>
            {objSprites.map(s => (
              <div
                key={s.sprite}
                onClick={() => setObjectBrush(prev => ({ ...prev, sprite: s.sprite, type: s.name }))}
                title={s.label}
                style={{
                  cursor: 'pointer',
                  background: objectBrush.sprite === s.sprite ? T.elevated : '#111',
                  outline: objectBrush.sprite === s.sprite ? `2px solid ${T.accentColor}` : 'none',
                  outlineOffset: -2, overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                }}
              >
                <div style={{ aspectRatio: '1', width: '100%', overflow: 'hidden' }}>
                  {s.thumb && (
                    <img src={s.thumb} alt="" width="100%" height="100%" style={{ display: 'block', imageRendering: 'pixelated' }} />
                  )}
                </div>
                <div style={{ fontSize: 7, fontFamily: T.mono, color: objectBrush.sprite === s.sprite ? T.textBright : T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center', padding: '1px 2px' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          {objSprites.length === 0 && (
            <div style={{ fontSize: T.fontSize.xs, color: T.muted, padding: T.sp[3] }}>No sprites available</div>
          )}
          {/* Rotation */}
          <div style={{ marginTop: T.sp[3] }}>
            <div style={{ fontSize: T.fontSize.xs, color: T.text, textTransform: 'uppercase', marginBottom: T.sp[2] }}>Rotation</div>
            <div style={{ display: 'flex', gap: T.sp[1] }}>
              {ROTATIONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setObjectBrush(prev => ({ ...prev, rot: r.value }))}
                  style={{
                    flex: 1,
                    background: objectBrush.rot === r.value ? T.accentColor : 'transparent',
                    color: objectBrush.rot === r.value ? '#000' : T.text,
                    border: `1px solid ${objectBrush.rot === r.value ? T.accentColor : T.border}`,
                    borderRadius: T.radius.sm, padding: '3px 0',
                    fontSize: 10, fontFamily: T.mono, cursor: 'pointer',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {/* Type override */}
          <div style={{ marginTop: T.sp[3] }}>
            <div style={{ fontSize: T.fontSize.xs, color: T.text, textTransform: 'uppercase', marginBottom: T.sp[2] }}>Type</div>
            <input
              value={objectBrush.type}
              onChange={e => setObjectBrush(prev => ({ ...prev, type: e.target.value }))}
              style={{
                width: '100%', padding: `${T.sp[2]}px ${T.sp[3]}px`,
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: T.radius.sm, color: T.textBright,
                fontFamily: T.mono, fontSize: T.fontSize.xs,
                boxSizing: 'border-box',
              }}
            />
          </div>
          {/* Player start */}
          <div style={{ marginTop: T.sp[3] }}>
            <button
              onClick={() => {
                if (hoverPos) updateLevel(() => ({ playerStart: { x: hoverPos.x, y: hoverPos.y } }))
              }}
              style={{
                width: '100%',
                background: 'transparent',
                border: `1px solid ${T.border}`,
                borderRadius: T.radius.sm,
                color: '#0f0',
                fontSize: T.fontSize.xs,
                fontFamily: T.mono,
                padding: '4px 0',
                cursor: 'pointer',
              }}
            >
              Set player start at cursor
            </button>
            {activeLevel?.playerStart && (
              <div style={{ fontSize: 9, color: T.muted, marginTop: T.sp[1], fontFamily: T.mono }}>
                Start: {activeLevel.playerStart.x}, {activeLevel.playerStart.y}
              </div>
            )}
          </div>
          {/* Object count */}
          <div style={{ fontSize: T.fontSize.xs, color: T.muted, marginTop: T.sp[3] }}>
            {objects.length} object{objects.length !== 1 ? 's' : ''} on this level
          </div>
          <div style={{ fontSize: T.fontSize.xs, color: T.muted, lineHeight: 1.6 }}>
            Click to place. Right-click to remove.
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
              {hoverObj && (
                <span style={{ color: '#f80', marginLeft: 6 }}>
                  {hoverObj.type}
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
      <RightPanel
        slug={slug}
        user={user}
        levels={levels}
        setLevels={setLevels}
        activeId={activeId}
        setActiveId={setActiveId}
        activeLevel={activeLevel}
        grid={grid}
        zoneGrid={zoneGrid}
        zoneDefs={zoneDefs}
        setZoneDefs={setZoneDefs}
        cols={cols}
        rows={rows}
        updateLevel={updateLevel}
        tiles={tiles}
        spriteDefs={spriteDefs}
        setSpriteDefs={setSpriteDefs}
        showZones={showZones}
        setShowZones={setShowZones}
        hasLocalMapEdits={hasLocalMapEdits}
        resetMaps={resetMaps}
      />
    </div>
  )
}
