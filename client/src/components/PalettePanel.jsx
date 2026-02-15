import { T } from '../theme'
import { smallBtnStyle } from './ui'
import { Trash2, Plus } from 'lucide-react'

export default function PalettePanel({ palette, activeColor, onSelect, onColorChange, onAdd, onRemove }) {
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
              style={{ ...smallBtnStyle, padding: 2, height: 18, width: 18, marginLeft: 'auto', border: 'none', background: 'transparent', color: T.muted }}
            >
              <Trash2 size={10} />
            </button>
          )}
        </div>
      ))}

      {/* Add color */}
      <button onClick={onAdd} style={{ ...smallBtnStyle, marginTop: T.sp[2] }}>
        <Plus size={12} /> Add color
      </button>
    </div>
  )
}
