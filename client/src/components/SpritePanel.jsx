import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { T } from '../theme'
import { SectionHeading, smallBtnStyle } from './ui'
import { spriteToDataUrl } from '../utils/sprite'
import { Undo2 } from 'lucide-react'

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
  const lsKey = `fa-sprites-${slug}`
  const [localSprites, setLocalSprites] = useState(() => {
    try {
      const saved = localStorage.getItem(lsKey)
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  const displaySprites = localSprites || sprites
  if (!displaySprites) return null

  const handleDiscard = () => {
    localStorage.removeItem(lsKey)
    setLocalSprites(null)
  }

  return (
    <div>
      {localSprites && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: T.sp[4], padding: `${T.sp[2]}px ${T.sp[3]}px`,
          border: `1px solid ${T.accentColor}30`, borderRadius: T.radius.md,
          background: `${T.accentColor}08`,
        }}>
          <span style={{ fontSize: 9, color: T.accentColor, fontFamily: T.mono }}>local edits</span>
          <button onClick={handleDiscard} style={{ ...smallBtnStyle, height: 20, padding: `0 ${T.sp[2]}px`, fontSize: 9, color: T.muted }}>
            <Undo2 size={10} /> Discard
          </button>
        </div>
      )}
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
      {Object.entries(displaySprites).map(([cat, defs]) => (
        <div key={cat} style={{ marginBottom: T.sp[5] }}>
          <SectionHeading>{cat}</SectionHeading>
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
