import { useState } from 'react'
import { T } from '../../client/src/theme'
import { conditionLabel, uid } from './narrativeUtils'

const NODE_TYPES = ['scene', 'state', 'choice', 'condition']
const TYPE_SYMBOL = { scene: '\u25a0', state: '\u25cf', choice: '\u25c6', condition: '\u25b2' }
const TYPE_COLOR = { scene: T.accentColor, state: '#8cf', choice: '#fa4', condition: '#f4f' }

function EdgeRow({ edge, nodes, variables, onUpdate, onDelete }) {
  return (
    <div style={{ display: 'flex', gap: T.sp[2], alignItems: 'center', padding: `${T.sp[2]}px 0`, borderBottom: `1px solid ${T.border}` }}>
      <select
        value={edge.from}
        onChange={e => onUpdate({ ...edge, from: e.target.value })}
        style={selectStyle}
      >
        {nodes.map(n => <option key={n.id} value={n.id}>{n.label || n.id}</option>)}
      </select>
      <span style={{ color: T.muted, fontSize: T.fontSize.xs }}>{'\u2192'}</span>
      <select
        value={edge.to}
        onChange={e => onUpdate({ ...edge, to: e.target.value })}
        style={selectStyle}
      >
        {nodes.map(n => <option key={n.id} value={n.id}>{n.label || n.id}</option>)}
      </select>
      <select
        value={edge.var || ''}
        onChange={e => {
          const v = e.target.value
          if (!v) {
            const { var: _, eq: _2, gte: _3, lte: _4, ...rest } = edge
            onUpdate(rest)
          } else {
            onUpdate({ ...edge, var: v })
          }
        }}
        style={{ ...selectStyle, minWidth: 80 }}
      >
        <option value="">no condition</option>
        {variables.map(v => <option key={v} value={v}>{v}</option>)}
      </select>
      {edge.var && (
        <>
          <select
            value={edge.eq !== undefined ? 'eq' : edge.gte !== undefined ? 'gte' : edge.lte !== undefined ? 'lte' : 'eq'}
            onChange={e => {
              const op = e.target.value
              const val = edge.eq ?? edge.gte ?? edge.lte ?? 0
              const clean = { from: edge.from, to: edge.to, var: edge.var }
              clean[op] = val
              onUpdate(clean)
            }}
            style={selectStyle}
          >
            <option value="eq">=</option>
            <option value="gte">&gt;=</option>
            <option value="lte">&lt;=</option>
          </select>
          <input
            type="text"
            value={String(edge.eq ?? edge.gte ?? edge.lte ?? '')}
            onChange={e => {
              const raw = e.target.value
              const val = raw === 'true' ? true : raw === 'false' ? false : isNaN(Number(raw)) ? raw : Number(raw)
              const op = edge.eq !== undefined ? 'eq' : edge.gte !== undefined ? 'gte' : 'lte'
              onUpdate({ from: edge.from, to: edge.to, var: edge.var, [op]: val })
            }}
            style={{ ...inputStyle, width: 50 }}
          />
        </>
      )}
      <button onClick={onDelete} style={delBtnStyle}>{'\u00d7'}</button>
    </div>
  )
}

