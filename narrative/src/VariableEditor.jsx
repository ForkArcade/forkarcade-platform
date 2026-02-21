import { useState } from 'react'
import { T } from '../../client/src/theme'

export default function VariableEditor({ data, update }) {
  const [newName, setNewName] = useState('')
  const vars = data.variables || {}
  const entries = Object.entries(vars)

  return (
    <div>
      <div style={headingStyle}>Variables ({entries.length})</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.mono, fontSize: T.fontSize.xs }}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Default</th>
            <th style={thStyle}>Type</th>
            <th style={{ ...thStyle, width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([name, value]) => (
            <tr key={name}>
              <td style={tdStyle}>
                <span style={{ color: T.textBright }}>{name}</span>
              </td>
              <td style={tdStyle}>
                <input
                  value={String(value)}
                  onChange={e => {
                    const raw = e.target.value
                    const val = raw === 'true' ? true : raw === 'false' ? false : isNaN(Number(raw)) ? raw : Number(raw)
                    update(d => { d.variables[name] = val })
                  }}
                  style={inputStyle}
                />
              </td>
              <td style={tdStyle}>
                <span style={{ color: typeColor(value) }}>{typeof value}</span>
              </td>
              <td style={tdStyle}>
                <button
                  onClick={() => update(d => { delete d.variables[name] })}
                  style={delBtnStyle}
                >
                  {'\u00d7'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: T.sp[2], marginTop: T.sp[4] }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="variable_name"
          onKeyDown={e => {
            if (e.key === 'Enter' && newName.trim()) {
              update(d => { d.variables[newName.trim()] = 0 })
              setNewName('')
            }
          }}
          style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
        />
        <button
          onClick={() => {
            if (!newName.trim()) return
            update(d => { d.variables[newName.trim()] = 0 })
            setNewName('')
          }}
          style={addBtnStyle}
        >
          + Add
        </button>
      </div>
    </div>
  )
}

function typeColor(v) {
  if (typeof v === 'boolean') return v ? T.success : T.danger
  if (typeof v === 'number') return '#4ef'
  return T.text
}

const headingStyle = {
  fontSize: 9, fontFamily: T.mono, color: T.muted,
  textTransform: 'uppercase', letterSpacing: T.tracking.widest,
  marginBottom: T.sp[4],
}

const thStyle = {
  textAlign: 'left', padding: `${T.sp[2]}px ${T.sp[3]}px`,
  borderBottom: `1px solid ${T.border}`, color: T.muted,
  fontSize: 9, textTransform: 'uppercase',
}

const tdStyle = {
  padding: `${T.sp[2]}px ${T.sp[3]}px`,
  borderBottom: `1px solid ${T.border}`,
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
}

const delBtnStyle = {
  background: 'transparent', border: 'none',
  color: T.danger, fontSize: T.fontSize.sm, cursor: 'pointer',
}
