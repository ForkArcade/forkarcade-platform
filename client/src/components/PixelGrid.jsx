import { useRef } from 'react'
import { T } from '../theme'

export default function PixelGrid({ def, frameIdx, activeColor, onPaint }) {
  const cellSize = def.w <= 8 ? 32 : def.w <= 16 ? 24 : 16
  const gridW = def.w * cellSize
  const gridH = def.h * cellSize
  const painting = useRef(false)
  const frame = def.frames[frameIdx]
  if (!frame) return null

  const handlePaint = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const col = Math.floor((e.clientX - rect.left) / cellSize)
    const row = Math.floor((e.clientY - rect.top) / cellSize)
    if (col >= 0 && col < def.w && row >= 0 && row < def.h) {
      onPaint(row, col, activeColor)
    }
  }

  return (
    <div
      onMouseDown={(e) => { e.preventDefault(); painting.current = true; handlePaint(e) }}
      onMouseMove={(e) => { if (painting.current) handlePaint(e) }}
      onMouseUp={() => { painting.current = false }}
      onMouseLeave={() => { painting.current = false }}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        width: gridW,
        height: gridH,
        display: 'grid',
        gridTemplateColumns: `repeat(${def.w}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${def.h}, ${cellSize}px)`,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.md,
        overflow: 'hidden',
        cursor: 'crosshair',
        userSelect: 'none',
      }}
    >
      {frame.map((line, row) =>
        Array.from({ length: def.w }, (_, col) => {
          const ch = line[col] || '.'
          const color = ch === '.' ? null : def.palette[ch]
          return (
            <div
              key={`${row}-${col}`}
              style={{
                width: cellSize,
                height: cellSize,
                background: color || 'transparent',
                boxShadow: `inset 0 0 0 0.5px ${T.border}`,
              }}
            />
          )
        })
      )}
    </div>
  )
}
