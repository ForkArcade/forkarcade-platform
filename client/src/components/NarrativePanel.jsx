import { T } from '../theme'

const NODE_COLORS = { scene: '#4a9eff', choice: '#ff9f43', condition: '#a55eea' }

function NodeList({ graph, currentNode }) {
  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return <div style={{ color: T.textDim, fontSize: 12, padding: '8px 0' }}>No narrative graph yet</div>
  }

  return (
    <div style={{ fontSize: 11, fontFamily: T.mono }}>
      {graph.nodes.map(node => {
        const active = node.id === currentNode
        const color = NODE_COLORS[node.type] || T.textDim
        return (
          <div key={node.id} style={{ padding: '2px 0', display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color, fontSize: 9 }}>{node.type === 'choice' ? '\u25c6' : node.type === 'condition' ? '\u25b2' : '\u25a0'}</span>
            <span style={{ color: active ? T.textBright : T.text, fontWeight: active ? 700 : 400 }}>
              {node.label || node.id}
            </span>
            {active && <span style={{ color: T.accent, fontSize: 9 }}>\u25c0</span>}
          </div>
        )
      })}
    </div>
  )
}

function VariablesTable({ variables }) {
  if (!variables || Object.keys(variables).length === 0) {
    return <div style={{ color: T.textDim, fontSize: 12, padding: '8px 0' }}>No variables</div>
  }

  return (
    <div style={{ fontSize: 12 }}>
      {Object.entries(variables).map(([name, value]) => (
        <div key={name} style={{ display: 'flex', gap: 8, padding: '3px 0', borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontFamily: T.mono, color: T.text, minWidth: 90, fontSize: 11 }}>{name}</span>
          <span style={{
            fontFamily: T.mono, fontSize: 11,
            color: typeof value === 'boolean' ? (value ? T.success : T.danger) : T.textBright,
          }}>
            {String(value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function EventLog({ events }) {
  if (!events || events.length === 0) {
    return <div style={{ color: T.textDim, fontSize: 12, padding: '8px 0' }}>No events yet</div>
  }

  return (
    <div style={{ fontFamily: T.mono, fontSize: 11, maxHeight: 160, overflow: 'auto' }}>
      {events.map((evt, i) => (
        <div key={i} style={{ color: T.text, padding: '2px 0' }}>
          <span style={{ color: T.textDim }}>&gt;</span> {evt}
        </div>
      ))}
    </div>
  )
}

export default function NarrativePanel({ narrativeState }) {
  const { variables, currentNode, graph, events } = narrativeState || {}
  const h = { margin: '0 0 6px', color: T.textDim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }

  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ marginBottom: 12 }}>
        <h4 style={h}>Graph</h4>
        <NodeList graph={graph} currentNode={currentNode} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <h4 style={h}>Variables</h4>
        <VariablesTable variables={variables} />
      </div>
      <div>
        <h4 style={h}>Events</h4>
        <EventLog events={events} />
      </div>
    </div>
  )
}
