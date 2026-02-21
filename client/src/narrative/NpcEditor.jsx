import { useState } from 'react'
import { T } from '../theme'
import { conditionLabel } from './narrativeUtils'

const TIME_PERIODS = ['morning', 'midday', 'evening']
const LOCATIONS = ['home', 'cafe', 'terminal', 'garden', 'wander', 'player']

function BehaviorRow({ rule, graphNodes, variables, onUpdate, onDelete }) {
  const condition = rule.node ? { type: 'node', value: rule.node }
    : rule.var !== undefined ? { type: 'var', value: rule.var, op: rule.eq !== undefined ? 'eq' : rule.gte !== undefined ? 'gte' : 'lte', val: rule.eq ?? rule.gte ?? rule.lte ?? 0 }
    : { type: 'fallback' }

  return (
    <div style={{ display: 'flex', gap: T.sp[2], alignItems: 'center', padding: `${T.sp[2]}px 0`, borderBottom: `1px solid ${T.border}`, flexWrap: 'wrap' }}>
      <div style={{ minWidth: 140, fontSize: T.fontSize.xs }}>
        <select
          value={condition.type}
          onChange={e => {
            const t = e.target.value
            const schedule = rule.schedule || {}
            if (t === 'fallback') onUpdate({ schedule })
            else if (t === 'node') onUpdate({ node: graphNodes[0] || 'arc:routine', schedule })
            else onUpdate({ var: variables[0] || 'day', eq: 0, schedule })
          }}
          style={selectStyle}
        >
          <option value="fallback">fallback</option>
          <option value="node">node</option>
          <option value="var">variable</option>
        </select>
        {condition.type === 'node' && (
          <input
            value={rule.node || ''}
            onChange={e => onUpdate({ ...rule, node: e.target.value })}
            placeholder="graph:node"
            style={{ ...inputStyle, width: 120, marginLeft: T.sp[1] }}
          />
        )}
        {condition.type === 'var' && (
          <span style={{ marginLeft: T.sp[1] }}>
            <select value={rule.var || ''} onChange={e => onUpdate({ ...rule, var: e.target.value })} style={selectStyle}>
              {variables.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select
              value={rule.eq !== undefined ? 'eq' : rule.gte !== undefined ? 'gte' : 'lte'}
              onChange={e => {
                const { eq, gte, lte, ...rest } = rule
                const val = eq ?? gte ?? lte ?? 0
                onUpdate({ ...rest, [e.target.value]: val })
              }}
              style={{ ...selectStyle, marginLeft: 2 }}
            >
              <option value="eq">=</option>
              <option value="gte">&gt;=</option>
              <option value="lte">&lt;=</option>
            </select>
            <input
              value={String(rule.eq ?? rule.gte ?? rule.lte ?? '')}
              onChange={e => {
                const raw = e.target.value
                const val = raw === 'true' ? true : raw === 'false' ? false : isNaN(Number(raw)) ? raw : Number(raw)
                const op = rule.eq !== undefined ? 'eq' : rule.gte !== undefined ? 'gte' : 'lte'
                const { eq, gte, lte, ...rest } = rule
                onUpdate({ ...rest, [op]: val })
              }}
              style={{ ...inputStyle, width: 40, marginLeft: 2 }}
            />
          </span>
        )}
      </div>
      {TIME_PERIODS.map(tp => (
        <select
          key={tp}
          value={rule.schedule?.[tp] || 'home'}
          onChange={e => onUpdate({ ...rule, schedule: { ...rule.schedule, [tp]: e.target.value } })}
          style={selectStyle}
          title={tp}
        >
          {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      ))}
      <button onClick={onDelete} style={delBtnStyle}>{'\u00d7'}</button>
    </div>
  )
}

function DialogueRow({ entry, onUpdate, onDelete }) {
  return (
    <div style={{ display: 'flex', gap: T.sp[2], alignItems: 'flex-start', padding: `${T.sp[2]}px 0`, borderBottom: `1px solid ${T.border}` }}>
      <div style={{ minWidth: 100, flexShrink: 0 }}>
        <input
          value={entry.node || (entry.var ? `${entry.var} ${entry.eq !== undefined ? '=' : entry.gte !== undefined ? '>=' : '<='} ${entry.eq ?? entry.gte ?? entry.lte ?? ''}` : '') || ''}
          onChange={e => {
            const v = e.target.value
            if (!v) {
              onUpdate({ text: entry.text })
            } else if (v.includes(':')) {
              onUpdate({ node: v, text: entry.text })
            } else {
              onUpdate({ node: v, text: entry.text })
            }
          }}
          placeholder="condition"
          style={{ ...inputStyle, width: 100 }}
          title="node:id or leave empty for fallback"
        />
      </div>
      <textarea
        value={entry.text || ''}
        onChange={e => onUpdate({ ...entry, text: e.target.value })}
        style={{ ...inputStyle, flex: 1, minHeight: 32, resize: 'vertical' }}
      />
      <button onClick={onDelete} style={delBtnStyle}>{'\u00d7'}</button>
    </div>
  )
}

export default function NpcEditor({ data, update }) {
  const [selectedNpc, setSelectedNpc] = useState(null)
  const npcIds = Object.keys(data.npcs || {})
  const activeId = selectedNpc && npcIds.includes(selectedNpc) ? selectedNpc : npcIds[0] || null
  const npc = activeId ? data.npcs[activeId] : null
  const variables = Object.keys(data.variables || {})
  const graphNodes = Object.entries(data.graphs || {}).flatMap(([gId, g]) =>
    (g.nodes || []).map(n => `${gId}:${n.id}`)
  )

  return (
    <div style={{ display: 'flex', gap: T.sp[5] }}>
      {/* NPC list */}
      <div style={{ width: 140, flexShrink: 0 }}>
        <div style={headingStyle}>NPCs</div>
        {npcIds.map(id => (
          <button
            key={id}
            onClick={() => setSelectedNpc(id)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: `${T.sp[2]}px ${T.sp[3]}px`,
              background: activeId === id ? T.surface : 'transparent',
              border: 'none', color: activeId === id ? T.textBright : T.text,
              fontSize: T.fontSize.xs, fontFamily: T.mono, cursor: 'pointer',
            }}
          >
            {data.npcs[id].name || id}
          </button>
        ))}
        <button
          onClick={() => {
            const id = prompt('NPC ID (e.g. npc_name):')
            if (!id) return
            update(d => {
              if (!d.npcs) d.npcs = {}
              d.npcs[id] = { name: id, sprite: `npcs/${id}`, appearsDay: 1, behaviors: [{ schedule: { morning: 'home', midday: 'wander', evening: 'home' } }], dialogues: [{ text: 'Hello.' }], systemDialogue: { ally: '', traitor: '', neutral: '' } }
            })
            setSelectedNpc(id)
          }}
          style={{ ...addBtnStyle, marginTop: T.sp[3] }}
        >
          + Add NPC
        </button>
      </div>

      {/* NPC details */}
      {npc && (
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Basic props */}
          <div style={headingStyle}>Properties</div>
          <div style={{ display: 'flex', gap: T.sp[4], marginBottom: T.sp[5], flexWrap: 'wrap' }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input value={npc.name || ''} onChange={e => update(d => { d.npcs[activeId].name = e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Sprite</label>
              <input value={npc.sprite || ''} onChange={e => update(d => { d.npcs[activeId].sprite = e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Appears day</label>
              <input type="number" value={npc.appearsDay ?? 1} onChange={e => update(d => { d.npcs[activeId].appearsDay = Number(e.target.value) })} style={{ ...inputStyle, width: 50 }} />
            </div>
          </div>

          {/* Behaviors */}
          <div style={headingStyle}>
            Behaviors (FA.select)
            <span style={{ color: T.muted, fontWeight: 'normal', textTransform: 'none', letterSpacing: 0, marginLeft: T.sp[2] }}>
              morning / midday / evening
            </span>
          </div>
          {(npc.behaviors || []).map((rule, i) => (
            <BehaviorRow
              key={i}
              rule={rule}
              graphNodes={graphNodes}
              variables={variables}
              onUpdate={newRule => update(d => { d.npcs[activeId].behaviors[i] = newRule })}
              onDelete={() => update(d => { d.npcs[activeId].behaviors.splice(i, 1) })}
            />
          ))}
          <button
            onClick={() => update(d => { d.npcs[activeId].behaviors.push({ schedule: { morning: 'home', midday: 'wander', evening: 'home' } }) })}
            style={{ ...addBtnStyle, marginTop: T.sp[3] }}
          >
            + Add behavior rule
          </button>

          {/* Dialogues */}
          <div style={{ ...headingStyle, marginTop: T.sp[6] }}>Dialogues (FA.select)</div>
          {(npc.dialogues || []).map((entry, i) => (
            <DialogueRow
              key={i}
              entry={entry}
              onUpdate={newEntry => update(d => { d.npcs[activeId].dialogues[i] = newEntry })}
              onDelete={() => update(d => { d.npcs[activeId].dialogues.splice(i, 1) })}
            />
          ))}
          <button
            onClick={() => update(d => { d.npcs[activeId].dialogues.push({ text: '' }) })}
            style={{ ...addBtnStyle, marginTop: T.sp[3] }}
          >
            + Add dialogue
          </button>

          {/* System dialogue */}
          <div style={{ ...headingStyle, marginTop: T.sp[6] }}>System Dialogue</div>
          {['ally', 'traitor', 'neutral'].map(role => (
            <div key={role} style={{ display: 'flex', gap: T.sp[2], alignItems: 'center', marginBottom: T.sp[2] }}>
              <span style={{ fontSize: T.fontSize.xs, color: T.muted, width: 60, flexShrink: 0, fontFamily: T.mono }}>{role}</span>
              <input
                value={npc.systemDialogue?.[role] || ''}
                onChange={e => update(d => {
                  if (!d.npcs[activeId].systemDialogue) d.npcs[activeId].systemDialogue = {}
                  d.npcs[activeId].systemDialogue[role] = e.target.value
                })}
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
          ))}

          {/* Delete NPC */}
          <div style={{ marginTop: T.sp[6], borderTop: `1px solid ${T.border}`, paddingTop: T.sp[4] }}>
            <button
              onClick={() => {
                if (!confirm(`Delete NPC "${activeId}"?`)) return
                update(d => { delete d.npcs[activeId] })
                setSelectedNpc(null)
              }}
              style={{ ...delFullBtnStyle }}
            >
              Delete NPC "{activeId}"
            </button>
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
  width: '100%',
}

const delBtnStyle = {
  background: 'transparent', border: 'none',
  color: T.danger, fontSize: T.fontSize.sm, cursor: 'pointer',
}

const delFullBtnStyle = {
  background: 'transparent', border: `1px solid ${T.border}`,
  borderRadius: T.radius.sm, color: T.danger,
  fontSize: T.fontSize.xs, fontFamily: T.mono,
  padding: `${T.sp[2]}px ${T.sp[4]}px`, cursor: 'pointer',
}
