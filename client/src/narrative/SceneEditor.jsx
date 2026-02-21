import { useState } from 'react'
import { T } from '../theme'
import { uid } from './narrativeUtils'

function ConditionEditor({ condition, variables, graphNodes, onChange }) {
  const type = condition.node ? 'node' : condition.var !== undefined ? 'var' : 'always'

  return (
    <div style={{ display: 'flex', gap: T.sp[2], alignItems: 'center', flexWrap: 'wrap' }}>
      <select value={type} onChange={e => {
        const t = e.target.value
        if (t === 'always') onChange({})
        else if (t === 'node') onChange({ node: graphNodes[0] || 'arc:routine' })
        else onChange({ var: variables[0] || 'day', gte: 1 })
      }} style={selectStyle}>
        <option value="always">always</option>
        <option value="node">node</option>
        <option value="var">variable</option>
      </select>
      {type === 'node' && (
        <input value={condition.node || ''} onChange={e => onChange({ node: e.target.value })} placeholder="graph:node" style={{ ...inputStyle, width: 140 }} />
      )}
      {type === 'var' && (
        <>
          <select value={condition.var || ''} onChange={e => onChange({ ...condition, var: e.target.value })} style={selectStyle}>
            {variables.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select
            value={condition.eq !== undefined ? 'eq' : condition.gte !== undefined ? 'gte' : 'lte'}
            onChange={e => {
              const val = condition.eq ?? condition.gte ?? condition.lte ?? 0
              onChange({ var: condition.var, [e.target.value]: val })
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

const ROLE_ACTIONS = ['present', 'patrol', 'follow_player', 'wander', 'sit', 'guard', 'spawn']

function CastRow({ entry, actorIds, onUpdate, onDelete }) {
  return (
    <div style={{ display: 'flex', gap: T.sp[2], alignItems: 'center', padding: `${T.sp[2]}px 0`, borderBottom: `1px solid ${T.border}` }}>
      <select value={entry.actor || ''} onChange={e => onUpdate({ ...entry, actor: e.target.value })} style={{ ...selectStyle, minWidth: 90 }}>
        <option value="">--actor--</option>
        {actorIds.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
      <select value={entry.action || 'present'} onChange={e => onUpdate({ ...entry, action: e.target.value })} style={selectStyle}>
        {ROLE_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
      {(entry.action === 'spawn') && (
        <input type="number" value={entry.count ?? 1} onChange={e => onUpdate({ ...entry, count: Number(e.target.value) })} title="count" style={{ ...inputStyle, width: 40 }} />
      )}
      <input value={entry.zone || ''} onChange={e => onUpdate({ ...entry, zone: e.target.value })} placeholder="zone" style={{ ...inputStyle, width: 60 }} />
      <input value={entry.dialogue || ''} onChange={e => onUpdate({ ...entry, dialogue: e.target.value })} placeholder="dialogue..." style={{ ...inputStyle, flex: 1 }} />
      <button onClick={onDelete} style={xBtnStyle}>{'\u00d7'}</button>
    </div>
  )
}

const EFFECT_TYPES = ['visual', 'sound', 'cutscene', 'setVar', 'message']

function EffectRow({ effect, onUpdate, onDelete }) {
  return (
    <div style={{ display: 'flex', gap: T.sp[2], alignItems: 'center', padding: `${T.sp[2]}px 0`, borderBottom: `1px solid ${T.border}` }}>
      <select value={effect.type || 'visual'} onChange={e => onUpdate({ ...effect, type: e.target.value })} style={selectStyle}>
        {EFFECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      {effect.type === 'visual' && (
        <input value={effect.name || ''} onChange={e => onUpdate({ ...effect, name: e.target.value })} placeholder="effect name" style={{ ...inputStyle, width: 120 }} />
      )}
      {effect.type === 'sound' && (
        <input value={effect.name || ''} onChange={e => onUpdate({ ...effect, name: e.target.value })} placeholder="sound id" style={{ ...inputStyle, width: 120 }} />
      )}
      {effect.type === 'cutscene' && (
        <input value={effect.id || ''} onChange={e => onUpdate({ ...effect, id: e.target.value })} placeholder="cutscene id" style={{ ...inputStyle, width: 120 }} />
      )}
      {effect.type === 'setVar' && (
        <>
          <input value={effect.name || ''} onChange={e => onUpdate({ ...effect, name: e.target.value })} placeholder="var" style={{ ...inputStyle, width: 100 }} />
          <span style={{ color: T.muted, fontSize: T.fontSize.xs }}>=</span>
          <input
            value={String(effect.value ?? '')}
            onChange={e => {
              const raw = e.target.value
              const val = raw === 'true' ? true : raw === 'false' ? false : isNaN(Number(raw)) ? raw : Number(raw)
              onUpdate({ ...effect, value: val })
            }}
            style={{ ...inputStyle, width: 50 }}
          />
        </>
      )}
      {effect.type === 'message' && (
        <input value={effect.text || ''} onChange={e => onUpdate({ ...effect, text: e.target.value })} placeholder="text" style={{ ...inputStyle, flex: 1 }} />
      )}
      <button onClick={onDelete} style={xBtnStyle}>{'\u00d7'}</button>
    </div>
  )
}

export default function SceneEditor({ data, update }) {
  const [selected, setSelected] = useState(null)
  const scenes = data.scenes || []
  const activeIdx = selected !== null && selected < scenes.length ? selected : scenes.length > 0 ? 0 : null
  const scene = activeIdx !== null ? scenes[activeIdx] : null
  const variables = Object.keys(data.variables || {})
  const graphNodes = Object.entries(data.graphs || {}).flatMap(([gId, g]) =>
    (g.nodes || []).map(n => `${gId}:${n.id}`)
  )
  const actorIds = Object.keys(data.actors || {})

  return (
    <div style={{ display: 'flex', gap: T.sp[5] }}>
      {/* Scene list */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={headingStyle}>Scenes ({scenes.length})</div>
        {scenes.map((s, i) => (
          <button
            key={s.id || i}
            onClick={() => setSelected(i)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: `${T.sp[2]}px ${T.sp[3]}px`, marginBottom: 1,
              background: activeIdx === i ? T.surface : 'transparent',
              border: 'none', color: activeIdx === i ? T.textBright : T.text,
              fontSize: T.fontSize.xs, fontFamily: T.mono, cursor: 'pointer',
            }}
          >
            <div>{s.label || s.id || `scene_${i}`}</div>
            <div style={{ fontSize: 9, color: T.muted, marginTop: 1 }}>
              {s.cast?.length || 0} actors, {s.effects?.length || 0} effects
            </div>
          </button>
        ))}
        <button
          onClick={() => {
            const id = uid('scene')
            update(d => {
              if (!d.scenes) d.scenes = []
              d.scenes.push({ id, label: 'New scene', condition: {}, cast: [], effects: [] })
            })
            setSelected(scenes.length)
          }}
          style={addBtnStyle}
        >
          + Add scene
        </button>
      </div>

      {/* Scene detail */}
      {scene && (
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* ID + Label */}
          <div style={{ display: 'flex', gap: T.sp[4], marginBottom: T.sp[4] }}>
            <div>
              <label style={labelStyle}>ID</label>
              <input value={scene.id || ''} onChange={e => update(d => { d.scenes[activeIdx].id = e.target.value })} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Label</label>
              <input value={scene.label || ''} onChange={e => update(d => { d.scenes[activeIdx].label = e.target.value })} style={{ ...inputStyle, width: '100%' }} />
            </div>
          </div>

          {/* Condition */}
          <div style={{ marginBottom: T.sp[5] }}>
            <div style={headingStyle}>When (condition)</div>
            <ConditionEditor
              condition={scene.condition || {}}
              variables={variables}
              graphNodes={graphNodes}
              onChange={cond => update(d => { d.scenes[activeIdx].condition = cond })}
            />
          </div>

          {/* Cast */}
          <div style={{ marginBottom: T.sp[5] }}>
            <div style={headingStyle}>Cast (actors in scene)</div>
            {(scene.cast || []).map((entry, i) => (
              <CastRow
                key={i}
                entry={entry}
                actorIds={actorIds}
                onUpdate={newEntry => update(d => { d.scenes[activeIdx].cast[i] = newEntry })}
                onDelete={() => update(d => { d.scenes[activeIdx].cast.splice(i, 1) })}
              />
            ))}
            <button
              onClick={() => update(d => {
                if (!d.scenes[activeIdx].cast) d.scenes[activeIdx].cast = []
                d.scenes[activeIdx].cast.push({ actor: actorIds[0] || '', action: 'present', zone: '' })
              })}
              style={{ ...addBtnStyle, marginTop: T.sp[2] }}
            >
              + Add actor to scene
            </button>
          </div>

          {/* Effects */}
          <div style={{ marginBottom: T.sp[5] }}>
            <div style={headingStyle}>Effects</div>
            {(scene.effects || []).map((effect, i) => (
              <EffectRow
                key={i}
                effect={effect}
                onUpdate={newEff => update(d => { d.scenes[activeIdx].effects[i] = newEff })}
                onDelete={() => update(d => { d.scenes[activeIdx].effects.splice(i, 1) })}
              />
            ))}
            <button
              onClick={() => update(d => {
                if (!d.scenes[activeIdx].effects) d.scenes[activeIdx].effects = []
                d.scenes[activeIdx].effects.push({ type: 'visual', name: '' })
              })}
              style={{ ...addBtnStyle, marginTop: T.sp[2] }}
            >
              + Add effect
            </button>
          </div>

          {/* Delete */}
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: T.sp[4] }}>
            <button
              onClick={() => {
                update(d => { d.scenes.splice(activeIdx, 1) })
                setSelected(null)
              }}
              style={delBtnStyle}
            >
              Delete scene
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
