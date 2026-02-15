import { useRef, useEffect, useCallback } from 'react'
import { T } from '../theme'

export default function PixelGrid({ def, frameIdx, activeColor, onPaint }) {
  const canvasRef = useRef(null)
  const paintingRef = useRef(false)
  const cellSize = def.w <= 8 ? 32 : def.w <= 16 ? 24 : 16
  const gridW = def.w * cellSize
  const gridH = def.h * cellSize
  const frame = def.frames[frameIdx]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !frame) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, gridW, gridH)

    for (let row = 0; row < def.h; row++) {
      const line = frame[row]
      for (let col = 0; col < def.w; col++) {
        const ch = line?.[col] || '.'
        const color = ch === '.' ? null : def.palette[ch]
        const x = col * cellSize
        const y = row * cellSize
        if (color) {
          ctx.fillStyle = color
          ctx.fillRect(x, y, cellSize, cellSize)
        }
      }
    }

    ctx.strokeStyle = T.border
    ctx.lineWidth = 0.5
    for (let row = 0; row <= def.h; row++) {
      ctx.beginPath()
      ctx.moveTo(0, row * cellSize)
      ctx.lineTo(gridW, row * cellSize)
      ctx.stroke()
    }
    for (let col = 0; col <= def.w; col++) {
      ctx.beginPath()
      ctx.moveTo(col * cellSize, 0)
      ctx.lineTo(col * cellSize, gridH)
      ctx.stroke()
    }
  }, [def, frameIdx, frame, cellSize, gridW, gridH])

  const getCoords = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const col = Math.floor((e.clientX - rect.left) / cellSize)
    const row = Math.floor((e.clientY - rect.top) / cellSize)
    if (col >= 0 && col < def.w && row >= 0 && row < def.h) return { row, col }
    return null
  }, [cellSize, def.w, def.h])

  const handlePaint = useCallback((e) => {
    const c = getCoords(e)
    if (c) onPaint(c.row, c.col, activeColor)
  }, [getCoords, onPaint, activeColor])

  if (!frame) return null

  return (
    <canvas
      ref={canvasRef}
      width={gridW}
      height={gridH}
      onMouseDown={(e) => { e.preventDefault(); paintingRef.current = true; handlePaint(e) }}
      onMouseMove={(e) => { if (paintingRef.current) handlePaint(e) }}
      onMouseUp={() => { paintingRef.current = false }}
      onMouseLeave={() => { paintingRef.current = false }}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.md,
        cursor: 'crosshair',
        userSelect: 'none',
      }}
    />
  )
}
