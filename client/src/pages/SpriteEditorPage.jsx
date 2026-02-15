import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { GITHUB_ORG, githubRawUrl } from '../api'
import { T } from '../theme'
import { ArrowLeft, Clipboard, Check, Plus, Trash2, Copy } from 'lucide-react'

// --- Helpers ---

function spriteToDataUrl(def, size, frameIdx) {
  if (!def?.w || !def?.h || !def?.frames || !def?.palette) return null
  try {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const pw = size / def.w
    const ph = size / def.h
    const pixels = def.frames[frameIdx]
    if (!pixels) return null
    for (let row = 0; row < def.h; row++) {
      const line = pixels[row]
      if (!line) continue
      for (let col = 0; col < def.w; col++) {
        const ch = line[col]
        if (ch === '.') continue
        const color = def.palette[ch]
        if (!color) continue
        ctx.fillStyle = color
        ctx.fillRect(col * pw, row * ph, Math.ceil(pw), Math.ceil(ph))
      }
    }
    return canvas.toDataURL()
  } catch { return null }
}

function nextPaletteKey(palette) {
  const letters = 'abcdefghijklmnopqrstuvwxyz'
  for (const ch of letters) {
    if (!palette[ch]) return ch
  }
  for (let i = 1; i <= 9; i++) {
    if (!palette[String(i)]) return String(i)
  }
  return null
}

function setPixel(frame, row, col, ch) {
  const line = frame[row]
  return line.substring(0, col) + ch + line.substring(col + 1)
}

const inputStyle = {
  width: 48,
  height: 24,
  background: T.surface,
  color: T.textBright,
  border: `1px solid ${T.border}`,
  borderRadius: T.radius.sm,
  padding: `0 ${T.sp[2]}px`,
  fontSize: T.fontSize.xs,
  fontFamily: T.mono,
  textAlign: 'center',
  outline: 'none',
}

const btnStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: T.sp[2],
  padding: `${T.sp[2]}px ${T.sp[3]}px`,
  height: 26,
  background: T.elevated,
  color: T.text,
  border: `1px solid ${T.border}`,
  borderRadius: T.radius.sm,
  cursor: 'pointer',
  fontSize: T.fontSize.xs,
  fontFamily: T.mono,
}

// --- Pixel Grid ---

function PixelGrid({ def, frameIdx, activeColor, onPaint }) {
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

// --- Palette Panel ---

function PalettePanel({ palette, activeColor, onSelect, onColorChange, onAdd, onRemove }) {
  const keys = Object.keys(palette)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: T.sp[2] }}>
      {/* Transparent */}
      <div
        onClick={() => onSelect('.')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: T.sp[3],
          padding: `${T.sp[2]}px ${T.sp[3]}px`,
          borderRadius: T.radius.sm,
          cursor: 'pointer',
          background: activeColor === '.' ? T.elevated : 'transparent',
          border: activeColor === '.' ? `1px solid ${T.accentColor}` : `1px solid transparent`,
        }}
      >
        <div style={{
          width: 20,
          height: 20,
          borderRadius: T.radius.sm,
          border: `1px solid ${T.border}`,
          background: `repeating-conic-gradient(${T.border} 0% 25%, transparent 0% 50%) 50% / 10px 10px`,
        }} />
        <span style={{ fontFamily: T.mono, fontSize: T.fontSize.xs, color: T.muted }}>. transparent</span>
      </div>

      {/* Colors */}
      {keys.map(key => (
        <div
          key={key}
          onClick={() => onSelect(key)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: T.sp[3],
            padding: `${T.sp[2]}px ${T.sp[3]}px`,
            borderRadius: T.radius.sm,
            cursor: 'pointer',
            background: activeColor === key ? T.elevated : 'transparent',
            border: activeColor === key ? `1px solid ${T.accentColor}` : `1px solid transparent`,
          }}
        >
          <input
            type="color"
            value={palette[key]}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onColorChange(key, e.target.value)}
            style={{
              width: 20,
              height: 20,
              padding: 0,
              border: `1px solid ${T.border}`,
              borderRadius: T.radius.sm,
              cursor: 'pointer',
              background: 'none',
            }}
          />
          <span style={{ fontFamily: T.mono, fontSize: T.fontSize.xs, color: T.textBright }}>{key}</span>
          <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted }}>{palette[key]}</span>
          {keys.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(key) }}
              style={{ ...btnStyle, padding: 2, height: 18, width: 18, marginLeft: 'auto', border: 'none', background: 'transparent', color: T.muted }}
            >
              <Trash2 size={10} />
            </button>
          )}
        </div>
      ))}

      {/* Add color */}
      <button onClick={onAdd} style={{ ...btnStyle, marginTop: T.sp[2] }}>
        <Plus size={12} /> Add color
      </button>
    </div>
  )
}

