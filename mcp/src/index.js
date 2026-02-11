import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PLATFORM_ROOT = resolve(__dirname, '../..')
const GAMES_DIR = resolve(PLATFORM_ROOT, '..', 'games')
const PROMPTS_DIR = resolve(PLATFORM_ROOT, 'prompts')
const SDK_PATH = resolve(PLATFORM_ROOT, 'server/src/public/forkarcade-sdk.js')
const ORG = 'ForkArcade'
const PLATFORM_API = process.env.FORKARCADE_API || 'http://localhost:8787'

function exec(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf-8', timeout: 30000, ...opts }).trim()
}

const TEMPLATES = {
  'strategy-rpg': {
    repo: `${ORG}/game-template-strategy-rpg`,
    name: 'Strategy RPG',
    description: 'Turowa strategia z jednostkami — grid-based combat, progresja, system tur',
  },
  'roguelike': {
    repo: `${ORG}/game-template-roguelike`,
    name: 'Roguelike',
    description: 'Proceduralne dungeony, permadeath, tile-based movement, FOV',
  },
}

const tools = [
  {
    name: 'list_templates',
    description: 'Lista dostępnych template\'ów gier ForkArcade z opisami',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'init_game',
    description: 'Tworzy nową grę — forkuje template repo do org ForkArcade i klonuje lokalnie',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Unikalna nazwa gry (lowercase, hyphens), np. "dark-dungeon"' },
        template: { type: 'string', description: 'Klucz template: strategy-rpg lub roguelike' },
        title: { type: 'string', description: 'Wyświetlana nazwa gry' },
        description: { type: 'string', description: 'Krótki opis gry' },
      },
      required: ['slug', 'template', 'title'],
    },
  },
  {
    name: 'get_sdk_docs',
    description: 'Zwraca dokumentację ForkArcade SDK — jak gra komunikuje się z platformą',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_game_prompt',
    description: 'Zwraca prompt engineeringowy dla danego typu gry — wiedza o mechanikach, wzorcach kodu, strukturze',
    inputSchema: {
      type: 'object',
      properties: {
        template: { type: 'string', description: 'Klucz template: strategy-rpg lub roguelike' },
      },
      required: ['template'],
    },
  },
  {
    name: 'validate_game',
    description: 'Sprawdza czy gra jest poprawnie skonfigurowana — SDK podpięty, index.html istnieje, submitScore wywołany',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Ścieżka do katalogu gry' },
      },
      required: ['path'],
    },
  },
  {
    name: 'publish_game',
    description: 'Publikuje grę — push do GitHub, włącza GitHub Pages, rejestruje w platformie ForkArcade',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Ścieżka do katalogu gry' },
        slug: { type: 'string', description: 'Slug gry (nazwa repo)' },
        title: { type: 'string', description: 'Tytuł gry' },
        description: { type: 'string', description: 'Opis gry' },
      },
      required: ['path', 'slug', 'title'],
    },
  },
]

