import { T } from '../theme'

function NeedsSection({ data, update }) {
  const needs = data.needs || {}
  const ids = Object.keys(needs)

  return (
    <div>
      <div style={headingStyle}>Needs ({ids.length})</div>
      {ids.length > 0 && (
        <div style={{ display: 'flex', gap: T.sp[2], marginBottom: T.sp[2] }}>
          <span style={{ ...thStyle, width: 80 }}>ID</span>
          <span style={{ ...thStyle, width: 80 }}>Label</span>
          <span style={{ ...thStyle, width: 60 }}>Decay</span>
          <span style={{ ...thStyle, width: 60 }}>Critical</span>
          <span style={{ ...thStyle, width: 24 }}></span>
        </div>
      )}
      {ids.map(id => {
        const n = needs[id]
        return (
          <div key={id} style={{ display: 'flex', gap: T.sp[2], alignItems: 'center', marginBottom: T.sp[1] }}>
            <span style={{ width: 80, fontSize: T.fontSize.xs, fontFamily: T.mono, color: T.textBright }}>{id}</span>
            <input value={n.label || ''} onChange={e => update(d => { d.needs[id].label = e.target.value })} style={{ ...inputStyle, width: 80 }} />
            <input type="number" step="0.01" value={n.decay ?? 0} onChange={e => update(d => { d.needs[id].decay = Number(e.target.value) })} style={{ ...inputStyle, width: 60 }} />
            <input type="number" value={n.critical ?? 0} onChange={e => update(d => { d.needs[id].critical = Number(e.target.value) })} style={{ ...inputStyle, width: 60 }} />
            <button onClick={() => { if (confirm(`Delete need "${id}"?`)) update(d => { delete d.needs[id] }) }} style={xBtnStyle}>{'\u00d7'}</button>
          </div>
        )
      })}
      <button
        onClick={() => {
          const id = prompt('Need ID (e.g. hunger, safety, social):')
          if (!id) return
          update(d => {
            if (!d.needs) d.needs = {}
            d.needs[id] = { label: id, decay: 0.1, critical: 20 }
          })
        }}
        style={addBtnStyle}
      >
        + Add need
      </button>
    </div>
  )
}

