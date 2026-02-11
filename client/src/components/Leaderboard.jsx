import { T } from '../theme'

export default function Leaderboard({ rows = [] }) {
  const list = Array.isArray(rows) ? rows : []

  if (list.length === 0) {
    return <div style={{ color: T.textDim, fontSize: 12, padding: '8px 0' }}>No scores yet</div>
  }

  return (
    <div>
      {list.map((r, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 0',
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <span style={{ color: T.gold, fontFamily: T.mono, fontSize: 11, minWidth: 20, textAlign: 'right' }}>
            {i + 1}
          </span>
          <span style={{ flex: 1, color: T.textBright, fontSize: 12 }}>{r.login}</span>
          <span style={{ color: T.gold, fontFamily: T.mono, fontSize: 12 }}>{r.best}</span>
        </div>
      ))}
    </div>
  )
}
