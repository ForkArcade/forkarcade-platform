import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { TEMPLATES, ORG } from '../templates.js'
import { generateSpritesJs } from '../sprites.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PLATFORM_ROOT = resolve(__dirname, '../../..')
const GAMES_DIR = resolve(PLATFORM_ROOT, '..', 'games')
const PROMPTS_DIR = resolve(PLATFORM_ROOT, 'prompts')
const PLATFORM_API = process.env.FORKARCADE_API || 'http://localhost:8787'

function exec(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf-8', timeout: 30000, ...opts }).trim()
}

export function list_templates() {
  const list = Object.entries(TEMPLATES).map(([key, t]) => ({
    key, name: t.name, description: t.description, repo: t.repo,
  }))
  return JSON.stringify(list, null, 2)
}

export function init_game(args) {
  const { slug, template, title, description } = args
  const tmpl = TEMPLATES[template]
  if (!tmpl) return JSON.stringify({ error: `Unknown template: ${template}. Available: ${Object.keys(TEMPLATES).join(', ')}` })
  if (!/^[a-z0-9-]+$/.test(slug)) return JSON.stringify({ error: 'Slug must be lowercase alphanumeric with hyphens' })

  try {
    exec(`mkdir -p "${GAMES_DIR}"`)
    exec(`gh repo create ${ORG}/${slug} --template ${tmpl.repo} --public --clone`, { cwd: GAMES_DIR })

    if (description) {
      exec(`gh repo edit ${ORG}/${slug} --description "${description.replace(/"/g, '\\"')}"`)
    }

    exec(`gh repo edit ${ORG}/${slug} --add-topic forkarcade-game --add-topic ${template}`)

    const gamePath = resolve(GAMES_DIR, slug)
    const gameConfig = { template, slug, title, currentVersion: 0, versions: [] }
    writeFileSync(resolve(gamePath, '.forkarcade.json'), JSON.stringify(gameConfig, null, 2) + '\n')

    const mcpConfig = {
      mcpServers: {
        forkarcade: {
          type: 'stdio', command: 'node',
          args: [resolve(PLATFORM_ROOT, 'mcp/src/index.js')],
          env: {}
        }
      }
    }
    writeFileSync(resolve(gamePath, '.mcp.json'), JSON.stringify(mcpConfig, null, 2) + '\n')

    writeFileSync(resolve(gamePath, '_sprites.json'), '{}\n')
    writeFileSync(resolve(gamePath, 'sprites.js'), generateSpritesJs({}))

    return JSON.stringify({
      ok: true,
      message: `Game "${title}" created from template ${tmpl.name}`,
      repo: `${ORG}/${slug}`,
      local_path: gamePath,
      next_steps: [
        `cd ${slug}`,
        'Edit game.js to implement your game',
        'Use get_game_prompt tool to get design guidance',
        'Use get_asset_guide tool to see what sprites to create',
        'Use create_sprite tool to build pixel art assets',
        'Use validate_game before publishing',
        'Use publish_game when ready',
      ],
    })
  } catch (e) {
    return JSON.stringify({ error: e.message })
  }
}

export function get_sdk_docs() {
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
Reports narrative state to the platform. Fire-and-forget (no Promise).
\`\`\`js
ForkArcade.updateNarrative({
  variables: { karma: 3, has_key: true },
  currentNode: 'dark-cellar',
  graph: {
    nodes: [
      { id: 'intro', label: 'Start', type: 'scene' },
      { id: 'choice-1', label: 'Help NPC?', type: 'choice' },
    ],
    edges: [
      { from: 'intro', to: 'choice-1' },
    ]
  },
  event: 'Entered dark cellar'
});
\`\`\`
Node types: \`scene\`, \`choice\`, \`condition\`.
`
}

export function get_game_prompt(args) {
  const { template } = args
  const promptPath = resolve(PROMPTS_DIR, `${template}.md`)
  if (!existsSync(promptPath)) return JSON.stringify({ error: `No prompt found for template: ${template}` })
  return readFileSync(promptPath, 'utf-8')
}

