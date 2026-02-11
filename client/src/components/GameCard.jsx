import { Link } from 'react-router-dom'

export default function GameCard({ game }) {
  return (
    <Link to={`/play/${game.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
        <h3 style={{ margin: '0 0 8px' }}>{game.title}</h3>
        <p style={{ color: '#666', margin: '0 0 8px' }}>{game.description}</p>
        <small>by @{game.author_login}</small>
      </div>
    </Link>
  )
}
