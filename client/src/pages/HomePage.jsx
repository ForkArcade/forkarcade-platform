import { useState, useEffect } from 'react'
import GameCard from '../components/GameCard'

const GITHUB_ORG = 'ForkArcade'
const GAME_TOPIC = 'forkarcade-game'

export default function HomePage() {
  const [games, setGames] = useState([])

  useEffect(() => {
    fetch(`https://api.github.com/orgs/${GITHUB_ORG}/repos?type=public&per_page=100`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then(r => r.json())
      .then(repos => {
        const gameRepos = repos
          .filter(r => r.topics?.includes(GAME_TOPIC) && !r.is_template)
          .map(r => ({
            slug: r.name,
            title: r.description || r.name,
            topics: r.topics.filter(t => t !== GAME_TOPIC),
            owner: r.owner.login,
            github_pages_url: `https://${GITHUB_ORG.toLowerCase()}.github.io/${r.name}/`,
          }))
        setGames(gameRepos)
      })
  }, [])

  return (
    <div>
      <h2>Games</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {games.map(g => <GameCard key={g.slug} game={g} />)}
      </div>
      {games.length === 0 && <p>No games yet.</p>}
    </div>
  )
}
