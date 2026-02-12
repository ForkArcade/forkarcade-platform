import { useState, useEffect } from 'react'
import { T } from '../theme'
import { GITHUB_ORG, githubFetch } from '../api'
import { PageHeader, Grid, Card, CardTitle, CardDescription, CardTags, Badge, SectionHeading, EmptyState } from '../components/ui'

const GAME_TOPIC = 'forkarcade-game'

function formatSlug(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function HomePage() {
  const [games, setGames] = useState([])

  useEffect(() => {
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

        gameList.forEach((game, i) => {
          const url = `https://raw.githubusercontent.com/${GITHUB_ORG}/${game.slug}/main/_thumbnail.png`
          const img = new window.Image()
          img.onload = () => {
            setGames(prev => prev.map((g, j) => j === i ? { ...g, thumbnail: url } : g))
          }
          img.src = url
        })
      })
      .catch(() => setGames([]))
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
        {games.length === 0 && <EmptyState>No games yet.</EmptyState>}
      </div>

      <aside style={{
        width: 240,
        minWidth: 240,
        paddingTop: T.sp[9],
      }}>
        <SectionHeading>About</SectionHeading>
        <p style={{
          fontSize: T.fontSize.sm,
          color: T.text,
          lineHeight: T.leading.relaxed,
          letterSpacing: T.tracking.normal,
          marginBottom: T.sp[7],
        }}>
          ForkArcade is an open platform for web games. Every game runs on GitHub Pages, scores are shared across players, and anyone can fork a template to create something new.
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
