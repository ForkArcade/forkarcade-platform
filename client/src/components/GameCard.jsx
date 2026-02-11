import { Link } from 'react-router-dom'

export default function GameCard({ game }) {
  return (
    <Link to={`/play/${game.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
        <h3 style={{ margin: '0 0 8px' }}>{game.title}</h3>
        {game.topics?.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {game.topics.map(t => (
              <span key={t} style={{ background: '#eee', borderRadius: 4, padding: '1px 6px', fontSize: 11 }}>{t}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
