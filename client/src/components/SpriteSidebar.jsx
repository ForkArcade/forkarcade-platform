import { useState } from 'react'
import { Link } from 'react-router-dom'
import { T } from '../theme'
import { smallBtnStyle } from './ui'
import { ArrowLeft, Undo2, Send } from 'lucide-react'

export default function SpriteSidebar({ slug, sprites, sidebarThumbs, activeCat, activeName, onSelect, hasLocalEdits, onReset, user, onPropose }) {
  const categories = Object.keys(sprites)
  const [proposeTitle, setProposeTitle] = useState('')
  const [proposing, setProposing] = useState(false)
  const [proposeResult, setProposeResult] = useState(null) // { ok, error, url }

  const handleSubmitPropose = async () => {
    if (!proposeTitle.trim()) return
    setProposing(true)
    setProposeResult(null)
    try {
      const result = await onPropose(proposeTitle.trim())
      setProposeResult({ ok: true, url: result.html_url })
      setProposeTitle('')
    } catch (e) {
      setProposeResult({ error: e.message || 'Failed to submit' })
    } finally {
      setProposing(false)
    }
  }

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
        {hasLocalEdits && <button onClick={onReset} style={{ ...smallBtnStyle, padding: `${T.sp[1]}px ${T.sp[3]}px`, height: 22 }} title="Reset to published sprites"><Undo2 size={10} /></button>}
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

      {hasLocalEdits && user && (
        <div style={{ padding: T.sp[4], borderTop: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: T.tracking.widest, marginBottom: T.sp[2] }}>
            Propose changes
          </div>
          <input
            type="text"
            placeholder="What changed?"
            value={proposeTitle}
            onChange={e => setProposeTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmitPropose()}
            style={{
              width: '100%',
              height: 28,
              background: T.surface,
              color: T.textBright,
              border: `1px solid ${T.border}`,
              borderRadius: T.radius.sm,
              padding: `0 ${T.sp[3]}px`,
              fontSize: T.fontSize.xs,
              fontFamily: T.mono,
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: T.sp[2],
            }}
          />
          <button
            onClick={handleSubmitPropose}
            disabled={proposing || !proposeTitle.trim()}
            style={{
              ...smallBtnStyle,
              width: '100%',
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: T.sp[2],
              opacity: proposing || !proposeTitle.trim() ? 0.5 : 1,
              cursor: proposing || !proposeTitle.trim() ? 'default' : 'pointer',
            }}
          >
            <Send size={10} /> {proposing ? 'Submitting...' : 'Propose'}
          </button>
          {proposeResult?.ok && (
            <a href={proposeResult.url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', marginTop: T.sp[2], fontSize: 9, color: T.accentColor, fontFamily: T.mono }}>
              Issue created
            </a>
          )}
          {proposeResult?.error && (
            <div style={{ marginTop: T.sp[2], fontSize: 9, color: '#f44', fontFamily: T.mono }}>
              {proposeResult.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
