import { useState } from 'react'
import { T } from '../theme'

export default function ActorEditor({ data, update }) {
  const [selected, setSelected] = useState(null)
  const actors = data.actors || {}
  const ids = Object.keys(actors)
  const activeId = selected && ids.includes(selected) ? selected : ids[0] || null
  const actor = activeId ? actors[activeId] : null

  return (
    <div style={{ display: 'flex', gap: T.sp[5] }}>
      {/* Actor list */}
      <div style={{ width: 160, flexShrink: 0 }}>
        <div style={headingStyle}>Actors ({ids.length})</div>
        {ids.map(id => (
          <button
            key={id}
            onClick={() => setSelected(id)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: `${T.sp[2]}px ${T.sp[3]}px`, marginBottom: 1,
              background: activeId === id ? T.surface : 'transparent',
              border: 'none', color: activeId === id ? T.textBright : T.text,
              fontSize: T.fontSize.xs, fontFamily: T.mono, cursor: 'pointer',
            }}
          >
            {actors[id].name || id}
          </button>
        ))}
        <button
          onClick={() => {
            const id = prompt('Actor ID (e.g. lena, drone, terminal):')
            if (!id) return
            update(d => {
              if (!d.actors) d.actors = {}
              d.actors[id] = { name: id, sprite: '' }
            })
            setSelected(id)
          }}
          style={addBtnStyle}
        >
          + Add actor
        </button>
      </div>

      {/* Actor properties */}
      {actor && (
        <div style={{ flex: 1, minWidth: 0, maxWidth: 400 }}>
          <div style={headingStyle}>Properties</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: T.sp[3] }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input value={actor.name || ''} onChange={e => update(d => { d.actors[activeId].name = e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Sprite</label>
              <input value={actor.sprite || ''} onChange={e => update(d => { d.actors[activeId].sprite = e.target.value })} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: T.sp[3] }}>
              <div>
                <label style={labelStyle}>HP</label>
                <input type="number" value={actor.hp ?? ''} onChange={e => update(d => { d.actors[activeId].hp = e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="-" style={{ ...inputStyle, width: 50 }} />
              </div>
              <div>
                <label style={labelStyle}>ATK</label>
                <input type="number" value={actor.atk ?? ''} onChange={e => update(d => { d.actors[activeId].atk = e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="-" style={{ ...inputStyle, width: 50 }} />
              </div>
              <div>
                <label style={labelStyle}>DEF</label>
                <input type="number" value={actor.def ?? ''} onChange={e => update(d => { d.actors[activeId].def = e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="-" style={{ ...inputStyle, width: 50 }} />
              </div>
            </div>
            <div style={{ marginTop: T.sp[4], borderTop: `1px solid ${T.border}`, paddingTop: T.sp[4] }}>
              <button
                onClick={() => {
                  if (!confirm(`Delete actor "${activeId}"?`)) return
                  update(d => { delete d.actors[activeId] })
                  setSelected(null)
                }}
                style={delBtnStyle}
              >
                Delete actor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const headingStyle = {
  fontSize: 9, fontFamily: T.mono, color: T.muted,
  textTransform: 'uppercase', letterSpacing: T.tracking.widest,
  marginBottom: T.sp[3],
}

const labelStyle = {
  display: 'block', fontSize: 9, color: T.muted,
  textTransform: 'uppercase', marginBottom: T.sp[1],
}

const inputStyle = {
  width: '100%', padding: `${T.sp[1]}px ${T.sp[2]}px`,
  background: T.surface, border: `1px solid ${T.border}`,
  borderRadius: T.radius.sm, color: T.textBright,
  fontFamily: T.mono, fontSize: T.fontSize.xs,
  boxSizing: 'border-box',
}

const addBtnStyle = {
  background: 'transparent', border: `1px dashed ${T.border}`,
  borderRadius: T.radius.sm, color: T.muted,
  fontSize: T.fontSize.xs, fontFamily: T.mono,
  padding: `${T.sp[2]}px ${T.sp[3]}px`, cursor: 'pointer',
  width: '100%', marginTop: T.sp[3],
}

const delBtnStyle = {
  background: 'transparent', border: `1px solid ${T.border}`,
  borderRadius: T.radius.sm, color: T.danger,
  fontSize: T.fontSize.xs, fontFamily: T.mono,
  padding: `${T.sp[2]}px ${T.sp[4]}px`, cursor: 'pointer',
}
