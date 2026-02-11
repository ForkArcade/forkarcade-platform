import { useState, useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { apiFetch } from './api'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import LoginButton from './components/LoginButton'

export default function App() {
  const [user, setUser] = useState(null)

  async function me() {
    try {
      const j = await apiFetch('/api/me')
      if (j.user) setUser(j.user)
    } catch {}
  }

  useEffect(() => { me() }, [])

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h1 style={{ margin: 0 }}>ForkArcade</h1>
        </Link>
        {!user ? <LoginButton /> : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {user.avatar && <img src={user.avatar} alt="" width={28} height={28} style={{ borderRadius: '50%' }} />}
            <span>@{user.login}</span>
            <button onClick={async () => {
              await apiFetch('/auth/logout', { method: 'POST' })
              setUser(null)
            }}>Logout</button>
          </div>
        )}
      </header>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/play/:slug" element={<GamePage user={user} />} />
      </Routes>
    </div>
  )
}
