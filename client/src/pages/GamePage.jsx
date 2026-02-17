import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiFetch, GITHUB_ORG, GAME_TOPIC, formatSlug, githubFetch, githubRawUrl } from '../api'
import { T } from '../theme'
import { Panel, IconTabBar, Badge, EmptyState } from '../components/ui'
import Leaderboard from '../components/Leaderboard'
import NarrativePanel from '../components/NarrativePanel'
import { Trophy, BookOpen, Clock, Info, Loader, AlertCircle, FileText, Zap, Palette } from 'lucide-react'
import EvolvePanel from '../components/EvolvePanel'
import MdPopup from '../components/MdPopup'

const IFRAME_ORIGIN = `https://${GITHUB_ORG.toLowerCase()}.github.io`

const TAB_ICONS = {
  info: { label: 'Info', icon: Info },
  leaderboard: { label: 'Leaderboard', icon: Trophy },
  narrative: { label: 'Narrative', icon: BookOpen },
  evolve: { label: 'Evolve', icon: Zap },
  appearance: { label: 'Appearance', icon: Palette },
  changelog: { label: 'Changelog', icon: Clock },
}

export default function GamePage({ user, balance, onBalanceChange }) {
  const { slug } = useParams()
  const [game, setGame] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [tab, setTab] = useState('info')
  const tabRef = useRef(tab)
  tabRef.current = tab
  const narrativeRef = useRef({ variables: {}, graphs: {}, events: [] })
  const [narrativeState, setNarrativeState] = useState(narrativeRef.current)
  const narrativeFlushTimer = useRef(null)
  const [versions, setVersions] = useState([])
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [gameStatus, setGameStatus] = useState('loading') // loading | ready | unavailable
  const gameStatusRef = useRef('loading')
  const [focused, setFocused] = useState(false)
  const [sprites, setSprites] = useState(null)
  const [claudeMd, setClaudeMd] = useState(null) // null = not loaded yet, string = loaded content
  const [claudeMdPopup, setClaudeMdPopup] = useState(false)
  const [changelogPopup, setChangelogPopup] = useState(null) // { version, text } | null
  const changelogCache = useRef({})
  const iframeRef = useRef(null)

  const currentVersion = selectedVersion || (versions.length > 0 ? versions[versions.length - 1].version : null)

  const loadLeaderboard = useCallback(() => {
    const vParam = selectedVersion ? `?version=${selectedVersion}` : ''
    apiFetch(`/api/games/${slug}/leaderboard${vParam}`)
      .then(data => setLeaderboard(Array.isArray(data) ? data : []))
      .catch(() => setLeaderboard([]))
  }, [slug, selectedVersion])

  useEffect(() => {
    githubFetch(`/repos/${GITHUB_ORG}/${slug}`)
      .then(repo => setGame({ slug: repo.name, title: formatSlug(repo.name), description: repo.description || '', topics: repo.topics || [] }))
      .catch(() => setGame({ slug, title: formatSlug(slug), description: '', topics: [] }))

    fetch(githubRawUrl(`${GITHUB_ORG}/${slug}/main/.forkarcade.json`))
      .then(r => r.ok ? r.json() : null)
      .then(config => setVersions(config?.versions || []))
      .catch(() => setVersions([]))

    fetch(githubRawUrl(`${GITHUB_ORG}/${slug}/main/_sprites.json`))
      .then(r => r.ok ? r.json() : null)
      .then(data => setSprites(data))
      .catch(() => setSprites(null))

    fetch(githubRawUrl(`${GITHUB_ORG}/${slug}/main/CLAUDE.md`))
      .then(r => r.ok ? r.text() : null)
      .then(text => setClaudeMd(text))
      .catch(() => setClaudeMd(null))
  }, [slug])

  useEffect(() => { loadLeaderboard() }, [loadLeaderboard])

  const iframeUrl = selectedVersion
    ? `${IFRAME_ORIGIN}/${slug}/versions/v${selectedVersion}/`
    : `${IFRAME_ORIGIN}/${slug}/`

  const wrapperRef = useRef(null)

  useEffect(() => {
    const onMouseDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  useEffect(() => {
    setGameStatus('loading')
    gameStatusRef.current = 'loading'
    setFocused(false)

    // Retry: 4s → 8s → 16s (28s total, covers GitHub Pages deploy time)
    const delays = [4000, 8000, 16000]
    let attempt = 0
    let timer = null
    let cancelled = false

    function scheduleRetry() {
      if (cancelled || attempt >= delays.length) {
        if (!cancelled && gameStatusRef.current === 'loading') {
          setGameStatus('unavailable')
          gameStatusRef.current = 'unavailable'
        }
        return
      }
      timer = setTimeout(() => {
        if (cancelled || gameStatusRef.current !== 'loading') return
        if (iframeRef.current) iframeRef.current.src = iframeUrl
        attempt++
        scheduleRetry()
      }, delays[attempt])
    }

    scheduleRetry()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [iframeUrl])

  // Hot-reload sprites when editor saves to localStorage (cross-tab)
  useEffect(() => {
    const key = `fa-sprites-${slug}`
    function onStorage(e) {
      if (e.key !== key || !e.newValue || gameStatusRef.current !== 'ready') return
      try {
        iframeRef.current?.contentWindow.postMessage(
          { type: 'FA_SPRITES_UPDATE', sprites: JSON.parse(e.newValue) }, IFRAME_ORIGIN
        )
      } catch (err) {}
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [slug])

  useEffect(() => {
    function handleMessage(event) {
      const { data } = event
      if (!data || !data.type) return
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return

      switch (data.type) {
        case 'FA_READY':
          setGameStatus('ready')
          gameStatusRef.current = 'ready'
          iframeRef.current?.contentWindow.postMessage({ type: 'FA_INIT', slug, version: currentVersion }, IFRAME_ORIGIN)
          try {
            const savedSprites = localStorage.getItem(`fa-sprites-${slug}`)
            if (savedSprites) {
              iframeRef.current?.contentWindow.postMessage(
                { type: 'FA_SPRITES_UPDATE', sprites: JSON.parse(savedSprites) }, IFRAME_ORIGIN
              )
            }
          } catch (e) {}
          break
        case 'FA_SUBMIT_SCORE':
          apiFetch(`/api/games/${slug}/score`, {
            method: 'POST',
            body: JSON.stringify({ score: data.score, version: data.version || currentVersion }),
          }).then(result => {
            iframeRef.current?.contentWindow.postMessage({ type: 'FA_SCORE_RESULT', ok: result.ok, requestId: data.requestId }, IFRAME_ORIGIN)
            if (result.coins > 0) {
              iframeRef.current?.contentWindow.postMessage({ type: 'FA_COIN_EARNED', coins: result.coins, isPersonalRecord: result.isPersonalRecord }, IFRAME_ORIGIN)
              onBalanceChange(prev => (prev ?? 0) + result.coins)
            }
            loadLeaderboard()
          }).catch(() => {
            iframeRef.current?.contentWindow.postMessage({ type: 'FA_SCORE_RESULT', error: 'submit_failed', requestId: data.requestId }, IFRAME_ORIGIN)
          })
          break
        case 'FA_GET_PLAYER':
          iframeRef.current?.contentWindow.postMessage(
            user
              ? { type: 'FA_PLAYER_INFO', login: user.login, sub: user.sub, requestId: data.requestId }
              : { type: 'FA_PLAYER_INFO', error: 'not_logged_in', requestId: data.requestId },
            IFRAME_ORIGIN
          )
          break
        case 'FA_NARRATIVE_UPDATE': {
          const nr = narrativeRef.current
          narrativeRef.current = {
            variables: data.variables || nr.variables,
            graphs: data.graphs || nr.graphs,
            events: data.event ? [...nr.events, data.event].slice(-20) : nr.events,
          }
          if (tabRef.current === 'narrative' && !narrativeFlushTimer.current) {
            narrativeFlushTimer.current = setTimeout(() => {
              narrativeFlushTimer.current = null
              setNarrativeState({ ...narrativeRef.current })
            }, 500)
          }
          break
        }
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [slug, user, loadLeaderboard, currentVersion])

  // Sync narrative ref to state when switching to narrative tab
  useEffect(() => {
    if (tab === 'narrative') setNarrativeState({ ...narrativeRef.current })
  }, [tab])

  // Cleanup narrative throttle timer
  useEffect(() => () => clearTimeout(narrativeFlushTimer.current), [])

  if (!game) return <EmptyState>Loading...</EmptyState>

  const iconTabs = ['info', 'leaderboard', 'narrative', 'evolve', 'appearance', versions.length > 0 && 'changelog']
    .filter(Boolean).map(k => ({ key: k, ...TAB_ICONS[k] }))

  return (
    <div style={{ display: 'flex', height: '100%', gap: T.sp[4] }}>
      <div ref={wrapperRef} style={{
        flex: 1,
        background: '#000',
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.lg,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <iframe
          ref={iframeRef}
          src={iframeUrl}
          sandbox="allow-scripts allow-same-origin"
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          title={game.title}
        />
        {gameStatus === 'ready' && !focused && (
          <div onClick={() => { setFocused(true); iframeRef.current?.focus() }}
            style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(0,0,0,0.4) 0%, rgba(0,0,0,1) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1 }}>
            <span style={{ fontSize: T.fontSize.sm, color: T.textBright, letterSpacing: T.tracking.wider, textTransform: 'uppercase', padding: `${T.sp[4]}px ${T.sp[6]}px`, border: `1px solid ${T.border}`, borderRadius: T.radius.md, background: T.surface }}>
              Click to focus
            </span>
          </div>
        )}
        {gameStatus !== 'ready' && (
          <div style={{ position: 'absolute', inset: 0, background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: T.sp[5] }}>
            <img src="/logo.svg" alt="" width={48} height={48} style={{ opacity: gameStatus === 'loading' ? 0.3 : 0.15 }} />
            {gameStatus === 'loading'
              ? <><Loader size={16} color={T.muted} style={{ animation: 'spin 1.5s linear infinite' }} /><span style={{ fontSize: T.fontSize.xs, color: T.muted, letterSpacing: T.tracking.wider, textTransform: 'uppercase' }}>Loading game</span></>
              : <><AlertCircle size={16} color={T.muted} /><span style={{ fontSize: T.fontSize.xs, color: T.muted, letterSpacing: T.tracking.wider, textTransform: 'uppercase' }}>Game unavailable</span><span style={{ fontSize: T.fontSize.xs, color: T.border, maxWidth: 240, textAlign: 'center', lineHeight: T.leading.relaxed }}>GitHub Pages not deployed yet or currently rebuilding</span></>
            }
          </div>
        )}
      </div>

      <Panel style={{ width: 260, minWidth: 260, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: `${T.sp[3]}px ${T.sp[4]}px`, borderBottom: `1px solid ${T.border}`, minHeight: 36 }}>
          <span style={{ fontSize: T.fontSize.xs, fontWeight: T.weight.medium, color: T.muted, textTransform: 'uppercase', letterSpacing: T.tracking.widest }}>{slug}</span>
        </div>
        {versions.length > 0 && (
          <div style={{ padding: `${T.sp[3]}px ${T.sp[4]}px`, borderBottom: `1px solid ${T.border}` }}>
            <select value={selectedVersion ?? ''} onChange={e => setSelectedVersion(e.target.value ? Number(e.target.value) : null)}
              style={{ width: '100%', height: 28, background: T.surface, color: T.textBright, border: `1px solid ${T.border}`, borderRadius: T.radius.md, padding: `0 ${T.sp[3]}px`, fontSize: T.fontSize.xs, fontFamily: T.mono, letterSpacing: T.tracking.wide, cursor: 'pointer', outline: 'none' }}>
              <option value="">Latest (v{versions[versions.length - 1].version})</option>
              {versions.slice(0, -1).reverse().map(v => <option key={v.version} value={v.version}>v{v.version} — {v.description}</option>)}
            </select>
          </div>
        )}
        <IconTabBar tabs={iconTabs} active={tab} onChange={setTab} />
        <div style={{ padding: `${T.sp[3]}px ${T.sp[5]}px`, borderBottom: `1px solid ${T.border}`, fontSize: T.fontSize.xs, fontWeight: T.weight.medium, color: T.muted, textTransform: 'uppercase', letterSpacing: T.tracking.widest }}>
          {TAB_ICONS[tab]?.label}
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: T.sp[5] }}>
            {tab === 'info' && (
              <div>
                <div style={{ fontSize: T.fontSize.base, fontWeight: T.weight.semibold, color: T.textBright, marginBottom: T.sp[4] }}>{game.title}</div>
                {game.description && <div style={{ fontSize: T.fontSize.xs, color: T.text, lineHeight: T.leading.relaxed, marginBottom: T.sp[5] }}>{game.description}</div>}
                {(() => { const tags = game.topics.filter(t => t !== GAME_TOPIC); return tags.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: T.sp[2], marginBottom: T.sp[5] }}>{tags.map(t => <Badge key={t}>{t}</Badge>)}</div> })()}
                {claudeMd && (
                  <button onClick={() => setClaudeMdPopup(true)} style={{ display: 'flex', alignItems: 'center', gap: T.sp[3], padding: `${T.sp[3]}px ${T.sp[4]}px`, background: T.elevated, border: `1px solid ${T.border}`, borderRadius: T.radius.md, color: T.text, fontSize: T.fontSize.xs, fontFamily: T.mono, cursor: 'pointer', width: '100%' }}>
                    <FileText size={14} /> CLAUDE.md
                  </button>
                )}
              </div>
            )}
            {tab === 'leaderboard' && <Leaderboard rows={leaderboard} />}
            {tab === 'narrative' && <NarrativePanel narrativeState={narrativeState} />}
            {tab === 'evolve' && <EvolvePanel slug={slug} user={user} balance={balance} onBalanceChange={onBalanceChange} />}
            {tab === 'appearance' && (
              <Link to={`/edit/${slug}`} style={{ display: 'flex', alignItems: 'center', gap: T.sp[3], padding: `${T.sp[3]}px ${T.sp[4]}px`, background: T.elevated, border: `1px solid ${T.border}`, borderRadius: T.radius.md, color: T.accentColor, fontSize: T.fontSize.xs, fontFamily: T.mono, textDecoration: 'none', cursor: 'pointer' }}>
                <Palette size={14} /> Open Editor
              </Link>
            )}
            {tab === 'changelog' && (
              <div>
                {versions.slice().reverse().map(v => (
                  <div key={v.version} onClick={() => {
                    const ck = `v${v.version}`
                    if (changelogCache.current[ck]) { setChangelogPopup({ version: v.version, text: changelogCache.current[ck] }); return }
                    fetch(githubRawUrl(`${GITHUB_ORG}/${slug}/main/changelog/v${v.version}.md`))
                      .then(r => r.ok ? r.text() : null)
                      .then(text => { if (text) { changelogCache.current[ck] = text; setChangelogPopup({ version: v.version, text }) } })
                      .catch(() => {})
                  }} style={{ marginBottom: T.sp[5], borderLeft: `2px solid ${T.border}`, paddingLeft: T.sp[4], cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: T.sp[3] }}>
                      <span style={{ color: T.accentColor, fontFamily: T.mono, fontSize: T.fontSize.xs }}>v{v.version}</span>
                      <span style={{ color: T.muted, fontSize: T.fontSize.xs }}>{v.date}{v.issue && ` #${v.issue}`}</span>
                    </div>
                    <div style={{ fontSize: T.fontSize.xs, color: T.text, marginTop: T.sp[1], lineHeight: T.leading.normal }}>{v.description}</div>
                  </div>
                ))}
                {versions.length === 0 && <EmptyState>No versions yet</EmptyState>}
              </div>
            )}
          </div>
        </Panel>

      {claudeMdPopup && claudeMd && (
        <MdPopup title="CLAUDE.md" text={claudeMd} onClose={() => setClaudeMdPopup(false)} />
      )}
      {changelogPopup && (
        <MdPopup title={`Changelog v${changelogPopup.version}`} text={changelogPopup.text} onClose={() => setChangelogPopup(null)} />
      )}
    </div>
  )
}