// --- Frames Panel ---

function FramesPanel({ def, activeFrame, onSelect, onAdd, onDuplicate, onRemove }) {
  const thumbSize = 48
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: T.sp[3] }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: T.sp[2] }}>
        {def.frames.map((_, i) => {
          const url = spriteToDataUrl(def, thumbSize, i)
          return (
            <div
              key={i}
              onClick={() => onSelect(i)}
              style={{
                textAlign: 'center',
                cursor: 'pointer',
                border: i === activeFrame ? `2px solid ${T.accentColor}` : `2px solid transparent`,
                borderRadius: T.radius.sm,
                padding: 1,
              }}
            >
              <div style={{
                width: thumbSize,
                height: thumbSize,
                background: '#000',
                borderRadius: T.radius.sm,
                overflow: 'hidden',
              }}>
                {url && <img src={url} alt={`f${i}`} width={thumbSize} height={thumbSize} style={{ display: 'block', imageRendering: 'pixelated' }} />}
              </div>
              <span style={{ fontSize: 9, color: i === activeFrame ? T.accentColor : T.muted }}>f{i}</span>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: T.sp[2] }}>
        <button onClick={onAdd} style={btnStyle} title="Add empty frame">
          <Plus size={12} /> New
        </button>
        <button onClick={onDuplicate} style={btnStyle} title="Duplicate current frame">
          <Copy size={12} /> Dup
        </button>
        {def.frames.length > 1 && (
          <button onClick={onRemove} style={{ ...btnStyle, color: T.danger }} title="Delete current frame">
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

// --- Main Editor ---

export default function SpriteEditorPage() {
  const { slug } = useParams()
  const [sprites, setSprites] = useState(null)
  const [activeCat, setActiveCat] = useState(null)
  const [activeName, setActiveName] = useState(null)
  const [activeFrame, setActiveFrame] = useState(0)
  const [activeColor, setActiveColor] = useState('.')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(githubRawUrl(`${GITHUB_ORG}/${slug}/main/_sprites.json`))
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        setSprites(data)
        const cats = Object.keys(data)
        if (cats.length > 0) {
          setActiveCat(cats[0])
          const names = Object.keys(data[cats[0]])
          if (names.length > 0) setActiveName(names[0])
        }
      })
      .catch(() => setSprites(null))
  }, [slug])

  const def = sprites && activeCat && activeName ? sprites[activeCat]?.[activeName] : null
  const categories = sprites ? Object.keys(sprites) : []
  const spriteNames = sprites && activeCat ? Object.keys(sprites[activeCat]).filter(n => sprites[activeCat][n]?.frames) : []

  // Select first palette color when switching sprites
  useEffect(() => {
    if (def?.palette) {
      const keys = Object.keys(def.palette)
      if (keys.length > 0 && activeColor !== '.' && !def.palette[activeColor]) {
        setActiveColor(keys[0])
      }
    }
    setActiveFrame(0)
  }, [activeCat, activeName])

  const update = useCallback((mutator) => {
    setSprites(prev => {
      const copy = JSON.parse(JSON.stringify(prev))
      mutator(copy[activeCat][activeName])
      return copy
    })
  }, [activeCat, activeName])

  const handlePaint = useCallback((row, col, ch) => {
    update(d => {
      d.frames[activeFrame][row] = setPixel(d.frames[activeFrame], row, col, ch)
    })
  }, [update, activeFrame])

  const handleColorChange = useCallback((key, color) => {
    update(d => { d.palette[key] = color })
  }, [update])

  const handleAddColor = useCallback(() => {
    update(d => {
      const key = nextPaletteKey(d.palette)
      if (key) {
        d.palette[key] = '#888888'
        setActiveColor(key)
      }
    })
  }, [update])

  const handleRemoveColor = useCallback((key) => {
    update(d => {
      delete d.palette[key]
      // Replace removed color in all frames with '.'
      for (let f = 0; f < d.frames.length; f++) {
        d.frames[f] = d.frames[f].map(line => line.split('').map(ch => ch === key ? '.' : ch).join(''))
      }
      if (activeColor === key) setActiveColor('.')
    })
  }, [update, activeColor])

  const handleAddFrame = useCallback(() => {
    update(d => {
      const emptyLine = '.'.repeat(d.w)
      const frame = Array.from({ length: d.h }, () => emptyLine)
      d.frames.push(frame)
      setActiveFrame(d.frames.length - 1)
    })
  }, [update])

  const handleDuplicateFrame = useCallback(() => {
    update(d => {
      const dup = d.frames[activeFrame].map(l => l)
      d.frames.push(dup)
      setActiveFrame(d.frames.length - 1)
    })
  }, [update, activeFrame])

  const handleRemoveFrame = useCallback(() => {
    update(d => {
      d.frames.splice(activeFrame, 1)
      setActiveFrame(Math.min(activeFrame, d.frames.length - 1))
    })
  }, [update, activeFrame])

  const handleOriginChange = useCallback((axis, val) => {
    update(d => {
      if (!d.origin) d.origin = [0, 0]
      d.origin[axis] = val
    })
  }, [update])

  const handleCopy = useCallback(() => {
    if (!sprites) return
    navigator.clipboard.writeText(JSON.stringify(sprites, null, 2)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [sprites])

  if (!sprites) {
    return <div style={{ padding: T.sp[7], color: T.muted, fontSize: T.fontSize.sm }}>Loading sprites...</div>
  }

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* LEFT: Sprite list */}
      <div style={{
        width: 200,
        minWidth: 200,
        borderRight: `1px solid ${T.border}`,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: `${T.sp[3]}px ${T.sp[4]}px`,
          borderBottom: `1px solid ${T.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Link to={`/play/${slug}`} style={{ display: 'flex', alignItems: 'center', gap: T.sp[2], color: T.text, textDecoration: 'none', fontSize: T.fontSize.xs }}>
            <ArrowLeft size={14} /> {slug}
          </Link>
          <button onClick={handleCopy} style={{ ...btnStyle, padding: `${T.sp[1]}px ${T.sp[3]}px`, height: 22 }}>
            {copied ? <Check size={10} /> : <Clipboard size={10} />}
          </button>
        </div>

        {/* Sprite list by category */}
        <div style={{ flex: 1, overflow: 'auto', padding: `${T.sp[3]}px 0` }}>
          {categories.map(cat => {
            const names = Object.keys(sprites[cat]).filter(n => sprites[cat][n]?.frames)
            if (names.length === 0) return null
            return (
              <div key={cat}>
                <div style={{
                  padding: `${T.sp[2]}px ${T.sp[4]}px`,
                  fontSize: 9,
                  color: T.muted,
                  textTransform: 'uppercase',
                  letterSpacing: T.tracking.widest,
                  marginTop: T.sp[2],
                }}>
                  {cat}
                </div>
                {names.map(name => {
                  const d = sprites[cat][name]
                  const isActive = activeCat === cat && activeName === name
                  const thumb = spriteToDataUrl(d, 24, 0)
                  return (
                    <div
                      key={name}
                      onClick={() => { setActiveCat(cat); setActiveName(name) }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: T.sp[3],
                        padding: `${T.sp[1]}px ${T.sp[4]}px`,
                        cursor: 'pointer',
                        background: isActive ? T.elevated : 'transparent',
                        borderLeft: isActive ? `2px solid ${T.accentColor}` : '2px solid transparent',
                      }}
                    >
                      {thumb && (
                        <img src={thumb} alt="" width={24} height={24} style={{ imageRendering: 'pixelated', borderRadius: 2, background: '#000', flexShrink: 0 }} />
                      )}
                      <span style={{
                        fontSize: T.fontSize.xs,
                        fontFamily: T.mono,
                        color: isActive ? T.textBright : T.text,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {name}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* CENTER: Pixel Grid */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: T.sp[6], overflow: 'auto' }}>
        {def ? (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: T.sp[3],
              marginBottom: T.sp[4],
            }}>
              <span style={{ fontSize: T.fontSize.sm, fontWeight: T.weight.semibold, color: T.textBright, fontFamily: T.mono }}>{activeName}</span>
              <span style={{ fontSize: T.fontSize.xs, color: T.muted }}>{def.w}x{def.h}</span>
              <span style={{ fontSize: T.fontSize.xs, color: T.muted }}>frame {activeFrame}</span>
            </div>
            <PixelGrid
              def={def}
              frameIdx={activeFrame}
              activeColor={activeColor}
              onPaint={handlePaint}
            />
          </div>
        ) : (
          <div style={{ color: T.muted, fontSize: T.fontSize.sm }}>Select a sprite</div>
        )}
      </div>

      {/* RIGHT: Palette + Origin + Frames */}
      {def && (
        <div style={{
          width: 200,
          minWidth: 200,
          borderLeft: `1px solid ${T.border}`,
          overflow: 'auto',
          padding: T.sp[4],
          display: 'flex',
          flexDirection: 'column',
          gap: T.sp[5],
        }}>
          {/* Palette */}
          <div>
            <div style={{ fontSize: T.fontSize.xs, color: T.muted, textTransform: 'uppercase', letterSpacing: T.tracking.widest, marginBottom: T.sp[3] }}>
              Palette
            </div>
            <PalettePanel
              palette={def.palette}
              activeColor={activeColor}
              onSelect={setActiveColor}
              onColorChange={handleColorChange}
              onAdd={handleAddColor}
              onRemove={handleRemoveColor}
            />
          </div>

          {/* Origin */}
          <div>
            <div style={{ fontSize: T.fontSize.xs, color: T.muted, textTransform: 'uppercase', letterSpacing: T.tracking.widest, marginBottom: T.sp[3] }}>
              Origin
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: T.sp[3] }}>
              <label style={{ fontSize: T.fontSize.xs, color: T.muted }}>x</label>
              <input
                type="number"
                min={0}
                max={def.w - 1}
                value={(def.origin || [0, 0])[0]}
                onChange={e => handleOriginChange(0, parseInt(e.target.value) || 0)}
                style={inputStyle}
              />
              <label style={{ fontSize: T.fontSize.xs, color: T.muted }}>y</label>
              <input
                type="number"
                min={0}
                max={def.h - 1}
                value={(def.origin || [0, 0])[1]}
                onChange={e => handleOriginChange(1, parseInt(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Frames */}
          <div>
            <div style={{ fontSize: T.fontSize.xs, color: T.muted, textTransform: 'uppercase', letterSpacing: T.tracking.widest, marginBottom: T.sp[3] }}>
              Frames ({def.frames.length})
            </div>
            <FramesPanel
              def={def}
              activeFrame={activeFrame}
              onSelect={setActiveFrame}
              onAdd={handleAddFrame}
              onDuplicate={handleDuplicateFrame}
              onRemove={handleRemoveFrame}
            />
          </div>
        </div>
      )}
    </div>
  )
}
