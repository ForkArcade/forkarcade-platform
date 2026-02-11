const NODE_COLORS = {
  scene: '#4a9eff',
  choice: '#ff9f43',
  condition: '#a55eea',
}

const NODE_SHAPES = {
  scene: { borderRadius: 4 },
  choice: { borderRadius: 0, transform: 'rotate(45deg)', width: 28, height: 28 },
  condition: { borderRadius: '50% 50% 0 0', clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' },
}

function MiniGraph({ graph, currentNode }) {
  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return <div style={{ color: '#888', fontSize: 13, padding: 8 }}>No narrative graph yet</div>
  }

  const nodePositions = {}
  const cols = Math.ceil(Math.sqrt(graph.nodes.length))
  graph.nodes.forEach((node, i) => {
    nodePositions[node.id] = {
      x: (i % cols) * 120 + 60,
      y: Math.floor(i / cols) * 80 + 40,
    }
  })

  const svgWidth = cols * 120 + 40
  const svgHeight = (Math.ceil(graph.nodes.length / cols)) * 80 + 40

  return (
    <div style={{ overflow: 'auto', maxHeight: 260 }}>
      <svg width={svgWidth} height={svgHeight} style={{ display: 'block' }}>
        {(graph.edges || []).map((edge, i) => {
          const from = nodePositions[edge.from]
          const to = nodePositions[edge.to]
          if (!from || !to) return null
          const midX = (from.x + to.x) / 2
          const midY = (from.y + to.y) / 2
          return (
            <g key={i}>
              <line
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke="#666" strokeWidth={1.5}
                markerEnd="url(#arrowhead)"
              />
              {edge.label && (
                <text x={midX} y={midY - 6} textAnchor="middle" fontSize={10} fill="#999">
                  {edge.label}
                </text>
              )}
            </g>
          )
        })}

        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#666" />
          </marker>
        </defs>

        {graph.nodes.map(node => {
          const pos = nodePositions[node.id]
          const isActive = node.id === currentNode
          const color = NODE_COLORS[node.type] || '#888'
          const isChoice = node.type === 'choice'
          const r = isChoice ? 16 : 20

          return (
            <g key={node.id}>
              {isChoice ? (
                <rect
                  x={pos.x - r / 2} y={pos.y - r / 2}
                  width={r} height={r}
                  transform={`rotate(45, ${pos.x}, ${pos.y})`}
                  fill={isActive ? color : '#2a2a2a'}
                  stroke={color}
                  strokeWidth={isActive ? 3 : 1.5}
                />
              ) : node.type === 'condition' ? (
                <polygon
                  points={`${pos.x},${pos.y - r} ${pos.x - r},${pos.y + r * 0.6} ${pos.x + r},${pos.y + r * 0.6}`}
                  fill={isActive ? color : '#2a2a2a'}
                  stroke={color}
                  strokeWidth={isActive ? 3 : 1.5}
                />
              ) : (
                <rect
                  x={pos.x - r} y={pos.y - 14}
                  width={r * 2} height={28}
                  rx={4}
                  fill={isActive ? color : '#2a2a2a'}
                  stroke={color}
                  strokeWidth={isActive ? 3 : 1.5}
                />
              )}
              <text
                x={pos.x} y={pos.y + (node.type === 'condition' ? r + 16 : 24)}
                textAnchor="middle" fontSize={10}
                fill={isActive ? '#fff' : '#aaa'}
              >
                {node.label || node.id}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function VariablesTable({ variables }) {
  if (!variables || Object.keys(variables).length === 0) {
    return <div style={{ color: '#888', fontSize: 13, padding: 8 }}>No variables</div>
  }

  return (
    <div style={{ fontSize: 13 }}>
      {Object.entries(variables).map(([name, value]) => {
        const isBool = typeof value === 'boolean'
        const isNum = typeof value === 'number'

        return (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', borderBottom: '1px solid #333' }}>
            <span style={{ fontFamily: 'monospace', color: '#ccc', minWidth: 100 }}>{name}</span>
            {isBool ? (
              <span style={{ color: value ? '#2ed573' : '#ff4757' }}>{value ? 'true' : 'false'}</span>
            ) : isNum ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <div style={{ flex: 1, height: 6, background: '#333', borderRadius: 3 }}>
                  <div style={{
                    width: `${Math.min(100, Math.max(0, value * 10))}%`,
                    height: '100%',
                    background: '#4a9eff',
                    borderRadius: 3,
                  }} />
                </div>
                <span style={{ color: '#fff', minWidth: 24, textAlign: 'right' }}>{value}</span>
              </div>
            ) : (
              <span style={{ color: '#fff' }}>{String(value)}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function EventLog({ events }) {
  if (!events || events.length === 0) {
    return <div style={{ color: '#888', fontSize: 13, padding: 8 }}>No events yet</div>
  }

  return (
    <div style={{ fontSize: 12, fontFamily: 'monospace', maxHeight: 160, overflow: 'auto' }}>
      {events.map((evt, i) => (
        <div key={i} style={{ color: '#aaa', padding: '2px 0' }}>
          <span style={{ color: '#666' }}>&gt;</span> {evt}
        </div>
      ))}
    </div>
  )
}

export default function NarrativePanel({ narrativeState }) {
  const { variables, currentNode, graph, events } = narrativeState || {}

  return (
    <div style={{ width: 280, fontSize: 13 }}>
      <div style={{ marginBottom: 12 }}>
        <h4 style={{ margin: '0 0 6px', color: '#ccc', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Graph</h4>
        <MiniGraph graph={graph} currentNode={currentNode} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <h4 style={{ margin: '0 0 6px', color: '#ccc', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Variables</h4>
        <VariablesTable variables={variables} />
      </div>

      <div>
        <h4 style={{ margin: '0 0 6px', color: '#ccc', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Events</h4>
        <EventLog events={events} />
      </div>
    </div>
  )
}
