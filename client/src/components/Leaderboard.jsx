import { T } from '../theme'
import { EmptyState } from './ui'

export default function Leaderboard({ rows = [] }) {
  if (rows.length === 0) return <EmptyState>No scores yet</EmptyState>

  return (
    <div>
      {rows.map((r, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: T.sp[4],
            padding: `${T.sp[3]}px 0`,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <span style={{ color: T.gold, fontFamily: T.mono, fontSize: T.fontSize.xs, minWidth: 20, textAlign: 'right' }}>
            {i + 1}
          </span>
          <span style={{ flex: 1, color: T.textBright, fontSize: T.fontSize.sm }}>{r.login}</span>
          <span style={{ color: T.gold, fontFamily: T.mono, fontSize: T.fontSize.sm }}>{r.best}</span>
        </div>
      ))}
    </div>
  )
}
