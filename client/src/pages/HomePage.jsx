import { useState, useEffect } from 'react'
import { apiFetch } from '../api'
import GameCard from '../components/GameCard'

export default function HomePage() {
  const [games, setGames] = useState([])

  useEffect(() => {
    apiFetch('/api/games').then(setGames)
  }, [])

  return (
    <div>
      <h2>Games</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {games.map(g => <GameCard key={g.id} game={g} />)}
      </div>
      {games.length === 0 && <p>No games yet.</p>}
    </div>
  )
}
