// Fetches games and templates from GitHub API and writes to public/cache/
// Run before vite build: node prebuild.js

const ORG = 'ForkArcade'
const GAME_TOPIC = 'forkarcade-game'
const TEMPLATE_TOPIC = 'forkarcade-template'

import { mkdirSync, writeFileSync } from 'fs'

function formatSlug(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

async function main() {
  const res = await fetch(`https://api.github.com/orgs/${ORG}/repos?type=public&per_page=100`, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  })
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`)
  const repos = await res.json()

  const games = repos
    .filter(r => r.topics?.includes(GAME_TOPIC) && !r.is_template)
    .map(r => ({
      slug: r.name,
      title: formatSlug(r.name),
      description: r.description || null,
      topics: r.topics.filter(t => t !== GAME_TOPIC),
      thumbnail: null,
    }))

  const templates = repos
    .filter(r => r.topics?.includes(TEMPLATE_TOPIC))
    .map(r => ({
      slug: r.name,
      name: r.description || r.name,
      url: r.html_url,
      topics: r.topics.filter(t => t !== TEMPLATE_TOPIC),
    }))

  mkdirSync('public/cache', { recursive: true })
  writeFileSync('public/cache/games.json', JSON.stringify(games))
  writeFileSync('public/cache/templates.json', JSON.stringify(templates))

  console.log(`Cached ${games.length} games, ${templates.length} templates`)
}

main().catch(err => {
  console.error('Prebuild cache failed:', err.message)
  process.exit(1)
})
