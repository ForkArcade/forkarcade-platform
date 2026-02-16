import { useState, useEffect } from 'react'
import { Routes, Route, Link, NavLink, useLocation } from 'react-router-dom'
import { apiFetch, setToken, clearToken, getToken } from './api'
import { T } from './theme'
import { Toolbar, Button, Separator } from './components/ui'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import TemplatesPage from './pages/TemplatesPage'
import TemplateDetailPage from './pages/TemplateDetailPage'
import SpriteEditorPage from './pages/SpriteEditorPage'
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
  const [walletBalance, setWalletBalance] = useState(null)
  const location = useLocation()
  const isGamePage = location.pathname.startsWith('/play/') || location.pathname.startsWith('/sprites/')

  async function me() {
    try {
      const j = await apiFetch('/api/me')
      if (j.user) {
        setUser(j.user)
        apiFetch('/api/wallet').then(w => setWalletBalance(w.balance ?? 0)).catch(() => {})
      }
    } catch (err) { console.warn('Auth check failed:', err.message) }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      setToken(token)
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (getToken()) me()
  }, [])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Toolbar
        left={
          <>
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: T.sp[3] }}>
              <img src="/logo.svg" alt="" width={28} height={28} />
              <span style={{ color: T.accent, fontSize: T.fontSize.lg, fontWeight: T.weight.bold, letterSpacing: T.tracking.tighter }}>ForkArcade</span>
            </Link>
            <NavLink to="/" end style={({ isActive }) => navStyle(isActive)}>Games</NavLink>
            <NavLink to="/templates" style={({ isActive }) => navStyle(isActive)}>Templates</NavLink>
          </>
        }
        right={
          !user ? <LoginButton /> : (
            <>
              {walletBalance != null && walletBalance > 0 && (
                <span style={{ fontFamily: T.mono, fontSize: T.fontSize.xs, color: T.gold, fontWeight: T.weight.medium }}>{walletBalance}c</span>
              )}
              {user.avatar && <img src={user.avatar} alt="" width={24} height={24} style={{ borderRadius: '50%' }} />}
              <span style={{ fontSize: T.fontSize.sm, color: T.text }}>@{user.login}</span>
              <Button
                variant="ghost"
                onClick={() => { clearToken(); setUser(null); setWalletBalance(null) }}
              >
                Logout
              </Button>
            </>
          )
        }
      />
      <div style={{ flex: 1, padding: isGamePage ? `${T.sp[4]}px ${T.sp[5]}px` : T.sp[7], overflow: isGamePage ? 'hidden' : 'auto' }}>
        <Routes>
          <Route path="/" element={<HomePage user={user} balance={walletBalance ?? 0} onBalanceChange={setWalletBalance} />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/templates/:slug" element={<TemplateDetailPage />} />
          <Route path="/play/:slug" element={<GamePage user={user} balance={walletBalance ?? 0} onBalanceChange={setWalletBalance} />} />
          <Route path="/sprites/:slug" element={<SpriteEditorPage user={user} />} />
        </Routes>
      </div>
      <footer style={{ borderTop: `1px solid ${T.border}`, padding: `${T.sp[6]}px ${T.sp[7]}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: T.sp[3] }}>
          <img src="/logo.svg" alt="" width={14} height={14} style={{ opacity: 0.5 }} />
          <span style={{ fontSize: T.fontSize.xs, color: T.muted, letterSpacing: T.tracking.wide }}>ForkArcade</span>
        </div>
        <div style={{ display: 'flex', gap: T.sp[5], fontSize: T.fontSize.xs }}>
          <a href="https://github.com/ForkArcade" target="_blank" rel="noopener noreferrer" style={{ color: T.muted, textDecoration: 'none' }}>GitHub</a>
          <Separator />
          <a href="/pitchdeck.html" target="_blank" rel="noopener noreferrer" style={{ color: T.muted, textDecoration: 'none' }}>Pitch Deck</a>
          <Separator />
          <a href="/video.gif" target="_blank" rel="noopener noreferrer" style={{ color: T.muted, textDecoration: 'none' }}>Demo</a>
          <Separator />
          <span style={{ color: T.muted }}>Built with Claude Code</span>
        </div>
      </footer>
    </div>
  )
}
