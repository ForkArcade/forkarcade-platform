import { useState, useEffect } from 'react'
import { Routes, Route, Link, NavLink } from 'react-router-dom'
import { apiFetch } from './api'
import { T } from './theme'
import { Toolbar } from './components/ui'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import TemplatesPage from './pages/TemplatesPage'
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Toolbar
        left={
          <>
            <Link to="/" style={{ textDecoration: 'none', color: T.accent, fontSize: 16, fontWeight: 700, letterSpacing: -0.5 }}>
              ForkArcade
            </Link>
            <NavLink to="/" end style={({ isActive }) => ({
              textDecoration: 'none', fontSize: 12, color: isActive ? T.accent : T.textDim,
              textTransform: 'uppercase', letterSpacing: 0.5,
            })}>Games</NavLink>
            <NavLink to="/templates" style={({ isActive }) => ({
              textDecoration: 'none', fontSize: 12, color: isActive ? T.accent : T.textDim,
              textTransform: 'uppercase', letterSpacing: 0.5,
            })}>Templates</NavLink>
          </>
        }
        right={
          !user ? <LoginButton /> : (
            <>
              {user.avatar && <img src={user.avatar} alt="" width={24} height={24} style={{ borderRadius: '50%' }} />}
              <span style={{ fontSize: 13, color: T.text }}>@{user.login}</span>
              <button
                onClick={async () => { await apiFetch('/auth/logout', { method: 'POST' }); setUser(null) }}
                style={{
                  background: 'transparent', border: `1px solid ${T.border}`, color: T.textDim,
                  padding: '4px 10px', borderRadius: T.radius, cursor: 'pointer', fontSize: 11,
                }}
              >
                Logout
              </button>
            </>
          )
        }
      />
      <div style={{ flex: 1, padding: 16 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/play/:slug" element={<GamePage user={user} />} />
        </Routes>
      </div>
    </div>
  )
}
