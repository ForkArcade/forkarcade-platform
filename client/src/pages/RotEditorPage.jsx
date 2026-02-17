import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { T } from '../theme'
import { GITHUB_ORG, githubRawUrl } from '../api'
import { renderSpriteToCanvas } from '../utils/sprite'
import SpriteEditor from '../editors/SpriteEditor'
import RightPanel from '../editors/RightPanel'
import { useMapSprites } from '../editors/useMapSprites'
import {
  DEFAULT_W, DEFAULT_H, ZONE_COLORS,
  createEmptyGrid, createEmptyZoneGrid, uid,
  parseMapsFromDataJs, computeAutotileFrame, bakeAllAutotiles,
} from '../editors/mapUtils'

const STORAGE_KEY = slug => `fa-maps-${slug}`

function loadLevels(slug) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(slug))
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
  localStorage.setItem(STORAGE_KEY(slug), JSON.stringify(data))
}

export default function RotEditorPage({ user }) {
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

  const {
    spriteDefs, hasLocalEdits, resetToPublished,
    categories, tiles, activeCategory, setActiveCategory,
    activeTile, setActiveTile, activeFrame, setActiveFrame,
    handleSpriteUpdate,
  } = useMapSprites(slug)

  const tilesRef = useRef([])
  tilesRef.current = tiles

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

  // Fetch game maps from data.js on mount
  useEffect(() => {
    fetch(githubRawUrl(`${GITHUB_ORG}/${slug}/main/data.js`))
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

  const activeLevel = levels.find(l => l.id === activeId) || levels[0]
  const grid = activeLevel?.grid || createEmptyGrid(DEFAULT_W, DEFAULT_H)
  const frameGrid = activeLevel?.frameGrid
  const zoneGrid = activeLevel?.zoneGrid
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

  // Blit offscreen + grid lines + hover
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
  }, [tiles.length, setActiveTile, setActiveFrame])

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: T.sp[2] }}>
            <span style={{ fontSize: T.fontSize.xs, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {activeCategory}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: T.border, borderRadius: T.radius.sm, overflow: 'hidden' }}>
            {tiles.map((tile, idx) => (
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
            ))}
          </div>
          {tiles.length === 0 && (
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
        showZones={showZones}
        setShowZones={setShowZones}
      />
    </div>
  )
}
