import { useState, useEffect } from 'react'
import { GITHUB_ORG, githubFetch } from '../api'
import { PageHeader, Grid, Card, CardTitle, CardDescription, CardTags, Badge, EmptyState } from '../components/ui'

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
    <div>
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
  )
}
