export default function Leaderboard({ rows = [] }) {
  const list = Array.isArray(rows) ? rows : []
  return (
    <div style={{ minWidth: 200 }}>
      <h3>Leaderboard</h3>
      {list.length === 0 && <p>No scores yet</p>}
      {list.map((r, i) => (
        <div key={i}>{i + 1}. {r.login} — {r.best}</div>
      ))}
    </div>
  )
}
