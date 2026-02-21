// Condition display helper
export function conditionLabel(entry) {
  if (entry.node) return `node: ${entry.node}`
  if (entry.var !== undefined) {
    const parts = [entry.var]
    if (entry.eq !== undefined) parts.push(`= ${entry.eq}`)
    if (entry.gte !== undefined) parts.push(`>= ${entry.gte}`)
    if (entry.lte !== undefined) parts.push(`<= ${entry.lte}`)
    return parts.join(' ')
  }
  return 'fallback'
}

// Validate narrative data structure
export function validate(data) {
  const errors = []
  if (!data) return ['No data']
  if (!data.variables || typeof data.variables !== 'object') errors.push('Missing variables')
  if (!data.graphs || typeof data.graphs !== 'object') errors.push('Missing graphs')
  for (const [gId, g] of Object.entries(data.graphs || {})) {
    if (!g.startNode) errors.push(`Graph "${gId}" missing startNode`)
    if (!g.nodes?.length) errors.push(`Graph "${gId}" has no nodes`)
    const nodeIds = new Set(g.nodes?.map(n => n.id) || [])
    if (g.startNode && !nodeIds.has(g.startNode)) errors.push(`Graph "${gId}" startNode "${g.startNode}" not in nodes`)
    for (const e of g.edges || []) {
      if (!nodeIds.has(e.from)) errors.push(`Graph "${gId}" edge from unknown node "${e.from}"`)
      if (!nodeIds.has(e.to)) errors.push(`Graph "${gId}" edge to unknown node "${e.to}"`)
    }
  }
  return errors
}

// Generate unique id for new nodes
let _uid = 0
export function uid(prefix = 'node') {
  return `${prefix}_${Date.now().toString(36)}_${(++_uid).toString(36)}`
}
