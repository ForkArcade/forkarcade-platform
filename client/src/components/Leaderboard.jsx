export default function Leaderboard({ rows }) {
  return (
    <div style={{ minWidth: 200 }}>
      <h3>Leaderboard</h3>
      {rows.length === 0 && <p>No scores yet</p>}
      {rows.map((r, i) => (
        <div key={i}>{i + 1}. {r.login} — {r.best}</div>
      ))}
    </div>
  )
}