export function validate_game(args) {
  const { path: gamePath } = args
  const issues = []
  const warnings = []
  const absPath = resolve(gamePath)

  if (!existsSync(resolve(absPath, 'index.html'))) {
    issues.push('Missing index.html')
  } else {
    const html = readFileSync(resolve(absPath, 'index.html'), 'utf-8')
    if (!html.includes('forkarcade-sdk')) issues.push('SDK not included in index.html — add <script src=".../forkarcade-sdk.js"></script>')
    if (!html.includes('<canvas')) issues.push('No <canvas> element found in index.html')
    if (!html.includes('sprites.js')) warnings.push('sprites.js not included in index.html — sprite rendering will not work. Add <script src="sprites.js"></script> before game.js')
  }

  if (!existsSync(resolve(absPath, 'game.js'))) {
    issues.push('Missing game.js')
  } else {
    const js = readFileSync(resolve(absPath, 'game.js'), 'utf-8')
    if (!js.includes('submitScore')) issues.push('game.js does not call ForkArcade.submitScore() — scores won\'t be recorded')
    if (!js.includes('onReady')) issues.push('game.js does not call ForkArcade.onReady() — game may not initialize properly')
  }

  if (!existsSync(resolve(absPath, 'style.css'))) {
    warnings.push('Missing style.css (optional but recommended)')
  }
  if (!existsSync(resolve(absPath, 'sprites.js'))) {
    warnings.push('No sprites.js — game will use text fallback for rendering (optional)')
  }

  return JSON.stringify({ valid: issues.length === 0, issues, warnings, path: absPath }, null, 2)
}

export function publish_game(args) {
  const { path: gamePath, slug, title, description } = args
  const absPath = resolve(gamePath)
  const results = []

  try {
    try {
      exec('git add -A && git commit -m "Publish game"', { cwd: absPath })
    } catch (e) { /* may already be committed */ }
    exec('git push -u origin main', { cwd: absPath })
    results.push('Pushed to GitHub')

    if (description) {
      exec(`gh repo edit ${ORG}/${slug} --description "${description.replace(/"/g, '\\"')}"`)
    }

    try {
      exec(`gh repo edit ${ORG}/${slug} --add-topic forkarcade-game`)
    } catch (e) { /* topic may exist */ }

    try {
      exec(`gh api repos/${ORG}/${slug}/pages -X POST -f build_type=legacy -f source[branch]=main -f source[path]=/`)
      results.push('GitHub Pages enabled')
    } catch (e) {
      results.push(e.message.includes('already exists') ? 'GitHub Pages already enabled' : `Pages warning: ${e.message}`)
    }

    const pagesUrl = `https://${ORG.toLowerCase()}.github.io/${slug}/`

    try {
      const configPath = resolve(absPath, '.forkarcade.json')
      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'))
        const nextVersion = (config.currentVersion || 0) + 1
        const versionDir = resolve(absPath, `versions/v${nextVersion}`)
        exec(`mkdir -p "${versionDir}"`)
        for (const f of ['index.html', 'game.js', 'style.css', 'sprites.js']) {
          if (existsSync(resolve(absPath, f))) exec(`cp "${resolve(absPath, f)}" "${versionDir}/"`)
        }
        config.currentVersion = nextVersion
        if (!config.versions) config.versions = []
        config.versions.push({
          version: nextVersion,
          date: new Date().toISOString().slice(0, 10),
          issue: null,
          description: nextVersion === 1 ? 'Initial release' : `Published v${nextVersion}`,
        })
        writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')
        exec(`git add versions/ .forkarcade.json && git commit -m "Version v${nextVersion}" && git push`, { cwd: absPath })
        results.push(`Version v${nextVersion} snapshot created`)
      }
    } catch (e) {
      results.push(`Version snapshot warning: ${e.message}`)
    }

    return JSON.stringify({
      ok: true, results,
      repo: `https://github.com/${ORG}/${slug}`,
      game_url: pagesUrl,
      platform_url: `http://localhost:5173/play/${slug}`,
    }, null, 2)
  } catch (e) {
    return JSON.stringify({ error: e.message, results })
  }
}
