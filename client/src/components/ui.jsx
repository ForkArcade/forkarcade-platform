import { useState } from 'react'
import { Link } from 'react-router-dom'
import { T } from '../theme'

// --- Layout ---

export function Toolbar({ left, right }) {
  return (
    <div style={{
      height: T.sp[9],       // 48
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `0 ${T.sp[7]}px`,  // 0 24
      background: T.surface,
      borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: T.sp[6] }}>{left}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: T.sp[4] }}>{right}</div>
    </div>
  )
}

export function Panel({ children, style, ...props }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius.lg, ...style }} {...props}>
      {children}
    </div>
  )
}

export function StatusBar({ children }) {
  return (
    <div style={{
      height: T.sp[8],       // 32
      display: 'flex',
      alignItems: 'center',
      padding: `0 ${T.sp[6]}px`,  // 0 16
      background: T.surface,
      borderTop: `1px solid ${T.border}`,
      fontSize: T.fontSize.xs,
      color: T.muted,
      fontFamily: T.mono,
      gap: T.sp[5],          // 12
    }}>
      {children}
    </div>
  )
}

// --- Typography ---

export function PageHeader({ children }) {
  return (
    <h2 style={{
      color: T.muted,
      fontSize: T.fontSize.xs,
      fontWeight: T.weight.medium,
      textTransform: 'uppercase',
      letterSpacing: T.tracking.widest,
      lineHeight: T.leading.normal,
      margin: `${T.sp[4]}px 0 ${T.sp[7]}px`,
      paddingBottom: T.sp[4],
      borderBottom: `1px solid ${T.border}`,
    }}>
      {children}
    </h2>
  )
}

export function SectionHeading({ children }) {
  return (
    <h4 style={{
      margin: `0 0 ${T.sp[4]}px`,
      color: T.muted,
      fontSize: T.fontSize.xs,
      fontWeight: T.weight.medium,
      textTransform: 'uppercase',
      letterSpacing: T.tracking.wider,
      lineHeight: T.leading.normal,
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
      gap: T.sp[6],   // 16
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
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'transparent',
        border: `1px solid ${hover ? T.text : T.border}`,
        borderRadius: T.radius.lg,
        overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}
    >
      {thumbnail && (
        <div style={{
          borderRadius: T.radius.md,
          overflow: 'hidden',
          margin: T.sp[2],
        }}>
          <img
            src={thumbnail}
            alt=""
            style={{
              width: '100%',
              height: 'auto',
              imageRendering: 'pixelated',
              display: 'block',
            }}
          />
        </div>
      )}
      <div style={{ padding: `${T.sp[4]}px ${T.sp[4]}px ${T.sp[5]}px`, flex: 1 }}>
        {children}
      </div>
    </div>
  )
  const linkStyle = { textDecoration: 'none', color: 'inherit', height: '100%' }
  if (to) return <Link to={to} style={linkStyle}>{content}</Link>
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" style={linkStyle}>{content}</a>
  return content
}

export function CardTitle({ children }) {
  return (
    <h3 style={{
      margin: 0,
      fontSize: T.fontSize.base,
      fontWeight: T.weight.semibold,
      color: T.textBright,
      lineHeight: T.leading.snug,
      letterSpacing: T.tracking.tight,
    }}>
      {children}
    </h3>
  )
}

export function CardDescription({ children }) {
  return (
    <p style={{
      margin: `${T.sp[3]}px 0 0`,
      fontSize: T.fontSize.sm,
      fontWeight: T.weight.normal,
      color: T.textBright,
      opacity: 0.55,
      lineHeight: T.leading.relaxed,
      letterSpacing: T.tracking.normal,
    }}>
      {children}
    </p>
  )
}

export function CardTags({ children }) {
  return (
    <div style={{ display: 'flex', gap: T.sp[2], flexWrap: 'wrap', marginTop: T.sp[4] }}>
      {children}
    </div>
  )
}

// --- Controls ---

export function Button({ children, variant, active, size, onClick, style, ...props }) {
  const h = size === 'sm' ? T.sp[8] : T.sp[8]    // 32
  const px = size === 'sm' ? T.sp[4] : T.sp[5]    // 8 / 12
  const base = {
    height: h,
    padding: `0 ${px}px`,
    fontSize: T.fontSize.sm,
    fontFamily: T.font,
    fontWeight: T.weight.medium,
    cursor: 'pointer',
    border: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
  }
  const variants = {
    default: { background: T.elevated, border: `1px solid ${T.border}`, borderRadius: T.radius.md, color: T.textBright },
    ghost: { background: 'transparent', border: `1px solid ${T.border}`, borderRadius: T.radius.md, color: T.text },
    active: { background: T.accentColor, borderRadius: T.radius.md, color: '#000', fontWeight: T.weight.bold },
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
            height: T.sp[9],    // 48
            padding: `0 ${T.sp[6]}px`,  // 0 16
            background: 'transparent',
            color: active === t ? T.accentColor : T.text,
            border: 'none',
            borderBottom: active === t ? `2px solid ${T.accentColor}` : '2px solid transparent',
            cursor: 'pointer',
            fontSize: T.fontSize.sm,
            fontFamily: T.font,
            fontWeight: active === t ? T.weight.medium : T.weight.normal,
            textTransform: 'uppercase',
            letterSpacing: T.tracking.wider,
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
      background: c + '15',
      color: c,
      padding: `${T.sp[1]}px ${T.sp[3]}px`,   // 2 6
      borderRadius: T.radius.sm,
      fontSize: T.fontSize.xs,
      fontFamily: T.mono,
      fontWeight: T.weight.medium,
      lineHeight: T.leading.tight,
    }}>
      {children}
    </span>
  )
}

// --- Empty State ---

export function EmptyState({ children }) {
  return (
    <p style={{
      color: T.muted,
      fontSize: T.fontSize.sm,
      padding: `${T.sp[6]}px 0`,   // 16 0
    }}>
      {children}
    </p>
  )
}
