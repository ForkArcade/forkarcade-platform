import { useRef, useEffect, useState } from 'react'
import { T } from '../theme'
import { drawSprite } from '../utils/sprite'

export function useMapCanvas({
  canvasRef, containerRef, grid, frameGrid, tiles, cols, rows,
  showZones, zoneGrid, zoneDefs, objects, spriteDefs,
  editMode, playerStart, soundDefs, hoverPos,
}) {
  const offscreenRef = useRef(null)
  const prevMapRef = useRef(null)
  const [mapVersion, setMapVersion] = useState(0)
  const [cellSize, setCellSize] = useState(20)

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
  useEffect(() => {
    const w = cols * cellSize, h = rows * cellSize
    if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas')
    const off = offscreenRef.current
    const ctx = off.getContext('2d')
    const prev = prevMapRef.current
    const fullRedraw = off.width !== w || off.height !== h || !prev || prev.tiles !== tiles

    if (fullRedraw) {
      off.width = w; off.height = h
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const tile = tiles[grid[y]?.[x] ?? 0]
          if (tile?.def) drawSprite(ctx, tile.def, x * cellSize, y * cellSize, cellSize, frameGrid?.[y]?.[x] ?? 0)
          else { ctx.fillStyle = '#222'; ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize) }
        }
      }
    } else {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const tid = grid[y]?.[x] ?? 0, fid = frameGrid?.[y]?.[x] ?? 0
          if (tid === (prev.grid[y]?.[x] ?? 0) && fid === (prev.frameGrid?.[y]?.[x] ?? 0)) continue
          const px = x * cellSize, py = y * cellSize
          ctx.fillStyle = '#000'; ctx.fillRect(px, py, cellSize, cellSize)
          const tile = tiles[tid]
          if (tile?.def) drawSprite(ctx, tile.def, px, py, cellSize, fid)
          else { ctx.fillStyle = '#222'; ctx.fillRect(px, py, cellSize, cellSize) }
        }
      }
    }
    prevMapRef.current = { grid, frameGrid, tiles }
    setMapVersion(v => v + 1)
  }, [grid, frameGrid, cellSize, cols, rows, tiles])

  // Blit offscreen + overlays
  useEffect(() => {
    const canvas = canvasRef.current
    const off = offscreenRef.current
    if (!canvas || !off || !off.width) return
    const w = off.width, h = off.height
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(off, 0, 0)

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 0.5
    for (let x = 0; x <= cols; x++) { ctx.beginPath(); ctx.moveTo(x * cellSize + 0.5, 0); ctx.lineTo(x * cellSize + 0.5, h); ctx.stroke() }
    for (let y = 0; y <= rows; y++) { ctx.beginPath(); ctx.moveTo(0, y * cellSize + 0.5); ctx.lineTo(w, y * cellSize + 0.5); ctx.stroke() }

    // Zone overlay
    if (showZones && zoneGrid) {
      const zoneColorMap = {}
      for (const zd of zoneDefs) zoneColorMap[zd.key] = zd.color
      ctx.font = `bold ${Math.max(8, cellSize * 0.5)}px ${T.mono}`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const zk = zoneGrid[y]?.[x]
          if (!zk || zk === '.') continue
          const color = zoneColorMap[zk]
          if (!color) continue
          const px = x * cellSize, py = y * cellSize
          ctx.fillStyle = color + '4d'; ctx.fillRect(px, py, cellSize, cellSize)
          ctx.fillStyle = color; ctx.fillText(zk, px + cellSize / 2, py + cellSize / 2)
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
        ctx.translate(px + cellSize / 2, py + cellSize / 2)
        ctx.rotate((obj.rot || 0) * Math.PI / 2)
        drawSprite(ctx, def, -cellSize / 2, -cellSize / 2, cellSize, 0)
        ctx.restore()
      } else {
        ctx.fillStyle = '#f808'; ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4)
      }
      if (obj.rot) {
        ctx.save()
        ctx.translate(px + cellSize / 2, py + cellSize / 2)
        ctx.rotate((obj.rot || 0) * Math.PI / 2)
        ctx.fillStyle = '#fff8'; ctx.beginPath()
        ctx.moveTo(0, -cellSize / 2 + 1); ctx.lineTo(-3, -cellSize / 2 + 5); ctx.lineTo(3, -cellSize / 2 + 5)
        ctx.closePath(); ctx.fill(); ctx.restore()
      }
      if (editMode === 'objects') {
        ctx.strokeStyle = '#f808'; ctx.lineWidth = 1
        ctx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1)
      }
    }

    // Player start marker
    if (playerStart) {
      const px = playerStart.x * cellSize, py = playerStart.y * cellSize
      ctx.strokeStyle = '#0f0'; ctx.lineWidth = 2; ctx.beginPath()
      ctx.moveTo(px + cellSize / 2, py + 3); ctx.lineTo(px + cellSize / 2, py + cellSize - 3)
      ctx.moveTo(px + 3, py + cellSize / 2); ctx.lineTo(px + cellSize - 3, py + cellSize / 2)
      ctx.stroke()
    }

    // Sound overlay
    if (editMode === 'sounds' && soundDefs?.ambient) {
      const zoneSounds = {}, objSounds = {}
      for (const [name, def] of Object.entries(soundDefs.ambient)) {
        const t = def.target || ''
        if (t.startsWith('zone:')) { const z = t.slice(5); (zoneSounds[z] ??= []).push(name) }
        else if (t.startsWith('object:')) { const o = t.slice(7); (objSounds[o] ??= []).push(name) }
      }
      if (zoneGrid) {
        const zoneNameMap = {}
        for (const zd of zoneDefs) zoneNameMap[zd.key] = zd.name
        ctx.font = `bold ${Math.max(7, cellSize * 0.35)}px ${T.mono}`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const zk = zoneGrid[y]?.[x]
            if (!zk || zk === '.') continue
            if (!zoneSounds[zoneNameMap[zk]]) continue
            ctx.fillStyle = 'rgba(78,238,255,0.12)'
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
          }
        }
      }
      for (const obj of objects) {
        const sndNames = objSounds[obj.type]
        if (!sndNames) continue
        const cx = obj.x * cellSize + cellSize / 2, cy = obj.y * cellSize + cellSize / 2
        const range = soundDefs.ambient[sndNames[0]]?.range || 8
        ctx.strokeStyle = 'rgba(255,136,0,0.3)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.arc(cx, cy, range * cellSize, 0, Math.PI * 2); ctx.stroke()
        ctx.fillStyle = '#f80'
        ctx.font = `bold ${Math.max(6, cellSize * 0.3)}px ${T.mono}`
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
        ctx.fillText(sndNames[0], cx, obj.y * cellSize - 2)
      }
    }

    // Hover
    if (hoverPos && hoverPos.x >= 0 && hoverPos.x < cols && hoverPos.y >= 0 && hoverPos.y < rows) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2
      ctx.strokeRect(hoverPos.x * cellSize + 1, hoverPos.y * cellSize + 1, cellSize - 2, cellSize - 2)
    }
  }, [mapVersion, hoverPos, cellSize, cols, rows, showZones, zoneGrid, zoneDefs, objects, spriteDefs, editMode, playerStart, soundDefs])

  return cellSize
}
