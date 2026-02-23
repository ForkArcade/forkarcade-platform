import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { T } from '../theme'
import { gameFileUrl } from '../api'
import { spriteToDataUrl } from '../utils/sprite'
import SpriteEditor from './SpriteEditor'
import SoundPanel from './SoundPanel'
import RightPanel from './RightPanel'
import { useMapSprites } from './useMapSprites'
import { useMapCanvas } from './useMapCanvas'
import {
  DEFAULT_W, DEFAULT_H, ZONE_COLORS,
  createEmptyGrid, createEmptyZoneGrid, uid,
  parseMapsFromDataJs, mapDefsToLevels, computeAutotileFrame,
  resolveTiling, bakeAllAutotiles, bakeFrameGrid, mergeZoneDefs,
} from './mapUtils'
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
  } catch (e) { console.warn('Failed to parse cached maps:', e.message) }
  return null
}

function saveLevels(slug, data) {
  localStorage.setItem(storageKey.maps(slug), JSON.stringify(data))
}

export default function RotEditorPage({ user }) {
  const { slug } = useParams()
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const levelsSaveRef = useRef(null)
  const mapInitialRef = useRef(true)

  const [hasLocalMapEdits, setHasLocalMapEdits] = useState(() => localStorage.getItem(storageKey.maps(slug)) !== null)

  const [levels, setLevels] = useState(() => {
    const loaded = loadLevels(slug)
    if (loaded) return loaded.levels
    return [{ id: uid(), name: 'Level 1', grid: createEmptyGrid(DEFAULT_W, DEFAULT_H), objects: [] }]
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

  // Sound definitions loaded from _narrative.json
  const [soundDefs, setSoundDefs] = useState(null)
  useEffect(() => {
    fetch(gameFileUrl(slug, '_narrative.json'))
      .then(r => r.json())
      .then(d => { if (d.sounds) setSoundDefs(d.sounds) })
      .catch(e => console.warn('Failed to load sounds:', e.message))
  }, [slug])

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

  // Sprite update handler for objects/player (non-tile sprites)
  const handleObjSpriteUpdate = useCallback((mutator) => {
    const parts = objectBrush.sprite?.split('/')
    if (!parts || parts.length < 2) return
    const [cat, name] = parts
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
  }, [objectBrush.sprite, setSpriteDefs])

  const tilesRef = useRef([])
  tilesRef.current = tiles

  // All sprites from all categories for object picker
  const allSprites = useMemo(() => {
    if (!spriteDefs) return []
    const result = []
    for (const [cat, sprites] of Object.entries(spriteDefs).filter(([c]) => c !== 'tiles')) {
      for (const [name, def] of Object.entries(sprites)) {
        if (!def?.frames) continue
        result.push({ cat, name, def, sprite: `${cat}/${name}`, label: name.replace(/_/g, ' '), thumb: spriteToDataUrl(def, 24, 0) })
      }
    }
    return result
  }, [spriteDefs])

  // Categories for object picker
  const objCategories = useMemo(() => {
    if (!spriteDefs) return []
    return Object.keys(spriteDefs).filter(cat => cat !== 'tiles' && Object.values(spriteDefs[cat]).some(d => d?.frames))
  }, [spriteDefs])

  useEffect(() => {
    if (objCategories.length > 0 && (!objCategory || !objCategories.includes(objCategory)))
      setObjCategory(objCategories.includes('objects') ? 'objects' : objCategories[0])
  }, [objCategories, objCategory])

  const objSprites = useMemo(() => {
    if (!objCategory) return allSprites
    return allSprites.filter(s => s.cat === objCategory)
  }, [allSprites, objCategory])

  useEffect(() => {
    if (editMode === 'tiles' && activeCategory !== 'tiles' && categories.includes('tiles'))
      setActiveCategory('tiles')
  }, [editMode, activeCategory, categories, setActiveCategory])

  // Auto-group tiles into sets by name prefix
  const tileSets = useMemo(() => {
    if (!tiles.length) return []
    const groups = {}
    tiles.forEach((tile, idx) => {
      const ui = tile.name.indexOf('_')
      const prefix = ui > 0 ? tile.name.slice(0, ui) : '_surface'
      ;(groups[prefix] ??= []).push(idx)
    })
    const entries = Object.entries(groups)
    if (entries.length <= 1) return []
    return entries.map(([k, indices]) => ({ key: k === '_surface' ? 'surface' : k, indices }))
  }, [tiles])

  useEffect(() => {
    if (tileSets.length > 0 && (!activeSet || !tileSets.some(s => s.key === activeSet)))
      setActiveSet(tileSets[0].key)
  }, [tileSets, activeSet])

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

  // Fetch game maps
  const fetchGameMaps = useCallback((mode) => {
    const curTiles = tilesRef.current
    const prepareLevels = (gameLevels) => gameLevels.map(l => ({
      ...l,
      frameGrid: bakeFrameGrid(l.grid, curTiles),
      zoneGrid: l.zoneGrid || createEmptyZoneGrid(l.grid[0]?.length || DEFAULT_W, l.grid.length || DEFAULT_H),
      objects: l.objects || [], source: l.source || 'game',
    }))
    const applyLevels = (gameLevels, gameZoneDefs) => {
      const prepared = prepareLevels(gameLevels)
      if (mode === 'replace') { setZoneDefs(gameZoneDefs); setLevels(prepared) }
      else {
        if (gameZoneDefs.length > 0) setZoneDefs(prev => mergeZoneDefs(prev, gameZoneDefs))
        setLevels(prev => prev.some(l => l.source === 'game') ? prev : [...prepared, ...prev])
      }
      setActiveId(prepared[0].id)
    }
    const emptyLevel = () => {
      const id = uid()
      setLevels([{ id, name: 'Level 1', grid: createEmptyGrid(DEFAULT_W, DEFAULT_H), frameGrid: createEmptyGrid(DEFAULT_W, DEFAULT_H).map(r => r.map(() => 0)), zoneGrid: createEmptyZoneGrid(DEFAULT_W, DEFAULT_H), objects: [] }])
      setActiveId(id); setZoneDefs([])
    }
    fetch(gameFileUrl(slug, '_maps.json'))
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && Object.keys(data).length > 0) {
          const { levels: gameLevels, zoneDefs: gameZoneDefs } = mapDefsToLevels(data)
          if (gameLevels.length > 0) { applyLevels(gameLevels, gameZoneDefs); return }
        }
        return fetch(gameFileUrl(slug, 'data.js'))
          .then(r => r.ok ? r.text() : null)
          .then(text => {
            if (!text) { if (mode === 'replace') emptyLevel(); return }
            const gameMaps = parseMapsFromDataJs(text)
            if (gameMaps.length === 0) { if (mode === 'replace') emptyLevel(); return }
            const allZoneDefs = gameMaps.flatMap(m => m.zoneDefs || [])
            const gameLevels = gameMaps.map(m => ({ id: `game-${m.name}`, name: m.name, grid: m.grid, zoneGrid: m.zoneGrid, source: 'game' }))
            applyLevels(gameLevels, allZoneDefs)
          })
      })
      .catch(() => { if (mode === 'replace') emptyLevel() })
  }, [slug])

  useEffect(() => { fetchGameMaps('merge') }, [slug])

  const resetMaps = useCallback(() => {
    localStorage.removeItem(storageKey.maps(slug))
    setHasLocalMapEdits(false); mapInitialRef.current = true
    fetchGameMaps('replace')
  }, [slug, fetchGameMaps])

  const [isPainting, setIsPainting] = useState(false)
  const [hoverPos, setHoverPos] = useState(null)

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

  // Canvas rendering (extracted hook)
  const cellSize = useMapCanvas({
    canvasRef, containerRef, grid, frameGrid, tiles, cols, rows,
    showZones, zoneGrid, zoneDefs, objects, spriteDefs,
    editMode, playerStart: activeLevel?.playerStart, soundDefs, hoverPos,
  })

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
      const tileDef = tiles[activeTile]?.def
      const tiling = resolveTiling(tileDef)
      if (level.grid[pos.y][pos.x] === activeTile && (tiling || fg[pos.y][pos.x] === activeFrame)) return {}
      const nextGrid = level.grid.map(row => [...row])
      const nextFg = fg.map(row => [...row])
      nextGrid[pos.y][pos.x] = activeTile
      if (tiling === 'autotile') nextFg[pos.y][pos.x] = computeAutotileFrame(nextGrid, pos.x, pos.y, activeTile)
      else if (tiling === 'checker') nextFg[pos.y][pos.x] = (pos.x + pos.y) % (tileDef?.frames?.length || 1)
      else nextFg[pos.y][pos.x] = activeFrame
      for (const [dy, dx] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]) {
        const ny = pos.y + dy, nx = pos.x + dx
        if (ny < 0 || ny >= nextGrid.length || nx < 0 || nx >= (nextGrid[0]?.length || 0)) continue
        const nTid = nextGrid[ny][nx]
        if (resolveTiling(tiles[nTid]?.def) === 'autotile')
          nextFg[ny][nx] = computeAutotileFrame(nextGrid, nx, ny, nTid)
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
      if (idx >= 0) objs[idx] = newObj; else objs.push(newObj)
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
      if (e.button === 2) removeObjectAt(pos); else placeObjectAt(pos)
    } else if (editMode === 'zones') {
      setIsPainting(true); paintZoneAt(getGridPos(e), e.button === 2)
    } else {
      setIsPainting(true); paintAt(getGridPos(e))
    }
  }
  const handleMouseMove = (e) => {
    const pos = getGridPos(e)
    setHoverPos(prev => (prev && pos && prev.x === pos.x && prev.y === pos.y) ? prev : pos)
    if (isPainting) {
      if (editMode === 'zones') paintZoneAt(pos, e.buttons === 2)
      else if (editMode === 'tiles') paintAt(pos)
    }
  }

  const hoverObj = hoverPos ? objects.find(o => o.x === hoverPos.x && o.y === hoverPos.y) : null

  // Shared chip button style
  const chipStyle = (active) => ({
    background: active ? T.accentColor : 'transparent',
    color: active ? '#000' : T.text,
    border: `1px solid ${active ? T.accentColor : T.border}`,
    borderRadius: T.radius.sm, padding: '2px 6px',
    fontSize: 9, fontFamily: T.mono, cursor: 'pointer',
    textTransform: 'uppercase', letterSpacing: '0.03em',
  })

  // Shared sprite grid item style
  const gridItemStyle = (active) => ({
    cursor: 'pointer',
    background: active ? T.elevated : '#111',
    outline: active ? `2px solid ${T.accentColor}` : 'none',
    outlineOffset: -2, overflow: 'hidden',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  })

  const gridItemLabel = (active) => ({
    fontSize: 7, fontFamily: T.mono, color: active ? T.textBright : T.muted,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    width: '100%', textAlign: 'center', padding: '1px 2px',
  })

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* Left Panel */}
      <div style={{
        width: 260, borderRight: `1px solid ${T.border}`,
        padding: T.sp[4], display: 'flex', flexDirection: 'column', gap: T.sp[1],
        overflowY: 'auto', flexShrink: 0,
      }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: T.sp[1], marginBottom: T.sp[3] }}>
          {['tiles', 'zones', 'objects', 'sounds'].map(mode => (
            <button key={mode} onClick={() => setEditMode(mode)}
              style={{ ...chipStyle(editMode === mode), flex: 1, padding: '4px 0', letterSpacing: '0.05em', fontSize: 10 }}>
              {mode === 'objects' ? 'obj' : mode === 'sounds' ? 'snd' : mode}
            </button>
          ))}
        </div>

        {editMode === 'tiles' ? (<>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: T.sp[2] }}>
            <span style={{ fontSize: T.fontSize.xs, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>tiles</span>
            {hasLocalEdits && (
              <button onClick={resetToPublished}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 9, fontFamily: T.mono, color: T.warning ?? '#ffb74d', textTransform: 'uppercase', letterSpacing: '0.03em', padding: '1px 4px', borderRadius: T.radius.sm }}
                title="Discard local edits and reload published sprites">local edits · reset</button>
            )}
          </div>
          {tileSets.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: T.sp[1], marginBottom: T.sp[3] }}>
              {tileSets.map(s => (
                <button key={s.key} onClick={() => { setActiveSet(s.key); setActiveTile(0); setActiveFrame(0) }}
                  style={chipStyle(activeSet === s.key)}>{s.key}</button>
              ))}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: T.border, borderRadius: T.radius.sm, overflow: 'hidden' }}>
            {visibleTileIndices.map(idx => {
              const tile = tiles[idx]
              return (
                <div key={tile.name} onClick={() => { setActiveTile(idx); setActiveFrame(0) }} title={tile.label} style={gridItemStyle(activeTile === idx)}>
                  <div style={{ aspectRatio: '1', width: '100%', overflow: 'hidden' }}>
                    {tile.thumb && <img src={tile.thumb} alt="" width="100%" height="100%" style={{ display: 'block', imageRendering: 'pixelated' }} />}
                  </div>
                  <div style={gridItemLabel(activeTile === idx)}>{tile.label}</div>
                </div>
              )
            })}
          </div>
          {visibleTileIndices.length === 0 && <div style={{ fontSize: T.fontSize.xs, color: T.muted, padding: T.sp[3] }}>No sprites in this category</div>}
          {tiles[activeTile] && (
            <div style={{ borderTop: `1px solid ${T.border}`, marginTop: T.sp[3], paddingTop: T.sp[3] }}>
              <SpriteEditor sprites={spriteDefs} activeCat={activeCategory} activeName={tiles[activeTile].name} onUpdate={handleSpriteUpdate} />
            </div>
          )}
        </>) : editMode === 'zones' ? (<>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: T.sp[2] }}>
            <div style={{ fontSize: T.fontSize.xs, color: T.text, textTransform: 'uppercase' }}>Zones</div>
            <button onClick={() => {
              const usedKeys = new Set(zoneDefs.map(z => z.key))
              const key = 'abcdefghijklmnopqrstuvwxyz'.split('').find(c => !usedKeys.has(c))
              if (!key) return
              setZoneDefs(prev => [...prev, { key, name: 'zone_' + key, color: ZONE_COLORS[prev.length % ZONE_COLORS.length] }])
              setActiveZone(zoneDefs.length)
            }} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: T.radius.sm, color: T.accentColor, fontSize: T.fontSize.xs, padding: '2px 8px', cursor: 'pointer' }}>+</button>
          </div>
          {zoneDefs.map((zone, idx) => (
            <div key={zone.key} onClick={() => setActiveZone(idx)} style={{
              display: 'flex', alignItems: 'center', gap: T.sp[2],
              padding: `${T.sp[1]}px ${T.sp[2]}px`, borderRadius: T.radius.sm, cursor: 'pointer',
              background: activeZone === idx ? T.elevated : 'transparent',
              border: activeZone === idx ? `1px solid ${zone.color}` : '1px solid transparent',
            }}>
              <div style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, background: zone.color + '80', border: `1px solid ${zone.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontFamily: T.mono, color: '#fff', fontWeight: 'bold' }}>{zone.key}</div>
              <input value={zone.name} onChange={e => setZoneDefs(prev => prev.map((z, i) => i === idx ? { ...z, name: e.target.value } : z))} onClick={e => e.stopPropagation()}
                style={{ flex: 1, background: 'transparent', border: 'none', color: activeZone === idx ? T.textBright : T.text, fontFamily: T.mono, fontSize: T.fontSize.xs, padding: 0, outline: 'none' }} />
              <button onClick={(e) => {
                e.stopPropagation()
                const k = zone.key
                setZoneDefs(prev => prev.filter((_, i) => i !== idx))
                if (activeZone >= zoneDefs.length - 1) setActiveZone(Math.max(0, zoneDefs.length - 2))
                setLevels(prev => prev.map(l => {
                  if (!l.zoneGrid) return l
                  if (!l.zoneGrid.some(row => row.includes(k))) return l
                  return { ...l, zoneGrid: l.zoneGrid.map(row => row.map(c => c === k ? '.' : c)) }
                }))
              }} style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>x</button>
            </div>
          ))}
          {zoneDefs.length === 0 && <div style={{ fontSize: T.fontSize.xs, color: T.muted, padding: T.sp[3] }}>No zones defined. Click + to add.</div>}
          <div style={{ fontSize: T.fontSize.xs, color: T.muted, marginTop: T.sp[3], lineHeight: 1.6 }}>Right-click to erase zone.</div>
        </>) : editMode === 'objects' ? (<>
          {objCategories.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: T.sp[1], marginBottom: T.sp[3] }}>
              {objCategories.map(cat => <button key={cat} onClick={() => setObjCategory(cat)} style={chipStyle(objCategory === cat)}>{cat}</button>)}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: T.border, borderRadius: T.radius.sm, overflow: 'hidden' }}>
            {objSprites.map(s => (
              <div key={s.sprite} onClick={() => setObjectBrush(prev => ({ ...prev, sprite: s.sprite, type: s.name }))} title={s.label} style={gridItemStyle(objectBrush.sprite === s.sprite)}>
                <div style={{ aspectRatio: '1', width: '100%', overflow: 'hidden' }}>
                  {s.thumb && <img src={s.thumb} alt="" width="100%" height="100%" style={{ display: 'block', imageRendering: 'pixelated' }} />}
                </div>
                <div style={gridItemLabel(objectBrush.sprite === s.sprite)}>{s.label}</div>
              </div>
            ))}
          </div>
          {objSprites.length === 0 && <div style={{ fontSize: T.fontSize.xs, color: T.muted, padding: T.sp[3] }}>No sprites available</div>}
          <div style={{ fontSize: T.fontSize.xs, color: T.muted, marginTop: T.sp[3] }}>{objects.length} object{objects.length !== 1 ? 's' : ''} on this level</div>
          <div style={{ fontSize: T.fontSize.xs, color: T.muted, lineHeight: 1.6 }}>Click to place. Right-click to remove.</div>
          {objectBrush.sprite && (() => {
            const parts = objectBrush.sprite.split('/')
            return parts.length >= 2 && spriteDefs?.[parts[0]]?.[parts[1]] ? (
              <div style={{ borderTop: `1px solid ${T.border}`, marginTop: T.sp[3], paddingTop: T.sp[3] }}>
                <SpriteEditor sprites={spriteDefs} activeCat={parts[0]} activeName={parts[1]} onUpdate={handleObjSpriteUpdate} />
              </div>
            ) : null
          })()}
        </>) : null}
        {editMode === 'sounds' && <SoundPanel soundDefs={soundDefs} />}
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
                  {editMode === 'sounds' && soundDefs?.ambient && (() => {
                    const match = Object.entries(soundDefs.ambient).find(([, d]) => d.target === 'object:' + hoverObj.type)
                    return match ? <span style={{ color: '#4ef' }}> {match[0]}</span> : null
                  })()}
                </span>
              )}
              {editMode === 'sounds' && soundDefs?.ambient && (() => {
                const zKey = zoneGrid?.[hoverPos.y]?.[hoverPos.x]
                if (!zKey || zKey === '.') return null
                const zoneName = zoneDefs.find(z => z.key === zKey)?.name
                if (!zoneName) return null
                const matches = Object.entries(soundDefs.ambient).filter(([, d]) => d.target === 'zone:' + zoneName)
                return matches.length > 0 ? <span style={{ color: '#4ef', marginLeft: 6 }}>{matches.map(m => m[0]).join(', ')}</span> : null
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Center: Canvas */}
      <div ref={containerRef} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#000' }}>
        <canvas ref={canvasRef} style={{ cursor: 'crosshair', imageRendering: 'pixelated' }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverPos(null)} onContextMenu={(e) => e.preventDefault()} />
      </div>

      {/* Right: Controls */}
      <RightPanel slug={slug} user={user} levels={levels} setLevels={setLevels}
        activeId={activeId} setActiveId={setActiveId} activeLevel={activeLevel}
        grid={grid} zoneGrid={zoneGrid} zoneDefs={zoneDefs} setZoneDefs={setZoneDefs}
        cols={cols} rows={rows} updateLevel={updateLevel} tiles={tiles}
        spriteDefs={spriteDefs} setSpriteDefs={setSpriteDefs}
        showZones={showZones} setShowZones={setShowZones}
        hasLocalMapEdits={hasLocalMapEdits} resetMaps={resetMaps} />
    </div>
  )
}
