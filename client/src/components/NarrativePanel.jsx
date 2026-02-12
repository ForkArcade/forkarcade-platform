import { T } from '../theme'
import { SectionHeading, EmptyState } from './ui'

function NodeList({ graph, currentNode }) {
  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return <EmptyState>No narrative graph yet</EmptyState>
  }

  return (
    <div style={{ fontSize: T.fontSize.xs, fontFamily: T.mono }}>
      {graph.nodes.map(node => {
        const active = node.id === currentNode
        const color = T.nodeColors[node.type] || T.text
        return (
          <div key={node.id} style={{ padding: `${T.sp[1]}px 0`, display: 'flex', gap: T.sp[3], alignItems: 'center' }}>
            <span style={{ color, fontSize: 9 }}>{node.type === 'choice' ? '\u25c6' : node.type === 'condition' ? '\u25b2' : '\u25a0'}</span>
            <span style={{ color: active ? T.textBright : T.text, fontWeight: active ? T.weight.bold : T.weight.normal }}>
              {node.label || node.id}
            </span>
            {active && <span style={{ color: T.accentColor, fontSize: 9 }}>{'\u25c0'}</span>}
          </div>
        )
      })}
    </div>
  )
}

function VariablesTable({ variables }) {
  if (!variables || Object.keys(variables).length === 0) {
    return <EmptyState>No variables</EmptyState>
  }

  return (
    <div style={{ fontSize: T.fontSize.sm }}>
      {Object.entries(variables).map(([name, value]) => (
        <div key={name} style={{ display: 'flex', gap: T.sp[4], padding: `${T.sp[2]}px 0`, borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontFamily: T.mono, color: T.text, minWidth: 90, fontSize: T.fontSize.xs }}>{name}</span>
          <span style={{
            fontFamily: T.mono, fontSize: T.fontSize.xs,
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
    return <EmptyState>No events yet</EmptyState>
  }

  return (
    <div style={{ fontFamily: T.mono, fontSize: T.fontSize.xs, maxHeight: 160, overflow: 'auto' }}>
      {events.map((evt, i) => (
        <div key={i} style={{ color: T.text, padding: `${T.sp[1]}px 0` }}>
          <span style={{ color: T.muted }}>&gt;</span> {evt}
        </div>
      ))}
    </div>
  )
}

export default function NarrativePanel({ narrativeState }) {
  const { variables, currentNode, graph, events } = narrativeState || {}

  return (
    <div style={{ fontSize: T.fontSize.sm }}>
      <div style={{ marginBottom: T.sp[6] }}>
        <SectionHeading>Graph</SectionHeading>
        <NodeList graph={graph} currentNode={currentNode} />
      </div>
      <div style={{ marginBottom: T.sp[6] }}>
        <SectionHeading>Variables</SectionHeading>
        <VariablesTable variables={variables} />
      </div>
      <div>
        <SectionHeading>Events</SectionHeading>
        <EventLog events={events} />
      </div>
    </div>
  )
}
