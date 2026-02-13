import { T } from '../theme'
import { X } from 'lucide-react'

export function MdPopup({ title, text, onClose, footer }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius.lg,
          width: '90%',
          maxWidth: 640,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${T.sp[4]}px ${T.sp[5]}px`,
          borderBottom: `1px solid ${T.border}`,
        }}>
          <span style={{ fontSize: T.fontSize.sm, fontFamily: T.mono, color: T.textBright, fontWeight: T.weight.medium }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: T.sp[1] }}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ overflow: 'auto', padding: T.sp[5], flex: 1 }}>
          <SimpleMd text={text} />
        </div>
        {footer && (
          <div style={{ padding: `${T.sp[4]}px ${T.sp[5]}px`, borderTop: `1px solid ${T.border}` }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

function SimpleMd({ text }) {
  const lines = text.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('```')) {
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++
      elements.push(
        <pre key={elements.length} style={{
          background: T.bg,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius.md,
          padding: T.sp[4],
          margin: `${T.sp[3]}px 0`,
          fontSize: T.fontSize.xs,
          fontFamily: T.mono,
          color: T.text,
          overflow: 'auto',
          lineHeight: T.leading.relaxed,
        }}>
          {codeLines.join('\n')}
        </pre>
      )
      continue
    }

    if (line.includes('|') && line.trim().startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim().startsWith('|')) {
        const cells = lines[i].split('|').slice(1, -1).map(c => c.trim())
        if (!cells.every(c => /^[-:]+$/.test(c))) rows.push(cells)
        i++
      }
      if (rows.length > 0) {
        const header = rows[0]
        const body = rows.slice(1)
        elements.push(
          <div key={elements.length} style={{ overflow: 'auto', margin: `${T.sp[3]}px 0` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: T.fontSize.xs, fontFamily: T.mono }}>
              <thead>
                <tr>
                  {header.map((h, j) => (
                    <th key={j} style={{ textAlign: 'left', padding: `${T.sp[2]}px ${T.sp[3]}px`, borderBottom: `1px solid ${T.border}`, color: T.textBright, fontWeight: T.weight.medium }}>{inline(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ padding: `${T.sp[2]}px ${T.sp[3]}px`, borderBottom: `1px solid ${T.border}`, color: T.text }}>{inline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    if (line.startsWith('### ')) {
      elements.push(<h4 key={elements.length} style={{ color: T.textBright, fontSize: T.fontSize.sm, fontWeight: T.weight.semibold, margin: `${T.sp[5]}px 0 ${T.sp[2]}px` }}>{inline(line.slice(4))}</h4>)
      i++; continue
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 key={elements.length} style={{ color: T.textBright, fontSize: T.fontSize.base, fontWeight: T.weight.semibold, margin: `${T.sp[5]}px 0 ${T.sp[2]}px` }}>{inline(line.slice(3))}</h3>)
      i++; continue
    }
    if (line.startsWith('# ')) {
      elements.push(<h2 key={elements.length} style={{ color: T.textBright, fontSize: T.fontSize.md, fontWeight: T.weight.bold, margin: `${T.sp[5]}px 0 ${T.sp[3]}px` }}>{inline(line.slice(2))}</h2>)
      i++; continue
    }

    if (/^[-*] /.test(line)) {
      elements.push(
        <div key={elements.length} style={{ display: 'flex', gap: T.sp[3], margin: `${T.sp[1]}px 0`, fontSize: T.fontSize.xs, color: T.text, lineHeight: T.leading.relaxed }}>
          <span style={{ color: T.muted }}>-</span>
          <span>{inline(line.slice(2))}</span>
        </div>
      )
      i++; continue
    }

    if (!line.trim()) {
      elements.push(<div key={elements.length} style={{ height: T.sp[3] }} />)
      i++; continue
    }

    elements.push(<p key={elements.length} style={{ fontSize: T.fontSize.xs, color: T.text, lineHeight: T.leading.relaxed, margin: `${T.sp[2]}px 0` }}>{inline(line)}</p>)
    i++
  }

  return <>{elements}</>
}

function inline(text) {
  const parts = []
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[1]) {
      parts.push(<code key={parts.length} style={{ background: T.bg, padding: '1px 4px', borderRadius: 3, fontFamily: T.mono, fontSize: T.fontSize.xs, color: T.accentColor }}>{m[1].slice(1, -1)}</code>)
    } else if (m[2]) {
      parts.push(<strong key={parts.length} style={{ color: T.textBright, fontWeight: T.weight.semibold }}>{m[2].slice(2, -2)}</strong>)
    }
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts
}