export default function GraphEditor({ data, update }) {
  const [selectedGraph, setSelectedGraph] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const graphIds = Object.keys(data.graphs || {})
  const activeId = selectedGraph && graphIds.includes(selectedGraph) ? selectedGraph : graphIds[0] || null
  const graph = activeId ? data.graphs[activeId] : null
  const variables = Object.keys(data.variables || {})

  return (
    <div style={{ display: 'flex', gap: T.sp[5], height: '100%' }}>
      {/* Graph list */}
      <div style={{ width: 160, flexShrink: 0 }}>
        <div style={headingStyle}>Graphs</div>
        {graphIds.map(gId => (
          <button
            key={gId}
            onClick={() => { setSelectedGraph(gId); setSelectedNode(null) }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: `${T.sp[2]}px ${T.sp[3]}px`,
              background: activeId === gId ? T.surface : 'transparent',
              border: 'none', color: activeId === gId ? T.textBright : T.text,
              fontSize: T.fontSize.xs, fontFamily: T.mono, cursor: 'pointer',
            }}
          >
            {gId}
          </button>
        ))}
        <button
          onClick={() => {
            const id = prompt('Graph ID (e.g. quest_npc):')
            if (!id) return
            update(d => {
              d.graphs[id] = { startNode: 'start', nodes: [{ id: 'start', label: 'Start', type: 'scene' }], edges: [] }
            })
            setSelectedGraph(id)
          }}
          style={{ ...addBtnStyle, marginTop: T.sp[3] }}
        >
          + Add graph
        </button>
      </div>

      {/* Nodes + Edges */}
      {graph && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: T.sp[5] }}>
            {/* Nodes */}
            <div style={{ flex: 1 }}>
              <div style={headingStyle}>Nodes</div>
              <div style={{ fontSize: 9, color: T.muted, marginBottom: T.sp[3] }}>
                start: <strong style={{ color: T.textBright }}>{graph.startNode}</strong>
              </div>
              {graph.nodes.map(node => {
                const isStart = node.id === graph.startNode
                const isSelected = selectedNode === node.id
                const outEdges = (graph.edges || []).filter(e => e.from === node.id)
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node.id)}
                    style={{
                      padding: `${T.sp[3]}px ${T.sp[3]}px`,
                      marginBottom: T.sp[2],
                      background: isSelected ? T.surface : 'transparent',
                      border: `1px solid ${isSelected ? T.accentColor : T.border}`,
                      borderRadius: T.radius.sm, cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: T.sp[2] }}>
                      <span style={{ color: TYPE_COLOR[node.type] || T.text, fontSize: 10 }}>
                        {TYPE_SYMBOL[node.type] || '\u25a0'}
                      </span>
                      <span style={{ color: T.textBright, fontSize: T.fontSize.sm, fontFamily: T.mono }}>
                        {node.id}
                      </span>
                      {isStart && <span style={{ fontSize: 9, color: T.accentColor }}>(start)</span>}
                    </div>
                    <div style={{ fontSize: 9, color: T.muted, marginTop: 2 }}>{node.label}</div>
                    {outEdges.length > 0 && (
                      <div style={{ marginTop: T.sp[1], fontSize: 9, color: T.muted }}>
                        {outEdges.map((e, i) => (
                          <span key={i}>
                            {'\u2192 '}{e.to}
                            {e.var && <span style={{ color: T.warning }}> [{conditionLabel(e)}]</span>}
                            {i < outEdges.length - 1 && ' | '}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              <button
                onClick={() => {
                  const id = uid('node')
                  update(d => {
                    d.graphs[activeId].nodes.push({ id, label: 'New node', type: 'scene' })
                  })
                  setSelectedNode(id)
                }}
                style={addBtnStyle}
              >
                + Add node
              </button>
            </div>

            {/* Node properties */}
            <div style={{ width: 220, flexShrink: 0 }}>
              <div style={headingStyle}>Properties</div>
              {selectedNode && graph.nodes.find(n => n.id === selectedNode) ? (() => {
                const node = graph.nodes.find(n => n.id === selectedNode)
                const nodeIdx = graph.nodes.indexOf(node)
                return (
                  <div style={{ fontSize: T.fontSize.xs }}>
                    <label style={labelStyle}>ID</label>
                    <input
                      value={node.id}
                      onChange={e => {
                        const newId = e.target.value
                        update(d => {
                          const g = d.graphs[activeId]
                          const old = g.nodes[nodeIdx].id
                          g.nodes[nodeIdx].id = newId
                          if (g.startNode === old) g.startNode = newId
                          g.edges.forEach(edge => {
                            if (edge.from === old) edge.from = newId
                            if (edge.to === old) edge.to = newId
                          })
                        })
                        setSelectedNode(newId)
                      }}
                      style={inputStyle}
                    />
                    <label style={labelStyle}>Label</label>
                    <input
                      value={node.label || ''}
                      onChange={e => update(d => { d.graphs[activeId].nodes[nodeIdx].label = e.target.value })}
                      style={inputStyle}
                    />
                    <label style={labelStyle}>Type</label>
                    <select
                      value={node.type || 'scene'}
                      onChange={e => update(d => { d.graphs[activeId].nodes[nodeIdx].type = e.target.value })}
                      style={selectStyle}
                    >
                      {NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <div style={{ marginTop: T.sp[4], display: 'flex', gap: T.sp[2] }}>
                      <button
                        onClick={() => update(d => { d.graphs[activeId].startNode = node.id })}
                        style={{ ...addBtnStyle, flex: 1, opacity: graph.startNode === node.id ? 0.4 : 1 }}
                        disabled={graph.startNode === node.id}
                      >
                        Set as start
                      </button>
                      <button
                        onClick={() => {
                          update(d => {
                            const g = d.graphs[activeId]
                            g.nodes = g.nodes.filter(n => n.id !== node.id)
                            g.edges = g.edges.filter(e => e.from !== node.id && e.to !== node.id)
                          })
                          setSelectedNode(null)
                        }}
                        style={{ ...delBtnStyle, padding: `${T.sp[2]}px ${T.sp[3]}px` }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })() : (
                <div style={{ fontSize: T.fontSize.xs, color: T.muted }}>Select a node</div>
              )}
            </div>
          </div>

          {/* Edges */}
          <div style={{ marginTop: T.sp[6] }}>
            <div style={headingStyle}>Edges</div>
            {(graph.edges || []).map((edge, i) => (
              <EdgeRow
                key={i}
                edge={edge}
                nodes={graph.nodes}
                variables={variables}
                onUpdate={newEdge => update(d => { d.graphs[activeId].edges[i] = newEdge })}
                onDelete={() => update(d => { d.graphs[activeId].edges.splice(i, 1) })}
              />
            ))}
            <button
              onClick={() => {
                const nodes = graph.nodes
                if (nodes.length < 2) return
                update(d => {
                  d.graphs[activeId].edges.push({ from: nodes[0].id, to: nodes[1].id })
                })
              }}
              style={{ ...addBtnStyle, marginTop: T.sp[3] }}
            >
              + Add edge
            </button>
          </div>

          {/* Delete graph */}
          <div style={{ marginTop: T.sp[6], borderTop: `1px solid ${T.border}`, paddingTop: T.sp[4] }}>
            <button
              onClick={() => {
                if (!confirm(`Delete graph "${activeId}"?`)) return
                update(d => { delete d.graphs[activeId] })
                setSelectedGraph(null)
              }}
              style={{ ...delBtnStyle, padding: `${T.sp[2]}px ${T.sp[4]}px` }}
            >
              Delete graph "{activeId}"
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: `${T.sp[2]}px ${T.sp[3]}px`,
  background: T.surface, border: `1px solid ${T.border}`,
  borderRadius: T.radius.sm, color: T.textBright,
  fontFamily: T.mono, fontSize: T.fontSize.xs,
  boxSizing: 'border-box', marginBottom: T.sp[3],
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
  padding: `${T.sp[1]}px ${T.sp[2]}px`, cursor: 'pointer',
}
