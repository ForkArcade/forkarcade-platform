import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { T } from '../theme'
import { GITHUB_ORG, GAME_TOPIC, formatSlug, githubFetch, githubRawUrl } from '../api'
import { PageHeader, Grid, Card, CardTitle, CardDescription, CardTags, Badge, SectionHeading, PillTabs, EmptyState } from '../components/ui'
import NewGamePanel from '../components/NewGamePanel'
import LoginButton from '../components/LoginButton'

const ABOUT_TABS = [
  { key: 'general', label: 'General' },
  { key: 'coins', label: 'Coins' },
  { key: 'evolve', label: 'Evolve' },
  { key: 'propose', label: 'Propose' },
]

const ABOUT_CONTENT = {
  general: 'ForkArcade is an open platform for web games built entirely by AI. Play games, earn ForkCoin, and shape what gets built next. Every game runs on GitHub Pages, built from templates by Claude Code.',
  coins: 'Earn ForkCoin by playing. Every score submit mints coins — 10% of your score, with a 50% bonus for personal records. Spend coins to vote on game changes or propose new games. Coins are burned on voting — they don\'t come back.',
  evolve: 'Games evolve through player votes. Open the Evolve tab on any game, propose a change or vote on existing ones. When enough players vote, AI implements the top issue and creates a new version — every version stays playable.',
  propose: 'Want a new game? Propose it below. Describe the concept, pick a template, and let others vote. At 10 unique voters the proposal is approved and queued for creation by Claude Code.',
}

export default function HomePage({ user, balance, onBalanceChange }) {
  const [games, setGames] = useState([])
  const [status, setStatus] = useState('loading')
  const [aboutTab, setAboutTab] = useState('general')

  useEffect(() => {
    githubFetch(`/orgs/${GITHUB_ORG}/repos?type=public&per_page=100`)
      .then(repos => {
        const gameList = repos
          .filter(r => r.topics?.includes(GAME_TOPIC) && !r.is_template)
          .map(r => ({
            slug: r.name,
            title: formatSlug(r.name),
            description: r.description || null,
            topics: r.topics.filter(t => t !== GAME_TOPIC),
            thumbnail: null,
          }))
        setGames(gameList)
        setStatus('ok')

        const thumbs = {}
        let loaded = 0
        gameList.forEach((game, i) => {
          const url = githubRawUrl(`${GITHUB_ORG}/${game.slug}/main/_thumbnail.png`)
          const img = new window.Image()
          img.onload = () => {
            thumbs[i] = url
            if (++loaded === gameList.length) {
              setGames(prev => prev.map((g, j) => thumbs[j] ? { ...g, thumbnail: thumbs[j] } : g))
            }
          }
          img.onerror = () => {
            if (++loaded === gameList.length) {
              setGames(prev => prev.map((g, j) => thumbs[j] ? { ...g, thumbnail: thumbs[j] } : g))
            }
          }
          img.src = url
        })
      })
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div style={{ display: 'flex', gap: T.sp[8] }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <PageHeader>Games</PageHeader>
        <Grid>
          {games.map(g => (
            <Card key={g.slug} to={`/play/${g.slug}`} thumbnail={g.thumbnail}>
              <CardTitle>{g.title}</CardTitle>
              {g.description && <CardDescription>{g.description}</CardDescription>}
              {g.topics?.length > 0 && <CardTags>{g.topics.map(t => <Badge key={t}>{t}</Badge>)}</CardTags>}
            </Card>
          ))}
        </Grid>
        {status === 'loading' && <EmptyState>Loading games...</EmptyState>}
        {status === 'error' && <EmptyState>Server is waking up — free Render.com plan spins down after inactivity. Refresh in a few seconds.</EmptyState>}
        {status === 'ok' && games.length === 0 && <EmptyState>No games yet.</EmptyState>}
      </div>

      <aside style={{ width: 260, minWidth: 260, paddingTop: T.sp[9] }}>
        <div style={{ marginBottom: T.sp[5] }}>
          <PillTabs tabs={ABOUT_TABS} active={aboutTab} onChange={setAboutTab} />
        </div>

        <p style={{
          fontSize: T.fontSize.sm,
          color: T.text,
          lineHeight: T.leading.relaxed,
          letterSpacing: T.tracking.normal,
          marginBottom: T.sp[7],
        }}>
          {ABOUT_CONTENT[aboutTab]}
        </p>

        <Link to="/templates" style={{
          display: 'block',
          fontSize: T.fontSize.xs,
          color: T.muted,
          textDecoration: 'none',
          marginBottom: T.sp[6],
        }}>
          Browse templates →
        </Link>

        <SectionHeading>Propose New Game</SectionHeading>
        <NewGamePanel user={user} balance={balance} onBalanceChange={onBalanceChange} />
      </aside>

      {!user && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: T.radius.xl, padding: `${T.sp[9]}px ${T.sp[8]}px`,
            textAlign: 'center', maxWidth: 360,
          }}>
            <img src="/logo.svg" alt="" width={48} height={48} style={{ marginBottom: T.sp[5] }} />
            <h2 style={{ color: T.textBright, fontSize: T.fontSize.lg, fontWeight: T.weight.bold, margin: `0 0 ${T.sp[3]}px` }}>
              Welcome to ForkArcade
            </h2>
            <p style={{ color: T.text, fontSize: T.fontSize.sm, lineHeight: T.leading.relaxed, margin: `0 0 ${T.sp[7]}px` }}>
              Sign in with GitHub to play games, earn coins, and shape what gets built next.
            </p>
            <LoginButton />
          </div>
        </div>
      )}
    </div>
  )
}
