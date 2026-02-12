import { useState } from 'react'
import { Link } from 'react-router-dom'
import { T } from '../theme'

// --- Layout ---

export function Toolbar({ left, right }) {
  return (
    <div style={{
      height: 48,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `0 ${T.sp(4)}px`,
      background: T.surface,
      borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: T.sp(3) }}>{left}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: T.sp(2) }}>{right}</div>
    </div>
  )
}

export function Panel({ children, style, ...props }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, ...style }} {...props}>
      {children}
    </div>
  )
}

export function StatusBar({ children }) {
  return (
    <div style={{
      height: 28,
      display: 'flex',
      alignItems: 'center',
      padding: `0 ${T.sp(3)}px`,
      background: T.surface,
      borderTop: `1px solid ${T.border}`,
      fontSize: T.fontSize.xs,
      color: T.text,
      fontFamily: T.mono,
      gap: T.sp(3),
    }}>
      {children}
    </div>
  )
}

// --- Typography ---

export function PageHeader({ children }) {
  return (
    <h2 style={{
      color: T.text,
      fontSize: T.fontSize.xs,
      fontFamily: T.font,
      fontWeight: 400,
      textTransform: 'uppercase',
      letterSpacing: 3,
      margin: `${T.sp(2)}px 0 ${T.sp(4)}px`,
      paddingBottom: T.sp(2),
      borderBottom: `1px solid ${T.border}`,
    }}>
      {children}
    </h2>
  )
}

export function SectionHeading({ children }) {
  return (
    <h4 style={{
      margin: `0 0 ${T.sp(2)}px`,
      color: T.text,
      fontSize: T.fontSize.xs,
      fontFamily: T.font,
      fontWeight: 400,
      textTransform: 'uppercase',
      letterSpacing: 2,
    }}>
      {children}
    </h4>
  )
}

// --- Grid ---

export function Grid({ children, min = 280 }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`,
      gap: T.sp(4),
    }}>
      {children}
    </div>
  )
}

// --- Card ---

export function Card({ href, to, thumbnail, children }) {
  const [hover, setHover] = useState(false)
  const content = (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: T.elevated,
        border: `1px solid ${hover ? T.accentColor + '60' : T.border}`,
        padding: T.sp(4),
        transition: 'border-color 0.15s',
      }}
    >
      {thumbnail && (
        <img
          src={thumbnail}
          alt=""
          style={{
            width: '100%',
            height: 'auto',
            imageRendering: 'pixelated',
            marginBottom: T.sp(3),
            display: 'block',
          }}
        />
      )}
      {children}
    </div>
  )
  if (to) return <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>{content}</Link>
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>{content}</a>
  return content
}

export function CardTitle({ children }) {
  return <h3 style={{ margin: `0 0 ${T.sp(2)}px`, fontSize: T.fontSize.sm, fontWeight: 700, color: T.textBright }}>{children}</h3>
}

export function CardTags({ children }) {
  return <div style={{ display: 'flex', gap: T.sp(1), flexWrap: 'wrap' }}>{children}</div>
}

// --- Controls ---

export function Button({ children, variant, active, onClick, style, ...props }) {
  const base = {
    padding: `${T.sp(1)}px ${T.sp(3)}px`,
    fontSize: T.fontSize.xs,
    fontFamily: T.font,
    cursor: 'pointer',
    border: 'none',
  }
  const variants = {
    default: { background: T.elevated, border: `1px solid ${T.border}`, color: T.textBright },
    ghost: { background: 'transparent', border: `1px solid ${T.border}`, color: T.text },
    active: { background: T.accentColor, color: '#000', fontWeight: 700 },
  }
  const v = active ? 'active' : (variant || 'default')
  return <button onClick={onClick} style={{ ...base, ...variants[v], ...style }} {...props}>{children}</button>
}

// --- Tabs ---

export function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
      {tabs.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            padding: `${T.sp(2)}px ${T.sp(4)}px`,
            background: 'transparent',
            color: active === t ? T.accentColor : T.text,
            border: 'none',
            borderBottom: active === t ? `2px solid ${T.accentColor}` : '2px solid transparent',
            cursor: 'pointer',
            fontSize: T.fontSize.xs,
            fontFamily: T.font,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

// --- Badge ---

export function Badge({ children, color }) {
  const c = color || T.accentColor
  return (
    <span style={{
      background: c + '18',
      color: c,
      padding: `1px ${T.sp(2)}px`,
      fontSize: T.fontSize.xs,
      fontFamily: T.mono,
    }}>
      {children}
    </span>
  )
}

// --- Empty State ---

export function EmptyState({ children }) {
  return <p style={{ color: T.text, fontSize: T.fontSize.sm, padding: `${T.sp(4)}px 0` }}>{children}</p>
}
