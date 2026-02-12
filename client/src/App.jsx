import { useState, useEffect } from 'react'
import { Routes, Route, Link, NavLink } from 'react-router-dom'
import { apiFetch } from './api'
import { T } from './theme'
import { Toolbar, Button } from './components/ui'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import TemplatesPage from './pages/TemplatesPage'
import LoginButton from './components/LoginButton'

const navStyle = (isActive) => ({
  textDecoration: 'none',
  fontSize: T.fontSize.xs,
  fontWeight: isActive ? T.weight.medium : T.weight.normal,
  color: isActive ? T.accentColor : T.text,
  textTransform: 'uppercase',
  letterSpacing: 1,
})

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
            <Link to="/" style={{ textDecoration: 'none', color: T.accent, fontSize: T.fontSize.lg, fontWeight: T.weight.bold, letterSpacing: -0.5 }}>
              ForkArcade
            </Link>
            <NavLink to="/" end style={({ isActive }) => navStyle(isActive)}>Games</NavLink>
            <NavLink to="/templates" style={({ isActive }) => navStyle(isActive)}>Templates</NavLink>
          </>
        }
        right={
          !user ? <LoginButton /> : (
            <>
              {user.avatar && <img src={user.avatar} alt="" width={24} height={24} style={{ borderRadius: '50%' }} />}
              <span style={{ fontSize: T.fontSize.sm, color: T.text }}>@{user.login}</span>
              <Button
                variant="ghost"
                onClick={async () => { await apiFetch('/auth/logout', { method: 'POST' }); setUser(null) }}
              >
                Logout
              </Button>
            </>
          )
        }
      />
      <div style={{ flex: 1, padding: T.sp[7] }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/play/:slug" element={<GamePage user={user} />} />
        </Routes>
      </div>
    </div>
  )
}