async function handleTool(name, args) {
  switch (name) {
    case 'list_templates': {
      const list = Object.entries(TEMPLATES).map(([key, t]) => ({
        key,
        name: t.name,
        description: t.description,
        repo: t.repo,
      }))
      return JSON.stringify(list, null, 2)
    }

    case 'init_game': {
      const { slug, template, title, description } = args
      const tmpl = TEMPLATES[template]
      if (!tmpl) return JSON.stringify({ error: `Unknown template: ${template}. Available: ${Object.keys(TEMPLATES).join(', ')}` })
      if (!/^[a-z0-9-]+$/.test(slug)) return JSON.stringify({ error: 'Slug must be lowercase alphanumeric with hyphens' })

      try {
        // Ensure games directory exists
        exec(`mkdir -p "${GAMES_DIR}"`)

        // Create repo from template
        exec(`gh repo create ${ORG}/${slug} --template ${tmpl.repo} --public --clone`, { cwd: GAMES_DIR })

        // Set description
        if (description) {
          exec(`gh repo edit ${ORG}/${slug} --description "${description.replace(/"/g, '\\"')}"`)
        }

        // Set topics: forkarcade-game + template type
        exec(`gh repo edit ${ORG}/${slug} --add-topic forkarcade-game --add-topic ${template}`)

        // Create .mcp.json so Claude Code sessions in game dir have access to ForkArcade tools
        const gamePath = resolve(GAMES_DIR, slug)
        const mcpConfig = {
          mcpServers: {
            forkarcade: {
              type: 'stdio',
              command: 'node',
              args: [resolve(PLATFORM_ROOT, 'mcp/src/index.js')],
              env: {}
            }
          }
        }
        writeFileSync(resolve(gamePath, '.mcp.json'), JSON.stringify(mcpConfig, null, 2) + '\n')

        return JSON.stringify({
          ok: true,
          message: `Game "${title}" created from template ${tmpl.name}`,
          repo: `${ORG}/${slug}`,
          local_path: gamePath,
          next_steps: [
            `cd ${slug}`,
            'Edit game.js to implement your game',
            'Use get_game_prompt tool to get design guidance',
            'Use validate_game before publishing',
            'Use publish_game when ready',
          ],
        })
      } catch (e) {
        return JSON.stringify({ error: e.message })
      }
    }

    case 'get_sdk_docs': {
      const sdkSource = readFileSync(SDK_PATH, 'utf-8')
      return `# ForkArcade SDK Documentation

## How it works
The SDK communicates with the ForkArcade platform via postMessage.
Games run in an iframe on the platform. The SDK sends messages to the parent window (platform),
which handles authentication and API calls.

## Include in your game
\`\`\`html
<script src="${PLATFORM_API}/sdk/forkarcade-sdk.js"></script>
\`\`\`

## API

### ForkArcade.onReady(callback)
Called when the SDK connects to the platform.
\`\`\`js
ForkArcade.onReady(function(ctx) {
  console.log('Game slug:', ctx.slug);
  startGame();
});
\`\`\`

### ForkArcade.submitScore(score) → Promise
Submits a numeric score to the leaderboard. Call after game over or level complete.
\`\`\`js
await ForkArcade.submitScore(1250);
\`\`\`

### ForkArcade.getPlayer() → Promise
Returns current player info. Returns error if not logged in.
\`\`\`js
const player = await ForkArcade.getPlayer();
// { login: 'username', sub: 12345 }
\`\`\`

### ForkArcade.updateNarrative(data)
Reports narrative state to the platform. Fire-and-forget (no Promise). The platform displays a real-time narrative panel with graph, variables, and event log.
\`\`\`js
ForkArcade.updateNarrative({
  variables: { karma: 3, has_key: true },
  currentNode: 'dark-cellar',
  graph: {
    nodes: [
      { id: 'intro', label: 'Start', type: 'scene' },
      { id: 'choice-1', label: 'Help NPC?', type: 'choice' },
      { id: 'dark-cellar', label: 'Dark Cellar', type: 'scene' },
    ],
    edges: [
      { from: 'intro', to: 'choice-1' },
      { from: 'choice-1', to: 'dark-cellar', label: 'Yes' },
    ]
  },
  event: 'Entered dark cellar'
});
\`\`\`
Node types: \`scene\` (rectangle), \`choice\` (diamond), \`condition\` (triangle).

## PostMessage Protocol
${sdkSource}
`
    }

    case 'get_game_prompt': {
      const { template } = args
      const promptPath = resolve(PROMPTS_DIR, `${template}.md`)
      if (!existsSync(promptPath)) return JSON.stringify({ error: `No prompt found for template: ${template}` })
      return readFileSync(promptPath, 'utf-8')
    }

    case 'validate_game': {
      const { path: gamePath } = args
      const issues = []
      const absPath = resolve(gamePath)

      if (!existsSync(resolve(absPath, 'index.html'))) {
        issues.push('Missing index.html')
      } else {
        const html = readFileSync(resolve(absPath, 'index.html'), 'utf-8')
        if (!html.includes('forkarcade-sdk')) issues.push('SDK not included in index.html — add <script src=".../forkarcade-sdk.js"></script>')
        if (!html.includes('<canvas')) issues.push('No <canvas> element found in index.html')
      }

      if (!existsSync(resolve(absPath, 'game.js'))) {
        issues.push('Missing game.js')
      } else {
        const js = readFileSync(resolve(absPath, 'game.js'), 'utf-8')
        if (!js.includes('submitScore')) issues.push('game.js does not call ForkArcade.submitScore() — scores won\'t be recorded')
        if (!js.includes('onReady')) issues.push('game.js does not call ForkArcade.onReady() — game may not initialize properly')
      }

      if (!existsSync(resolve(absPath, 'style.css'))) {
        issues.push('Missing style.css (optional but recommended)')
      }

      return JSON.stringify({
        valid: issues.length === 0,
        issues,
        path: absPath,
      }, null, 2)
    }

    case 'publish_game': {
      const { path: gamePath, slug, title, description } = args
      const absPath = resolve(gamePath)
      const results = []

      try {
        // Push to GitHub
        try {
          exec('git add -A && git commit -m "Publish game"', { cwd: absPath })
        } catch (e) {
          // May already be committed
        }
        exec('git push -u origin main', { cwd: absPath })
        results.push('Pushed to GitHub')

        // Set description if provided
        if (description) {
          exec(`gh repo edit ${ORG}/${slug} --description "${description.replace(/"/g, '\\"')}"`)
        }

        // Ensure topic forkarcade-game is set (makes it visible in platform catalog)
        try {
          exec(`gh repo edit ${ORG}/${slug} --add-topic forkarcade-game`)
        } catch (e) {
          // Topic may already exist
        }

        // Enable GitHub Pages
        try {
          exec(`gh api repos/${ORG}/${slug}/pages -X POST -f build_type=legacy -f source[branch]=main -f source[path]=/`)
          results.push('GitHub Pages enabled')
        } catch (e) {
          if (e.message.includes('already exists')) {
            results.push('GitHub Pages already enabled')
          } else {
            results.push(`Pages warning: ${e.message}`)
          }
        }

        const pagesUrl = `https://${ORG.toLowerCase()}.github.io/${slug}/`

        return JSON.stringify({
          ok: true,
          results,
          repo: `https://github.com/${ORG}/${slug}`,
          game_url: pagesUrl,
          platform_url: `http://localhost:5173/play/${slug}`,
        }, null, 2)
      } catch (e) {
        return JSON.stringify({ error: e.message, results })
      }
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
}

const server = new Server({ name: 'forkarcade', version: '1.0.0' }, { capabilities: { tools: {} } })

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  const result = await handleTool(name, args || {})
  return { content: [{ type: 'text', text: result }] }
})

const transport = new StdioServerTransport()
await server.connect(transport)
