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
          <pre style={{
            margin: '0 0 10px',
            fontFamily: T.mono,
            fontSize: 7,
            lineHeight: 1.0,
            color: T.accent,
            letterSpacing: 0,
            overflow: 'hidden',
            whiteSpace: 'pre',
            userSelect: 'none',
          }}>
            {game.thumbnail}
          </pre>
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
