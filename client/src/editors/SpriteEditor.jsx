import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { T } from '../theme'
import { spriteToDataUrl, nextPaletteKey, setPixel } from '../utils/sprite'
import { Trash2, Plus, Copy, ArrowLeft } from 'lucide-react'

const smallBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: 'none', border: `1px solid ${T.border}`,
  borderRadius: T.radius.sm, color: T.text, cursor: 'pointer',
  fontSize: 10, padding: '2px 6px', height: 22,
}

export default function SpriteEditor({ sprites, activeCat, activeName, onUpdate, onClose }) {
  const def = sprites?.[activeCat]?.[activeName]
  const [activeFrame, setActiveFrame] = useState(0)
  const [activeColor, setActiveColor] = useState(() => {
    if (!def?.palette) return '.'
    const keys = Object.keys(def.palette)
    return keys.length > 0 ? keys[0] : '.'
  })

  // Reset frame when sprite changes
  useEffect(() => { setActiveFrame(0) }, [activeCat, activeName])

  // --- Pixel Grid ---
  const canvasRef = useRef(null)
  const paintingRef = useRef(false)

  const cellSize = !def ? 20 : Math.min(20, Math.floor(240 / Math.max(def.w, def.h)))
  const gridW = def ? def.w * cellSize : 0
  const gridH = def ? def.h * cellSize : 0
  const frame = def?.frames?.[activeFrame]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !frame || !def) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, gridW, gridH)

    for (let row = 0; row < def.h; row++) {
      const line = frame[row]
      for (let col = 0; col < def.w; col++) {
        const ch = line?.[col] || '.'
        const color = ch === '.' ? null : def.palette[ch]
        if (color) {
          ctx.fillStyle = color
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize)
        }
      }
    }

    ctx.strokeStyle = T.border
    ctx.lineWidth = 0.5
    for (let row = 0; row <= def.h; row++) {
      ctx.beginPath(); ctx.moveTo(0, row * cellSize); ctx.lineTo(gridW, row * cellSize); ctx.stroke()
    }
    for (let col = 0; col <= def.w; col++) {
      ctx.beginPath(); ctx.moveTo(col * cellSize, 0); ctx.lineTo(col * cellSize, gridH); ctx.stroke()
    }
  }, [def, activeFrame, frame, cellSize, gridW, gridH])

  const getCoords = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const col = Math.floor((e.clientX - rect.left) / cellSize)
    const row = Math.floor((e.clientY - rect.top) / cellSize)
    if (col >= 0 && col < def.w && row >= 0 && row < def.h) return { row, col }
    return null
  }, [cellSize, def?.w, def?.h])

  const handlePaint = useCallback((e) => {
    const c = getCoords(e)
    if (c) onUpdate(d => {
      d.frames[activeFrame][c.row] = setPixel(d.frames[activeFrame], c.row, c.col, activeColor)
    })
  }, [getCoords, onUpdate, activeFrame, activeColor])

  // --- Palette handlers ---
  const handleColorChange = useCallback((key, color) => {
    onUpdate(d => { d.palette[key] = color })
  }, [onUpdate])

  const handleAddColor = useCallback(() => {
    onUpdate(d => {
      const key = nextPaletteKey(d.palette)
      if (key) { d.palette[key] = '#888888'; setActiveColor(key) }
    })
  }, [onUpdate])

  const handleRemoveColor = useCallback((key) => {
    onUpdate(d => {
      delete d.palette[key]
      for (let f = 0; f < d.frames.length; f++) {
        d.frames[f] = d.frames[f].map(line => line.split('').map(ch => ch === key ? '.' : ch).join(''))
      }
      if (activeColor === key) setActiveColor('.')
    })
  }, [onUpdate, activeColor])

  // --- Frame handlers ---
  const handleAddFrame = useCallback(() => {
    onUpdate(d => {
      d.frames.push(Array.from({ length: d.h }, () => '.'.repeat(d.w)))
      setActiveFrame(d.frames.length - 1)
    })
  }, [onUpdate])

  const handleDuplicateFrame = useCallback(() => {
    onUpdate(d => {
      d.frames.push(d.frames[activeFrame].map(l => l))
      setActiveFrame(d.frames.length - 1)
    })
  }, [onUpdate, activeFrame])

  const handleRemoveFrame = useCallback(() => {
    onUpdate(d => {
      d.frames.splice(activeFrame, 1)
      setActiveFrame(Math.min(activeFrame, d.frames.length - 1))
    })
  }, [onUpdate, activeFrame])

  // --- Ctrl+V paste image ---
  useEffect(() => {
    if (!def) return
    const PALETTE_KEYS = '123456789abcdefghijklmnopqrstuvwxyz'

    function rgbToHex(r, g, b) {
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
    }
    function colorDist(a, b) {
      return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
    }
    function reduceColors(colors, max) {
      const entries = colors.map(c => ({ rgb: c, count: 1 }))
      while (entries.length > max) {
        let bi = 0, bj = 1, bd = Infinity
        for (let i = 0; i < entries.length; i++)
          for (let j = i + 1; j < entries.length; j++) {
            const d = colorDist(entries[i].rgb, entries[j].rgb)
            if (d < bd) { bd = d; bi = i; bj = j }
          }
        const a = entries[bi], b = entries[bj], t = a.count + b.count
        a.rgb = [Math.round((a.rgb[0]*a.count + b.rgb[0]*b.count)/t), Math.round((a.rgb[1]*a.count + b.rgb[1]*b.count)/t), Math.round((a.rgb[2]*a.count + b.rgb[2]*b.count)/t)]
        a.count = t
        entries.splice(bj, 1)
      }
      return entries.map(e => e.rgb)
    }

    function onPaste(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const items = e.clipboardData?.items
      if (!items) return
      let imageItem = null
      for (const item of items) { if (item.type.startsWith('image/')) { imageItem = item; break } }
      if (!imageItem) return
      e.preventDefault()

      const blob = imageItem.getAsFile()
      const img = new Image()
      img.onload = () => {
        const cv = document.createElement('canvas')
        cv.width = def.w; cv.height = def.h
        const cc = cv.getContext('2d')
        cc.imageSmoothingEnabled = false
        cc.drawImage(img, 0, 0, def.w, def.h)
        const imgData = cc.getImageData(0, 0, def.w, def.h).data

        const seen = new Map()
        for (let i = 0; i < imgData.length; i += 4) {
          if (imgData[i+3] < 128) continue
          const key = `${imgData[i]},${imgData[i+1]},${imgData[i+2]}`
          if (!seen.has(key)) seen.set(key, [imgData[i], imgData[i+1], imgData[i+2]])
        }

        let uniqueColors = [...seen.values()]
        if (uniqueColors.length === 0) {
          onUpdate(d => { d.frames[activeFrame] = Array.from({ length: def.h }, () => '.'.repeat(def.w)) })
          URL.revokeObjectURL(img.src); return
        }
        if (uniqueColors.length > PALETTE_KEYS.length) uniqueColors = reduceColors(uniqueColors, PALETTE_KEYS.length)

        const newPalette = {}
        const finalColors = uniqueColors.map((rgb, i) => ({ key: PALETTE_KEYS[i], rgb, hex: rgbToHex(...rgb) }))
        for (const c of finalColors) newPalette[c.key] = c.hex

        const newLines = []
        for (let row = 0; row < def.h; row++) {
          let line = ''
          for (let col = 0; col < def.w; col++) {
            const i = (row * def.w + col) * 4
            if (imgData[i+3] < 128) { line += '.'; continue }
            const rgb = [imgData[i], imgData[i+1], imgData[i+2]]
            let best = finalColors[0], bestDist = Infinity
            for (const c of finalColors) { const d = colorDist(rgb, c.rgb); if (d < bestDist) { bestDist = d; best = c } }
            line += best.key
          }
          newLines.push(line)
        }

        onUpdate(d => { d.palette = newPalette; d.frames[activeFrame] = newLines })
        URL.revokeObjectURL(img.src)
      }
      img.src = URL.createObjectURL(blob)
    }

    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [def, activeFrame, onUpdate])

  // --- Frame thumbnails ---
  const frameThumbSize = 28
  const frameThumbs = useMemo(() =>
    def ? def.frames.map((_, i) => spriteToDataUrl(def, frameThumbSize, i)) : [],
  [def])

  if (!def) return <div style={{ padding: T.sp[4], color: T.muted, fontSize: T.fontSize.xs }}>Sprite not found</div>

  const paletteKeys = Object.keys(def.palette)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: T.sp[3], height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: T.sp[2] }}>
        <button onClick={onClose} style={{ ...smallBtn, border: 'none', padding: '2px 4px' }}>
          <ArrowLeft size={12} />
        </button>
        <span style={{ fontSize: T.fontSize.xs, fontWeight: T.weight.semibold, color: T.textBright, fontFamily: T.mono }}>
          {activeName}
        </span>
      </div>

      {/* Pixel Grid */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <canvas
          ref={canvasRef}
          width={gridW}
          height={gridH}
          onMouseDown={(e) => { e.preventDefault(); paintingRef.current = true; handlePaint(e) }}
          onMouseMove={(e) => { if (paintingRef.current) handlePaint(e) }}
          onMouseUp={() => { paintingRef.current = false }}
          onMouseLeave={() => { paintingRef.current = false }}
          onContextMenu={(e) => e.preventDefault()}
          style={{ border: `1px solid ${T.border}`, borderRadius: T.radius.sm, cursor: 'crosshair', userSelect: 'none' }}
        />
      </div>

      {/* Palette */}
      <div>
        <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', marginBottom: T.sp[1] }}>Palette</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Transparent */}
          <div
            onClick={() => setActiveColor('.')}
            style={{
              display: 'flex', alignItems: 'center', gap: T.sp[2],
              padding: '2px 4px', borderRadius: T.radius.sm, cursor: 'pointer',
              background: activeColor === '.' ? T.elevated : 'transparent',
              border: activeColor === '.' ? `1px solid ${T.accentColor}` : '1px solid transparent',
            }}
          >
            <div style={{
              width: 16, height: 16, borderRadius: 2,
              border: `1px solid ${T.border}`,
              background: `repeating-conic-gradient(${T.border} 0% 25%, transparent 0% 50%) 50% / 8px 8px`,
            }} />
            <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted }}>.</span>
          </div>
          {/* Colors */}
          {paletteKeys.map(key => (
            <div
              key={key}
              onClick={() => setActiveColor(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: T.sp[2],
                padding: '2px 4px', borderRadius: T.radius.sm, cursor: 'pointer',
                background: activeColor === key ? T.elevated : 'transparent',
                border: activeColor === key ? `1px solid ${T.accentColor}` : '1px solid transparent',
              }}
            >
              <input
                type="color" value={def.palette[key]}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => handleColorChange(key, e.target.value)}
                style={{ width: 16, height: 16, padding: 0, border: `1px solid ${T.border}`, borderRadius: 2, cursor: 'pointer', background: 'none' }}
              />
              <span style={{ fontFamily: T.mono, fontSize: 9, color: T.textBright }}>{key}</span>
              <span style={{ fontFamily: T.mono, fontSize: 8, color: T.muted }}>{def.palette[key]}</span>
              {paletteKeys.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveColor(key) }}
                  style={{ ...smallBtn, padding: 1, height: 14, width: 14, marginLeft: 'auto', border: 'none', color: T.muted }}
                >
                  <Trash2 size={8} />
                </button>
              )}
            </div>
          ))}
          <button onClick={handleAddColor} style={{ ...smallBtn, marginTop: 2, justifyContent: 'center' }}>
            <Plus size={10} /> Add
          </button>
        </div>
      </div>

      {/* Frames */}
      <div>
        <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', marginBottom: T.sp[1] }}>
          Frames ({def.frames.length})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: T.sp[2] }}>
          {def.frames.map((_, i) => (
            <div
              key={i}
              onClick={() => setActiveFrame(i)}
              style={{
                cursor: 'pointer',
                border: i === activeFrame ? `2px solid ${T.accentColor}` : '2px solid transparent',
                borderRadius: 3,
              }}
            >
              <div style={{ width: frameThumbSize, height: frameThumbSize, background: '#000', borderRadius: 2, overflow: 'hidden' }}>
                {frameThumbs[i] && <img src={frameThumbs[i]} alt="" width={frameThumbSize} height={frameThumbSize} style={{ display: 'block', imageRendering: 'pixelated' }} />}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: T.sp[1] }}>
          <button onClick={handleAddFrame} style={smallBtn}><Plus size={10} /></button>
          <button onClick={handleDuplicateFrame} style={smallBtn}><Copy size={10} /></button>
          {def.frames.length > 1 && (
            <button onClick={handleRemoveFrame} style={{ ...smallBtn, color: T.danger }}><Trash2 size={10} /></button>
          )}
        </div>
      </div>

      {/* Hint */}
      <div style={{ marginTop: 'auto', fontSize: 9, color: T.muted, lineHeight: 1.5 }}>
        Ctrl+V paste image. Esc back to palette.
      </div>
    </div>
  )
}
