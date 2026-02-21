import { useState } from 'react'
import { T } from '../../client/src/theme'

const SUB_TABS = ['cutscenes', 'thoughts', 'notices', 'director']

function CutsceneEditor({ data, update }) {
  const [selected, setSelected] = useState(null)
  const ids = Object.keys(data.cutscenes || {})
  const activeId = selected && ids.includes(selected) ? selected : ids[0] || null
  const cs = activeId ? data.cutscenes[activeId] : null

  return (
    <div style={{ display: 'flex', gap: T.sp[5] }}>
      <div style={{ width: 140, flexShrink: 0 }}>
        {ids.map(id => (
          <button key={id} onClick={() => setSelected(id)} style={listBtnStyle(activeId === id)}>
            {id}
          </button>
        ))}
        <button
          onClick={() => {
            const id = prompt('Cutscene ID:')
            if (!id) return
            update(d => {
              if (!d.cutscenes) d.cutscenes = {}
              d.cutscenes[id] = { lines: [''], color: '#8af', lineDelay: 200 }
            })
            setSelected(id)
          }}
          style={addBtnStyle}
        >
          + Add cutscene
        </button>
      </div>
      {cs && (
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: T.sp[4], marginBottom: T.sp[4] }}>
            <div>
              <label style={labelStyle}>Color</label>
              <input type="color" value={cs.color || '#8af'} onChange={e => update(d => { d.cutscenes[activeId].color = e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Line delay (ms)</label>
              <input type="number" value={cs.lineDelay ?? 200} onChange={e => update(d => { d.cutscenes[activeId].lineDelay = Number(e.target.value) })} style={{ ...inputStyle, width: 60 }} />
            </div>
          </div>
          <label style={labelStyle}>Lines (one per row)</label>
          <textarea
            value={(cs.lines || []).join('\n')}
            onChange={e => update(d => { d.cutscenes[activeId].lines = e.target.value.split('\n') })}
            style={{ ...inputStyle, width: '100%', minHeight: 200, resize: 'vertical' }}
          />
          <button
            onClick={() => { if (confirm(`Delete "${activeId}"?`)) { update(d => { delete d.cutscenes[activeId] }); setSelected(null) } }}
            style={{ ...delBtnStyle, marginTop: T.sp[3] }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

function ThoughtsEditor({ data, update }) {
  const [selected, setSelected] = useState(null)
  const contexts = Object.keys(data.thoughts || {})
  const activeCtx = selected && contexts.includes(selected) ? selected : contexts[0] || null
  const pool = activeCtx ? data.thoughts[activeCtx] : null

  return (
    <div style={{ display: 'flex', gap: T.sp[5] }}>
      <div style={{ width: 140, flexShrink: 0 }}>
        {contexts.map(c => (
          <button key={c} onClick={() => setSelected(c)} style={listBtnStyle(activeCtx === c)}>
            {c}
          </button>
        ))}
        <button
          onClick={() => {
            const id = prompt('Context (e.g. morning, cafe, combat):')
            if (!id) return
            update(d => {
              if (!d.thoughts) d.thoughts = {}
              d.thoughts[id] = [{ pool: [''] }]
            })
            setSelected(id)
          }}
          style={addBtnStyle}
        >
          + Add context
        </button>
      </div>
      {pool && (
        <div style={{ flex: 1 }}>
          {pool.map((entry, i) => (
            <div key={i} style={{ marginBottom: T.sp[4], padding: T.sp[3], border: `1px solid ${T.border}`, borderRadius: T.radius.sm }}>
              <div style={{ display: 'flex', gap: T.sp[2], alignItems: 'center', marginBottom: T.sp[2] }}>
                <label style={{ ...labelStyle, margin: 0 }}>Condition:</label>
                <input
                  value={entry.node || (entry.var ? `${entry.var} ${entry.eq !== undefined ? '= ' + entry.eq : entry.gte !== undefined ? '>= ' + entry.gte : '<= ' + entry.lte}` : '') || ''}
                  onChange={e => {
                    const v = e.target.value
                    update(d => {
                      const ent = d.thoughts[activeCtx][i]
                      delete ent.node; delete ent.var; delete ent.eq; delete ent.gte; delete ent.lte
                      if (v.includes(':')) ent.node = v
                      else if (v) ent.node = v
                    })
                  }}
                  placeholder="fallback (empty)"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={() => update(d => { d.thoughts[activeCtx].splice(i, 1) })} style={xBtnStyle}>{'\u00d7'}</button>
              </div>
              <textarea
                value={(entry.pool || []).join('\n')}
                onChange={e => update(d => { d.thoughts[activeCtx][i].pool = e.target.value.split('\n') })}
                style={{ ...inputStyle, width: '100%', minHeight: 60, resize: 'vertical' }}
              />
            </div>
          ))}
          <button
            onClick={() => update(d => { d.thoughts[activeCtx].push({ pool: [''] }) })}
            style={addBtnStyle}
          >
            + Add pool
          </button>
        </div>
      )}
    </div>
  )
}

function NoticesEditor({ data, update }) {
  const notices = data.notices || []
  return (
    <div>
      {notices.map((entry, i) => (
        <div key={i} style={{ display: 'flex', gap: T.sp[2], alignItems: 'flex-start', padding: `${T.sp[2]}px 0`, borderBottom: `1px solid ${T.border}` }}>
          <input
            value={entry.node || (entry.var ? `${entry.var}` : '') || ''}
            onChange={e => {
              const v = e.target.value
              update(d => {
                const ent = d.notices[i]
                delete ent.node; delete ent.var; delete ent.eq; delete ent.gte; delete ent.lte
                if (v.includes(':')) ent.node = v
                else if (v) ent.node = v
              })
            }}
            placeholder="condition"
            style={{ ...inputStyle, width: 120, flexShrink: 0 }}
          />
          <textarea
            value={entry.text || ''}
            onChange={e => update(d => { d.notices[i].text = e.target.value })}
            style={{ ...inputStyle, flex: 1, minHeight: 28, resize: 'vertical' }}
          />
          <button onClick={() => update(d => { d.notices.splice(i, 1) })} style={xBtnStyle}>{'\u00d7'}</button>
        </div>
      ))}
      <button onClick={() => update(d => { if (!d.notices) d.notices = []; d.notices.push({ text: '' }) })} style={addBtnStyle}>
        + Add notice
      </button>
    </div>
  )
}

function DirectorEditor({ data, update }) {
  const director = data.director || {}
  const days = Object.keys(director).sort((a, b) => Number(a) - Number(b))

  return (
    <div>
      {days.map(day => (
        <div key={day} style={{ marginBottom: T.sp[5] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: T.sp[2], marginBottom: T.sp[2] }}>
            <span style={{ fontSize: T.fontSize.xs, fontFamily: T.mono, color: T.accentColor }}>Day {day}</span>
            <button onClick={() => update(d => { delete d.director[day] })} style={xBtnStyle}>{'\u00d7'}</button>
          </div>
          <textarea
            value={(director[day] || []).join('\n')}
            onChange={e => update(d => { d.director[day] = e.target.value.split('\n') })}
            style={{ ...inputStyle, width: '100%', minHeight: 60, resize: 'vertical' }}
          />
        </div>
      ))}
      <button
        onClick={() => {
          const day = prompt('Day number:')
          if (!day) return
          update(d => { if (!d.director) d.director = {}; d.director[day] = [''] })
        }}
        style={addBtnStyle}
      >
        + Add day
      </button>
    </div>
  )
}

export default function ContentEditor({ data, update }) {
  const [subTab, setSubTab] = useState('cutscenes')

  return (
    <div>
      <div style={{ display: 'flex', gap: T.sp[1], marginBottom: T.sp[5] }}>
        {SUB_TABS.map(t => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            style={{
              padding: `${T.sp[2]}px ${T.sp[4]}px`,
              background: subTab === t ? T.surface : 'transparent',
              border: `1px solid ${subTab === t ? T.accentColor : T.border}`,
              borderRadius: T.radius.sm,
              color: subTab === t ? T.textBright : T.text,
              fontSize: T.fontSize.xs, fontFamily: T.mono,
              textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {subTab === 'cutscenes' && <CutsceneEditor data={data} update={update} />}
      {subTab === 'thoughts' && <ThoughtsEditor data={data} update={update} />}
      {subTab === 'notices' && <NoticesEditor data={data} update={update} />}
      {subTab === 'director' && <DirectorEditor data={data} update={update} />}
    </div>
  )
}

function listBtnStyle(active) {
  return {
    display: 'block', width: '100%', textAlign: 'left',
    padding: `${T.sp[2]}px ${T.sp[3]}px`,
    background: active ? T.surface : 'transparent',
    border: 'none', color: active ? T.textBright : T.text,
    fontSize: T.fontSize.xs, fontFamily: T.mono, cursor: 'pointer',
  }
}

const labelStyle = {
  display: 'block', fontSize: 9, color: T.muted,
  textTransform: 'uppercase', marginBottom: T.sp[1],
}

const inputStyle = {
  padding: `${T.sp[1]}px ${T.sp[2]}px`,
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

const xBtnStyle = {
  background: 'transparent', border: 'none',
  color: T.danger, fontSize: T.fontSize.sm, cursor: 'pointer',
}
