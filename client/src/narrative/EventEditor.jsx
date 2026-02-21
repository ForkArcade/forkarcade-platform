import { useState } from 'react'
import { T } from '../theme'
import { uid } from './narrativeUtils'

const ACTION_TYPES = ['spawn', 'effect', 'setVar', 'cutscene', 'message']

function ConditionEditor({ condition, variables, graphNodes, onChange }) {
  const type = condition.node ? 'node' : condition.var !== undefined ? 'var' : 'none'

  return (
    <div style={{ display: 'flex', gap: T.sp[2], alignItems: 'center', flexWrap: 'wrap' }}>
      <select
        value={type}
        onChange={e => {
          const t = e.target.value
          if (t === 'none') onChange({})
          else if (t === 'node') onChange({ node: graphNodes[0] || 'arc:routine' })
          else onChange({ var: variables[0] || 'day', gte: 1 })
        }}
        style={selectStyle}
      >
        <option value="none">always</option>
        <option value="node">node</option>
        <option value="var">variable</option>
      </select>
      {type === 'node' && (
        <input
          value={condition.node || ''}
          onChange={e => onChange({ node: e.target.value })}
          placeholder="graph:node"
          style={{ ...inputStyle, width: 140 }}
        />
      )}
      {type === 'var' && (
        <>
          <select value={condition.var || ''} onChange={e => onChange({ ...condition, var: e.target.value })} style={selectStyle}>
            {variables.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select
            value={condition.eq !== undefined ? 'eq' : condition.gte !== undefined ? 'gte' : condition.lte !== undefined ? 'lte' : 'eq'}
            onChange={e => {
              const op = e.target.value
              const val = condition.eq ?? condition.gte ?? condition.lte ?? 0
              onChange({ var: condition.var, [op]: val })
            }}
            style={selectStyle}
          >
            <option value="eq">=</option>
            <option value="gte">&gt;=</option>
            <option value="lte">&lt;=</option>
          </select>
          <input
            value={String(condition.eq ?? condition.gte ?? condition.lte ?? '')}
            onChange={e => {
              const raw = e.target.value
              const val = raw === 'true' ? true : raw === 'false' ? false : isNaN(Number(raw)) ? raw : Number(raw)
              const op = condition.eq !== undefined ? 'eq' : condition.gte !== undefined ? 'gte' : 'lte'
              onChange({ var: condition.var, [op]: val })
            }}
            style={{ ...inputStyle, width: 50 }}
          />
        </>
      )}
    </div>
  )
}

function ActionRow({ action, onUpdate, onDelete }) {
  return (
    <div style={{ display: 'flex', gap: T.sp[2], alignItems: 'center', padding: `${T.sp[2]}px 0`, borderBottom: `1px solid ${T.border}` }}>
      <select value={action.type || 'effect'} onChange={e => onUpdate({ ...action, type: e.target.value })} style={selectStyle}>
        {ACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      {action.type === 'spawn' && (
        <>
          <input value={action.entity || ''} onChange={e => onUpdate({ ...action, entity: e.target.value })} placeholder="entity" style={{ ...inputStyle, width: 80 }} />
          <input type="number" value={action.count ?? 1} onChange={e => onUpdate({ ...action, count: Number(e.target.value) })} style={{ ...inputStyle, width: 40 }} title="count" />
          <input value={action.zone || ''} onChange={e => onUpdate({ ...action, zone: e.target.value })} placeholder="zone" style={{ ...inputStyle, width: 60 }} />
        </>
      )}
      {action.type === 'effect' && (
        <input value={action.name || ''} onChange={e => onUpdate({ ...action, name: e.target.value })} placeholder="effect name" style={{ ...inputStyle, width: 120 }} />
      )}
      {action.type === 'setVar' && (
        <>
          <input value={action.name || ''} onChange={e => onUpdate({ ...action, name: e.target.value })} placeholder="var name" style={{ ...inputStyle, width: 100 }} />
          <span style={{ color: T.muted, fontSize: T.fontSize.xs }}>=</span>
          <input
            value={String(action.value ?? '')}
            onChange={e => {
              const raw = e.target.value
              const val = raw === 'true' ? true : raw === 'false' ? false : isNaN(Number(raw)) ? raw : Number(raw)
              onUpdate({ ...action, value: val })
            }}
            placeholder="value"
            style={{ ...inputStyle, width: 60 }}
          />
        </>
      )}
      {action.type === 'cutscene' && (
        <input value={action.id || ''} onChange={e => onUpdate({ ...action, id: e.target.value })} placeholder="cutscene id" style={{ ...inputStyle, width: 120 }} />
      )}
      {action.type === 'message' && (
        <input value={action.text || ''} onChange={e => onUpdate({ ...action, text: e.target.value })} placeholder="message text" style={{ ...inputStyle, flex: 1 }} />
      )}
      <button onClick={onDelete} style={xBtnStyle}>{'\u00d7'}</button>
    </div>
  )
}

export default function EventEditor({ data, update }) {
  const [selected, setSelected] = useState(null)
  const events = data.events || []
  const activeIdx = selected !== null && selected < events.length ? selected : events.length > 0 ? 0 : null
  const evt = activeIdx !== null ? events[activeIdx] : null
  const variables = Object.keys(data.variables || {})
  const graphNodes = Object.entries(data.graphs || {}).flatMap(([gId, g]) =>
    (g.nodes || []).map(n => `${gId}:${n.id}`)
  )

  return (
    <div style={{ display: 'flex', gap: T.sp[5] }}>
      {/* Event list */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={headingStyle}>Events ({events.length})</div>
        {events.map((ev, i) => (
          <button
            key={ev.id || i}
            onClick={() => setSelected(i)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: `${T.sp[2]}px ${T.sp[3]}px`, marginBottom: 1,
              background: activeIdx === i ? T.surface : 'transparent',
              border: 'none', color: activeIdx === i ? T.textBright : T.text,
              fontSize: T.fontSize.xs, fontFamily: T.mono, cursor: 'pointer',
            }}
          >
            <div>{ev.label || ev.id || `event_${i}`}</div>
            <div style={{ fontSize: 9, color: T.muted, marginTop: 1 }}>
              {ev.actions?.length || 0} action{(ev.actions?.length || 0) !== 1 ? 's' : ''}
            </div>
          </button>
        ))}
        <button
          onClick={() => {
            const id = uid('evt')
            update(d => {
              if (!d.events) d.events = []
              d.events.push({ id, label: 'New event', condition: {}, actions: [{ type: 'effect', name: '' }] })
            })
            setSelected(events.length)
          }}
          style={addBtnStyle}
        >
          + Add event
        </button>
      </div>

      {/* Event detail */}
      {evt && (
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* ID + Label */}
          <div style={{ display: 'flex', gap: T.sp[4], marginBottom: T.sp[5] }}>
            <div>
              <label style={labelStyle}>ID</label>
              <input
                value={evt.id || ''}
                onChange={e => update(d => { d.events[activeIdx].id = e.target.value })}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Label</label>
              <input
                value={evt.label || ''}
                onChange={e => update(d => { d.events[activeIdx].label = e.target.value })}
                style={{ ...inputStyle, width: '100%' }}
              />
            </div>
          </div>

          {/* Condition */}
          <div style={{ marginBottom: T.sp[5] }}>
            <div style={headingStyle}>Condition</div>
            <ConditionEditor
              condition={evt.condition || {}}
              variables={variables}
              graphNodes={graphNodes}
              onChange={cond => update(d => { d.events[activeIdx].condition = cond })}
            />
          </div>

          {/* Actions */}
          <div>
            <div style={headingStyle}>Actions</div>
            {(evt.actions || []).map((action, ai) => (
              <ActionRow
                key={ai}
                action={action}
                onUpdate={newAction => update(d => { d.events[activeIdx].actions[ai] = newAction })}
                onDelete={() => update(d => { d.events[activeIdx].actions.splice(ai, 1) })}
              />
            ))}
            <button
              onClick={() => update(d => {
                if (!d.events[activeIdx].actions) d.events[activeIdx].actions = []
                d.events[activeIdx].actions.push({ type: 'effect', name: '' })
              })}
              style={{ ...addBtnStyle, marginTop: T.sp[3] }}
            >
              + Add action
            </button>
          </div>

          {/* Delete event */}
          <div style={{ marginTop: T.sp[6], borderTop: `1px solid ${T.border}`, paddingTop: T.sp[4] }}>
            <button
              onClick={() => {
                update(d => { d.events.splice(activeIdx, 1) })
                setSelected(null)
              }}
              style={delBtnStyle}
            >
              Delete event
            </button>
          </div>
        </div>
      )}
    </div>
  )
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

const headingStyle = {
  fontSize: 9, fontFamily: T.mono, color: T.muted,
  textTransform: 'uppercase', letterSpacing: T.tracking.widest,
  marginBottom: T.sp[3],
}

const labelStyle = {
  display: 'block', fontSize: 9, color: T.muted,
  textTransform: 'uppercase', marginBottom: T.sp[1],
}

const addBtnStyle = {
  background: 'transparent', border: `1px dashed ${T.border}`,
  borderRadius: T.radius.sm, color: T.muted,
  fontSize: T.fontSize.xs, fontFamily: T.mono,
  padding: `${T.sp[2]}px ${T.sp[3]}px`, cursor: 'pointer',
  width: '100%',
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
