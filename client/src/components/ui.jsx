import { T } from '../theme'

export function Panel({ children, style, ...props }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, ...style }} {...props}>
      {children}
    </div>
  )
}

export function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
      {tabs.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            color: active === t ? T.accent : T.textDim,
            border: 'none',
            borderBottom: active === t ? `2px solid ${T.accent}` : '2px solid transparent',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: T.font,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

export function Badge({ children, color }) {
  return (
    <span style={{
      background: (color || T.accent) + '18',
      color: color || T.accent,
      padding: '2px 8px',
      borderRadius: 3,
      fontSize: 11,
      fontFamily: T.mono,
    }}>
      {children}
    </span>
  )
}

export function StatusBar({ children }) {
  return (
    <div style={{
      height: 28,
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      background: T.surface,
      borderTop: `1px solid ${T.border}`,
      fontSize: 11,
      color: T.textDim,
      fontFamily: T.mono,
      gap: 12,
    }}>
      {children}
    </div>
  )
}

export function Toolbar({ left, right }) {
  return (
    <div style={{
      height: 44,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      background: T.surface,
      borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{left}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div>
    </div>
  )
}
