import { Link } from 'react-router-dom'
import { T } from '../theme'
import { ArrowLeft, Clipboard, Check } from 'lucide-react'

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

export default function SpriteSidebar({ slug, sprites, sidebarThumbs, activeCat, activeName, onSelect, onCopy, copied }) {
  const categories = Object.keys(sprites)

  return (
    <div style={{
      width: 200,
      minWidth: 200,
      borderRight: `1px solid ${T.border}`,
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ padding: `${T.sp[3]}px ${T.sp[4]}px`, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to={`/play/${slug}`} style={{ display: 'flex', alignItems: 'center', gap: T.sp[2], color: T.text, textDecoration: 'none', fontSize: T.fontSize.xs }}><ArrowLeft size={14} /> {slug}</Link>
        <button onClick={onCopy} style={{ ...btnStyle, padding: `${T.sp[1]}px ${T.sp[3]}px`, height: 22 }}>{copied ? <Check size={10} /> : <Clipboard size={10} />}</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: `${T.sp[3]}px 0` }}>
        {categories.map(cat => {
          const names = Object.keys(sprites[cat]).filter(n => sprites[cat][n]?.frames)
          if (names.length === 0) return null
          return (
            <div key={cat}>
              <div style={{ padding: `${T.sp[2]}px ${T.sp[4]}px`, fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: T.tracking.widest, marginTop: T.sp[2] }}>
                {cat}
              </div>
              {names.map(name => {
                const isActive = activeCat === cat && activeName === name
                const thumb = sidebarThumbs[`${cat}/${name}`]
                return (
                  <div key={name} onClick={() => onSelect(cat, name)}
                    style={{ display: 'flex', alignItems: 'center', gap: T.sp[3], padding: `${T.sp[1]}px ${T.sp[4]}px`, cursor: 'pointer', background: isActive ? T.elevated : 'transparent', borderLeft: isActive ? `2px solid ${T.accentColor}` : '2px solid transparent' }}>
                    {thumb && <img src={thumb} alt="" width={24} height={24} style={{ imageRendering: 'pixelated', borderRadius: 2, background: '#000', flexShrink: 0 }} />}
                    <span style={{ fontSize: T.fontSize.xs, fontFamily: T.mono, color: isActive ? T.textBright : T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
