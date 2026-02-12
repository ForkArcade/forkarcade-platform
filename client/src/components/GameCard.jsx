import { useState } from 'react'
import { Link } from 'react-router-dom'
import { T } from '../theme'
import { Badge } from './ui'

export default function GameCard({ game }) {
  const [hover, setHover] = useState(false)

  return (
    <Link to={`/play/${game.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          background: T.elevated,
          border: `1px solid ${hover ? T.accent + '60' : T.border}`,
          borderRadius: T.radius,
          padding: 16,
          transition: 'border-color 0.15s',
        }}
      >
        {game.thumbnail && (
          <img
            src={game.thumbnail}
            alt={game.title}
            style={{
              width: '100%',
              height: 'auto',
              imageRendering: 'pixelated',
              borderRadius: 2,
              marginBottom: 10,
              display: 'block',
            }}
          />
        )}
        <h3 style={{ margin: '0 0 8px', fontSize: 14, color: T.textBright }}>{game.title}</h3>
        {game.topics?.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {game.topics.map(t => <Badge key={t}>{t}</Badge>)}
          </div>
        )}
      </div>
    </Link>
  )
}
