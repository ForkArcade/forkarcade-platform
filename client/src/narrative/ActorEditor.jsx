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
            {/* Priorities — shown if jobs defined */}
            {Object.keys(data.jobs || {}).length > 0 && (
              <div style={{ marginTop: T.sp[4], borderTop: `1px solid ${T.border}`, paddingTop: T.sp[4] }}>
                <div style={headingStyle}>Priorities</div>
                {(actor.priorities || []).map((jobId, i) => (
                  <div key={i} style={{ display: 'flex', gap: T.sp[2], alignItems: 'center', marginBottom: T.sp[1] }}>
                    <span style={{ flex: 1, fontSize: T.fontSize.xs, fontFamily: T.mono, color: T.textBright }}>{i + 1}. {jobId}</span>
                    <button
                      disabled={i === 0}
                      onClick={() => update(d => {
                        const p = d.actors[activeId].priorities
                        ;[p[i - 1], p[i]] = [p[i], p[i - 1]]
                      })}
                      style={{ ...smallBtnStyle, opacity: i === 0 ? 0.3 : 1 }}
                    >{'\u25b2'}</button>
                    <button
                      disabled={i === (actor.priorities || []).length - 1}
                      onClick={() => update(d => {
                        const p = d.actors[activeId].priorities
                        ;[p[i], p[i + 1]] = [p[i + 1], p[i]]
                      })}
                      style={{ ...smallBtnStyle, opacity: i === (actor.priorities || []).length - 1 ? 0.3 : 1 }}
                    >{'\u25bc'}</button>
                    <button onClick={() => update(d => { d.actors[activeId].priorities.splice(i, 1) })} style={xBtnStyle}>{'\u00d7'}</button>
                  </div>
                ))}
                <select
                  value=""
                  onChange={e => {
                    if (!e.target.value) return
                    update(d => {
                      if (!d.actors[activeId].priorities) d.actors[activeId].priorities = []
                      d.actors[activeId].priorities.push(e.target.value)
                    })
                  }}
                  style={{ ...selectStyle, width: '100%', marginTop: T.sp[2] }}
                >
                  <option value="">+ Add priority...</option>
                  {Object.keys(data.jobs || {}).filter(j => !(actor.priorities || []).includes(j)).map(j => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>
            )}
            {/* Initial needs — shown if needs defined */}
            {Object.keys(data.needs || {}).length > 0 && (actor.priorities || []).length > 0 && (
              <div style={{ marginTop: T.sp[4], borderTop: `1px solid ${T.border}`, paddingTop: T.sp[4] }}>
                <div style={headingStyle}>Initial needs</div>
                <div style={{ display: 'flex', gap: T.sp[3], flexWrap: 'wrap' }}>
                  {Object.keys(data.needs || {}).map(nid => (
                    <div key={nid}>
                      <label style={labelStyle}>{data.needs[nid].label || nid}</label>
                      <input
                        type="number"
                        value={(actor.needs && actor.needs[nid]) ?? 100}
                        onChange={e => update(d => {
                          if (!d.actors[activeId].needs) d.actors[activeId].needs = {}
                          d.actors[activeId].needs[nid] = Number(e.target.value)
                        })}
                        style={{ ...inputStyle, width: 50 }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
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

const selectStyle = {
  padding: `${T.sp[1]}px ${T.sp[2]}px`,
  background: T.surface, border: `1px solid ${T.border}`,
  borderRadius: T.radius.sm, color: T.textBright,
  fontFamily: T.mono, fontSize: T.fontSize.xs,
}

const smallBtnStyle = {
  background: 'transparent', border: `1px solid ${T.border}`,
  borderRadius: T.radius.sm, color: T.muted,
  fontSize: 9, padding: `0 ${T.sp[2]}px`, cursor: 'pointer',
  lineHeight: '18px',
}

const xBtnStyle = {
  background: 'transparent', border: 'none',
  color: T.danger, fontSize: T.fontSize.sm, cursor: 'pointer',
}

const delBtnStyle = {
  background: 'transparent', border: `1px solid ${T.border}`,
  borderRadius: T.radius.sm, color: T.danger,
  fontSize: T.fontSize.xs, fontFamily: T.mono,
  padding: `${T.sp[2]}px ${T.sp[4]}px`, cursor: 'pointer',
}
