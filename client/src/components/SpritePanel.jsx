import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { T } from '../theme'

function spriteToDataUrl(def, size) {
  if (!def || !def.w || !def.h || !def.frames || !def.palette) return null
  try {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const pw = size / def.w
    const ph = size / def.h
    const pixels = def.frames[0]
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

function SpriteThumb({ name, def }) {
  const size = 48
  const dataUrl = useMemo(() => spriteToDataUrl(def, size), [def])

  if (!dataUrl) return null

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: size,
        height: size,
        background: '#000',
        borderRadius: T.radius.sm,
        border: `1px solid ${T.border}`,
        overflow: 'hidden',
      }}>
        <img src={dataUrl} alt={name} width={size} height={size} style={{ display: 'block', imageRendering: 'pixelated' }} />
      </div>
      <div style={{
        fontSize: 9,
        color: T.muted,
        marginTop: 2,
        maxWidth: size,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {name}
      </div>
    </div>
  )
}

export default function SpritePanel({ sprites, slug }) {
  if (!sprites) return null

  return (
    <div>
      {slug && (
        <Link
          to={`/sprites/${slug}`}
          style={{
            display: 'block',
            marginBottom: T.sp[4],
            padding: `${T.sp[2]}px ${T.sp[3]}px`,
            fontSize: T.fontSize.xs,
            color: T.accentColor,
            textDecoration: 'none',
            border: `1px solid ${T.border}`,
            borderRadius: T.radius.md,
            textAlign: 'center',
            fontFamily: T.mono,
          }}
        >
          Open editor
        </Link>
      )}
      {Object.entries(sprites).map(([cat, defs]) => (
        <div key={cat} style={{ marginBottom: T.sp[5] }}>
          <div style={{
            fontSize: T.fontSize.xs,
            color: T.muted,
            textTransform: 'uppercase',
            letterSpacing: T.tracking.widest,
            marginBottom: T.sp[3],
          }}>
            {cat}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: T.sp[2] }}>
            {Object.entries(defs).filter(([, d]) => d && typeof d === 'object' && d.frames).map(([name, def]) => (
              <SpriteThumb key={name} name={name} def={def} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