function JobsSection({ data, update }) {
  const jobs = data.jobs || {}
  const ids = Object.keys(jobs)
  const needIds = Object.keys(data.needs || {})

  return (
    <div>
      <div style={headingStyle}>Jobs ({ids.length})</div>
      {ids.length > 0 && (
        <div style={{ display: 'flex', gap: T.sp[2], marginBottom: T.sp[2] }}>
          <span style={{ ...thStyle, width: 70 }}>ID</span>
          <span style={{ ...thStyle, width: 80 }}>Label</span>
          <span style={{ ...thStyle, width: 80 }}>Fulfills</span>
          <span style={{ ...thStyle, width: 50 }}>Restore</span>
          <span style={{ ...thStyle, width: 50 }}>Duration</span>
          <span style={{ ...thStyle, width: 70 }}>Zone</span>
          <span style={{ ...thStyle, width: 24 }}></span>
        </div>
      )}
      {ids.map(id => {
        const j = jobs[id]
        return (
          <div key={id} style={{ display: 'flex', gap: T.sp[2], alignItems: 'center', marginBottom: T.sp[1] }}>
            <span style={{ width: 70, fontSize: T.fontSize.xs, fontFamily: T.mono, color: T.textBright }}>{id}</span>
            <input value={j.label || ''} onChange={e => update(d => { d.jobs[id].label = e.target.value })} style={{ ...inputStyle, width: 80 }} />
            <select value={j.fulfills || ''} onChange={e => update(d => { d.jobs[id].fulfills = e.target.value || null })} style={{ ...selectStyle, width: 80 }}>
              <option value="">none</option>
              {needIds.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <input type="number" value={j.restore ?? 0} onChange={e => update(d => { d.jobs[id].restore = Number(e.target.value) })} style={{ ...inputStyle, width: 50 }} />
            <input type="number" value={j.duration ?? 1} onChange={e => update(d => { d.jobs[id].duration = Number(e.target.value) })} style={{ ...inputStyle, width: 50 }} />
            <input value={j.zone || ''} onChange={e => update(d => { d.jobs[id].zone = e.target.value })} placeholder="-" style={{ ...inputStyle, width: 70 }} />
            <button onClick={() => { if (confirm(`Delete job "${id}"?`)) update(d => { delete d.jobs[id] }) }} style={xBtnStyle}>{'\u00d7'}</button>
          </div>
        )
      })}
      <button
        onClick={() => {
          const id = prompt('Job ID (e.g. eat, patrol, talk):')
          if (!id) return
          update(d => {
            if (!d.jobs) d.jobs = {}
            d.jobs[id] = { label: id, fulfills: needIds[0] || null, restore: 30, duration: 3 }
          })
        }}
        style={addBtnStyle}
      >
        + Add job
      </button>
    </div>
  )
}

function MoodsSection({ data, update }) {
  const moods = data.moods || {}
  const keys = Object.keys(moods)

  return (
    <div>
      <div style={headingStyle}>Mood events ({keys.length})</div>
      {keys.length > 0 && (
        <div style={{ display: 'flex', gap: T.sp[2], marginBottom: T.sp[2] }}>
          <span style={{ ...thStyle, width: 140 }}>Event</span>
          <span style={{ ...thStyle, width: 60 }}>Value</span>
          <span style={{ ...thStyle, width: 24 }}></span>
        </div>
      )}
      {keys.map(key => (
        <div key={key} style={{ display: 'flex', gap: T.sp[2], alignItems: 'center', marginBottom: T.sp[1] }}>
          <span style={{ width: 140, fontSize: T.fontSize.xs, fontFamily: T.mono, color: T.textBright }}>{key}</span>
          <input
            type="number"
            value={moods[key]}
            onChange={e => update(d => { d.moods[key] = Number(e.target.value) })}
            style={{ ...inputStyle, width: 60, color: moods[key] >= 0 ? T.success : T.danger }}
          />
          <button onClick={() => update(d => { delete d.moods[key] })} style={xBtnStyle}>{'\u00d7'}</button>
        </div>
      ))}
      <button
        onClick={() => {
          const key = prompt('Mood event key (e.g. saw_combat, had_meal):')
          if (!key) return
          update(d => {
            if (!d.moods) d.moods = {}
            d.moods[key] = 0
          })
        }}
        style={addBtnStyle}
      >
        + Add mood event
      </button>
    </div>
  )
}

export default function SimulationEditor({ data, update }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: T.sp[7] }}>
      <NeedsSection data={data} update={update} />
      <JobsSection data={data} update={update} />
      <MoodsSection data={data} update={update} />
    </div>
  )
}

const headingStyle = {
  fontSize: 9, fontFamily: T.mono, color: T.muted,
  textTransform: 'uppercase', letterSpacing: T.tracking.widest,
  marginBottom: T.sp[3],
}

const thStyle = {
  fontSize: 9, fontFamily: T.mono, color: T.muted,
  textTransform: 'uppercase',
}

const inputStyle = {
  padding: `${T.sp[1]}px ${T.sp[2]}px`,
  background: T.surface, border: `1px solid ${T.border}`,
  borderRadius: T.radius.sm, color: T.textBright,
  fontFamily: T.mono, fontSize: T.fontSize.xs,
  boxSizing: 'border-box',
}

const selectStyle = {
  padding: `${T.sp[1]}px ${T.sp[2]}px`,
  background: T.surface, border: `1px solid ${T.border}`,
  borderRadius: T.radius.sm, color: T.textBright,
  fontFamily: T.mono, fontSize: T.fontSize.xs,
}

const addBtnStyle = {
  background: 'transparent', border: `1px dashed ${T.border}`,
  borderRadius: T.radius.sm, color: T.muted,
  fontSize: T.fontSize.xs, fontFamily: T.mono,
  padding: `${T.sp[2]}px ${T.sp[3]}px`, cursor: 'pointer',
  width: '100%', marginTop: T.sp[3],
}

const xBtnStyle = {
  background: 'transparent', border: 'none',
  color: T.danger, fontSize: T.fontSize.sm, cursor: 'pointer',
}
