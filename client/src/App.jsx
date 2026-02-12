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
  letterSpacing: T.tracking.wider,
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
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: T.sp[3] }}>
              <img src="/logo.png" alt="" width={28} height={28} style={{ imageRendering: 'pixelated' }} />
              <span style={{ color: T.accent, fontSize: T.fontSize.lg, fontWeight: T.weight.bold, letterSpacing: T.tracking.tighter }}>
                ForkArcade
              </span>
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
      <footer style={{
        borderTop: `1px solid ${T.border}`,
        padding: `${T.sp[6]}px ${T.sp[7]}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: T.sp[3] }}>
          <img src="/logo.png" alt="" width={20} height={20} style={{ imageRendering: 'pixelated', opacity: 0.5 }} />
          <span style={{ fontSize: T.fontSize.xs, color: T.muted, letterSpacing: T.tracking.wide }}>
            ForkArcade
          </span>
        </div>
        <div style={{ display: 'flex', gap: T.sp[5], fontSize: T.fontSize.xs }}>
          <a href="https://github.com/ForkArcade" target="_blank" rel="noopener noreferrer" style={{ color: T.muted, textDecoration: 'none' }}>
            GitHub
          </a>
          <span style={{ color: T.border }}>|</span>
          <span style={{ color: T.muted }}>
            Built with Claude Code
          </span>
        </div>
      </footer>
    </div>
  )
}
