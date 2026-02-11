import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { tools } from './tools.js'
import { detectGameContext } from './context.js'
import * as workflow from './handlers/workflow.js'
import * as assets from './handlers/assets.js'
import * as versions from './handlers/versions.js'

const handlers = { ...workflow, ...assets, ...versions }

const server = new Server({ name: 'forkarcade', version: '1.0.0' }, { capabilities: { tools: {} } })

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const ctx = detectGameContext()
  if (!ctx) return { tools }
  return { tools: tools.filter(t => !['list_templates', 'init_game'].includes(t.name)) }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  const ctx = detectGameContext()

  const enrichedArgs = { ...args }
  if (ctx) {
    if (!enrichedArgs.template && ['get_game_prompt', 'get_asset_guide', 'validate_assets'].includes(name)) {
      enrichedArgs.template = ctx.template
    }
    if (!enrichedArgs.slug && name === 'publish_game') enrichedArgs.slug = ctx.slug
    if (!enrichedArgs.title && name === 'publish_game') enrichedArgs.title = ctx.title
  }

  const handler = handlers[name]
  if (!handler) return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }] }

  const result = handler(enrichedArgs)
  return { content: [{ type: 'text', text: result }] }
})

const transport = new StdioServerTransport()
await server.connect(transport)
