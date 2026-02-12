import { useState, useEffect } from 'react'
import { T } from '../theme'
import { GITHUB_ORG, githubFetch } from '../api'
import GameCard from '../components/GameCard'

const GAME_TOPIC = 'forkarcade-game'

export default function HomePage() {
  const [games, setGames] = useState([])

  useEffect(() => {
    githubFetch(`/orgs/${GITHUB_ORG}/repos?type=public&per_page=100`)
      .then(repos => {
        const gameList = repos
          .filter(r => r.topics?.includes(GAME_TOPIC) && !r.is_template)
          .map(r => ({ slug: r.name, title: r.description || r.name, topics: r.topics.filter(t => t !== GAME_TOPIC), thumbnail: null }))
        setGames(gameList)

        gameList.forEach((game, i) => {
          fetch(`https://raw.githubusercontent.com/${GITHUB_ORG}/${game.slug}/main/_thumbnail.txt`)
            .then(r => { if (!r.ok) throw new Error(); return r.text() })
            .then(text => {
              setGames(prev => prev.map((g, j) => j === i ? { ...g, thumbnail: text.trimEnd() } : g))
            })
            .catch(() => {})
        })
      })
      .catch(() => setGames([]))
  }, [])

  return (
    <div>
      <h2 style={{ color: T.textBright, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, margin: '8px 0 16px' }}>Games</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {games.map(g => <GameCard key={g.slug} game={g} />)}
      </div>
      {games.length === 0 && <p style={{ color: T.textDim }}>No games yet.</p>}
    </div>
  )
}
