import { useState, useEffect } from 'react'
import { T } from '../theme'
import { GITHUB_ORG, githubFetch, fetchBuildCache } from '../api'
import { PageHeader, Grid, Card, CardTitle, CardDescription, CardTags, Badge, SectionHeading, PillTabs, EmptyState } from '../components/ui'

const GAME_TOPIC = 'forkarcade-game'

function formatSlug(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const ABOUT_TABS = [
  { key: 'general', label: 'General' },
  { key: 'narrative', label: 'Narrative' },
  { key: 'platform', label: 'Platform' },
  { key: 'evolve', label: 'Evolve' },
]

const ABOUT_CONTENT = {
  general: 'ForkArcade is an open platform for web games built entirely by AI. Every game runs on GitHub Pages, scores are shared across players, and anyone can fork a template to create something new.',
  narrative: 'Each game template includes a built-in narrative engine. Story graphs, branching choices, variables and events all run client-side inside the game iframe, synced to the platform via postMessage in real time.',
  platform: 'Games are automatically wrapped in standard elements — title screens, score submission, player identification. Templates provide the engine, MCP tools handle scaffolding, validation, pixel art sprites and publishing. Claude Code does the rest.',
  evolve: 'Games evolve through GitHub issues. Players submit feedback or feature requests, Claude Code picks them up, implements changes, and opens a PR — each merge creates a new playable version. The goal: users submit issues directly from this platform and AI evolves games under the hood.',
}

export default function HomePage() {
  const [games, setGames] = useState([])
  const [status, setStatus] = useState('loading')
  const [aboutTab, setAboutTab] = useState('general')

  useEffect(() => {
    fetchBuildCache('games').then(data => {
      if (data) { setGames(data); setStatus('ok') }
    })

    githubFetch(`/orgs/${GITHUB_ORG}/repos?type=public&per_page=100`)
      .then(repos => {
        const gameList = repos
          .filter(r => r.topics?.includes(GAME_TOPIC) && !r.is_template)
          .map(r => ({
            slug: r.name,
            title: formatSlug(r.name),
            description: r.description || null,
            topics: r.topics.filter(t => t !== GAME_TOPIC),
            thumbnail: null,
          }))
        setGames(gameList)
        setStatus('ok')

        gameList.forEach((game, i) => {
          const url = `https://raw.githubusercontent.com/${GITHUB_ORG}/${game.slug}/main/_thumbnail.png`
          const img = new window.Image()
          img.onload = () => {
            setGames(prev => prev.map((g, j) => j === i ? { ...g, thumbnail: url } : g))
          }
          img.src = url
        })
      })
      .catch(() => {})
  }, [])

  return (
    <div style={{ display: 'flex', gap: T.sp[8] }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <PageHeader>Games</PageHeader>
        <Grid>
          {games.map(g => (
            <Card key={g.slug} to={`/play/${g.slug}`} thumbnail={g.thumbnail}>
              <CardTitle>{g.title}</CardTitle>
              {g.description && <CardDescription>{g.description}</CardDescription>}
              {g.topics?.length > 0 && <CardTags>{g.topics.map(t => <Badge key={t}>{t}</Badge>)}</CardTags>}
            </Card>
          ))}
        </Grid>
        {status === 'loading' && <EmptyState>Loading games...</EmptyState>}
        {status === 'error' && <EmptyState>Server is waking up — free Render.com plan spins down after inactivity. Refresh in a few seconds.</EmptyState>}
        {status === 'ok' && games.length === 0 && <EmptyState>No games yet.</EmptyState>}
      </div>

      <aside style={{ width: 260, minWidth: 260, paddingTop: T.sp[9] }}>
        <div style={{ marginBottom: T.sp[5] }}>
          <PillTabs tabs={ABOUT_TABS} active={aboutTab} onChange={setAboutTab} />
        </div>

        <p style={{
          fontSize: T.fontSize.sm,
          color: T.text,
          lineHeight: T.leading.relaxed,
          letterSpacing: T.tracking.normal,
          marginBottom: T.sp[7],
        }}>
          {ABOUT_CONTENT[aboutTab]}
        </p>

        <SectionHeading>Filter</SectionHeading>
        <p style={{
          fontSize: T.fontSize.sm,
          color: T.muted,
          lineHeight: T.leading.normal,
        }}>
          Coming soon
        </p>
      </aside>
    </div>
  )
}
