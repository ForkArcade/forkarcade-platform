import { useMemo } from 'react'
import { T } from '../theme'
import { smallBtnStyle } from './ui'
import { spriteToDataUrl } from '../utils/sprite'
import { Plus, Copy, Trash2 } from 'lucide-react'

export default function FramesPanel({ def, activeFrame, onSelect, onAdd, onDuplicate, onRemove }) {
  const thumbSize = 48
  const thumbUrls = useMemo(() =>
    def.frames.map((_, i) => spriteToDataUrl(def, thumbSize, i)),
    [def]
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: T.sp[3] }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: T.sp[2] }}>
        {def.frames.map((_, i) => {
          const url = thumbUrls[i]
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
        <button onClick={onAdd} style={smallBtnStyle} title="Add empty frame">
          <Plus size={12} /> New
        </button>
        <button onClick={onDuplicate} style={smallBtnStyle} title="Duplicate current frame">
          <Copy size={12} /> Dup
        </button>
        {def.frames.length > 1 && (
          <button onClick={onRemove} style={{ ...smallBtnStyle, color: T.danger }} title="Delete current frame">
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  )
}
