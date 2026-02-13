import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { apiFetch, GITHUB_ORG, githubFetch } from '../api'
import { T } from '../theme'
import { Panel, IconTabBar, Badge, SegmentedControl, EmptyState } from '../components/ui'
import Leaderboard from '../components/Leaderboard'
import NarrativePanel from '../components/NarrativePanel'
import { Trophy, BookOpen, Clock, Info, Loader, AlertCircle, FileText, Zap } from 'lucide-react'
import EvolvePanel from '../components/EvolvePanel'
import { MdPopup } from '../components/MdPopup'

const TAB_ICONS = {
  info: { label: 'Info', icon: Info },
  leaderboard: { label: 'Leaderboard', icon: Trophy },
  narrative: { label: 'Narrative', icon: BookOpen },
  evolve: { label: 'Evolve', icon: Zap },
  changelog: { label: 'Changelog', icon: Clock },
}

export default function GamePage({ user, balance, onBalanceChange }) {
  const { slug } = useParams()
  const [game, setGame] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [tab, setTab] = useState('info')
  const [narrativeState, setNarrativeState] = useState({ variables: {}, currentNode: null, graph: null, events: [] })
  const [versions, setVersions] = useState([])
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [gameStatus, setGameStatus] = useState('loading') // loading | ready | unavailable
  const [focused, setFocused] = useState(false)
  const [claudeMd, setClaudeMd] = useState(null)
  const [showClaudeMd, setShowClaudeMd] = useState(false)
  const [changelogPopup, setChangelogPopup] = useState(null) // { version, text } | null
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
      .then(repo => setGame({ slug: repo.name, title: repo.name, description: repo.description || '', topics: repo.topics || [] }))
      .catch(() => setGame({ slug, title: slug, description: '', topics: [] }))

    fetch(`https://raw.githubusercontent.com/${GITHUB_ORG}/${slug}/main/.forkarcade.json`)
      .then(r => r.json())
      .then(config => setVersions(config.versions || []))
      .catch(() => setVersions([]))

    fetch(`https://raw.githubusercontent.com/${GITHUB_ORG}/${slug}/main/CLAUDE.md`)
      .then(r => r.ok ? r.text() : null)
      .then(text => setClaudeMd(text))
      .catch(() => setClaudeMd(null))
  }, [slug])

  useEffect(() => { loadLeaderboard() }, [loadLeaderboard])

  const iframeOrigin = `https://${GITHUB_ORG.toLowerCase()}.github.io`

  const iframeUrl = selectedVersion
    ? `${iframeOrigin}/${slug}/versions/v${selectedVersion}/`
    : `${iframeOrigin}/${slug}/`

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
    setFocused(false)
    fetch(iframeUrl, { method: 'HEAD', mode: 'no-cors' })
      .then(() => {
        // no-cors always resolves — rely on FA_READY timeout
      })
      .catch(() => setGameStatus('unavailable'))

    const timeout = setTimeout(() => {
      setGameStatus(prev => prev === 'loading' ? 'unavailable' : prev)
    }, 8000)

    return () => clearTimeout(timeout)
  }, [iframeUrl])

  useEffect(() => {
    function handleMessage(event) {
      const { data } = event
      if (!data || !data.type) return
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return

      switch (data.type) {
        case 'FA_READY':
          setGameStatus('ready')
          iframeRef.current?.contentWindow.postMessage({ type: 'FA_INIT', slug, version: currentVersion }, iframeOrigin)
          break
        case 'FA_SUBMIT_SCORE':
          apiFetch(`/api/games/${slug}/score`, {
            method: 'POST',
            body: JSON.stringify({ score: data.score, version: data.version || currentVersion }),
          }).then(result => {
            iframeRef.current?.contentWindow.postMessage({ type: 'FA_SCORE_RESULT', ok: result.ok, requestId: data.requestId }, iframeOrigin)
            if (result.coins > 0) {
              iframeRef.current?.contentWindow.postMessage({ type: 'FA_COIN_EARNED', coins: result.coins, isPersonalRecord: result.isPersonalRecord }, iframeOrigin)
              onBalanceChange(prev => (prev ?? 0) + result.coins)
            }
            loadLeaderboard()
          }).catch(() => {
            iframeRef.current?.contentWindow.postMessage({ type: 'FA_SCORE_RESULT', error: 'submit_failed', requestId: data.requestId }, iframeOrigin)
          })
          break
        case 'FA_GET_PLAYER':
          iframeRef.current?.contentWindow.postMessage(
            user
              ? { type: 'FA_PLAYER_INFO', login: user.login, sub: user.sub, requestId: data.requestId }
              : { type: 'FA_PLAYER_INFO', error: 'not_logged_in', requestId: data.requestId },
            iframeOrigin
          )
          break
        case 'FA_NARRATIVE_UPDATE':
          setNarrativeState(prev => ({
            variables: data.variables || prev.variables,
            currentNode: data.currentNode || prev.currentNode,
            graph: data.graph || prev.graph,
            events: data.event ? [...prev.events, data.event].slice(-20) : prev.events,
          }))
          break
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [slug, user, loadLeaderboard, currentVersion])

  if (!game) return <EmptyState>Loading...</EmptyState>

  const tabKeys = ['info', 'leaderboard', 'narrative', 'evolve']
  if (versions.length > 0) tabKeys.push('changelog')

  const iconTabs = tabKeys.map(k => ({ key: k, ...TAB_ICONS[k] }))

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
          <div
            onClick={() => {
              setFocused(true)
              iframeRef.current?.focus()
            }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle, rgba(0,0,0,0.4) 0%, rgba(0,0,0,1) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 1,
            }}
          >
            <span style={{
              fontSize: T.fontSize.sm,
              color: T.textBright,
              letterSpacing: T.tracking.wider,
              textTransform: 'uppercase',
              padding: `${T.sp[4]}px ${T.sp[6]}px`,
              border: `1px solid ${T.border}`,
              borderRadius: T.radius.md,
              background: T.surface,
            }}>
              Click to focus
            </span>
          </div>
        )}
        {gameStatus !== 'ready' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: T.bg,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: T.sp[5],
          }}>
            <img src="/logo.svg" alt="" width={48} height={48} style={{ opacity: gameStatus === 'loading' ? 0.3 : 0.15 }} />
            {gameStatus === 'loading' ? (
              <>
                <Loader size={16} color={T.muted} style={{ animation: 'spin 1.5s linear infinite' }} />
                <span style={{ fontSize: T.fontSize.xs, color: T.muted, letterSpacing: T.tracking.wider, textTransform: 'uppercase' }}>
                  Loading game
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={16} color={T.muted} />
                <span style={{ fontSize: T.fontSize.xs, color: T.muted, letterSpacing: T.tracking.wider, textTransform: 'uppercase' }}>
                  Game unavailable
                </span>
                <span style={{ fontSize: T.fontSize.xs, color: T.border, maxWidth: 240, textAlign: 'center', lineHeight: T.leading.relaxed }}>
                  GitHub Pages not deployed yet or currently rebuilding
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <Panel style={{ width: 260, minWidth: 260, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: `${T.sp[3]}px ${T.sp[4]}px`,
          borderBottom: `1px solid ${T.border}`,
          minHeight: 36,
        }}>
          <span style={{
            fontSize: T.fontSize.xs,
            fontWeight: T.weight.medium,
            color: T.muted,
            textTransform: 'uppercase',
            letterSpacing: T.tracking.widest,
          }}>
            {slug}
          </span>
        </div>
        {versions.length > 0 && (
          <div style={{ padding: `${T.sp[3]}px ${T.sp[4]}px`, borderBottom: `1px solid ${T.border}` }}>
            <SegmentedControl
              items={[
                { value: null, label: 'Latest' },
                ...versions.map(v => ({ value: v.version, label: `v${v.version}`, title: v.description })),
              ]}
              active={selectedVersion}
              onChange={setSelectedVersion}
            />
          </div>
        )}
        <IconTabBar tabs={iconTabs} active={tab} onChange={setTab} />
        <div style={{
          padding: `${T.sp[3]}px ${T.sp[5]}px`,
          borderBottom: `1px solid ${T.border}`,
          fontSize: T.fontSize.xs,
          fontWeight: T.weight.medium,
          color: T.muted,
          textTransform: 'uppercase',
          letterSpacing: T.tracking.widest,
        }}>
          {TAB_ICONS[tab]?.label}
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: T.sp[5] }}>
            {tab === 'info' && (
              <div>
                <div style={{ fontSize: T.fontSize.base, fontWeight: T.weight.semibold, color: T.textBright, marginBottom: T.sp[4] }}>
                  {game.title}
                </div>
                {game.description && (
                  <div style={{ fontSize: T.fontSize.xs, color: T.text, lineHeight: T.leading.relaxed, marginBottom: T.sp[5] }}>
                    {game.description}
                  </div>
                )}
                {game.topics.filter(t => t !== 'forkarcade-game').length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: T.sp[2], marginBottom: T.sp[5] }}>
                    {game.topics.filter(t => t !== 'forkarcade-game').map(t => <Badge key={t}>{t}</Badge>)}
                  </div>
                )}
                {claudeMd && (
                  <button
                    onClick={() => setShowClaudeMd(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: T.sp[3],
                      padding: `${T.sp[3]}px ${T.sp[4]}px`,
                      background: T.elevated,
                      border: `1px solid ${T.border}`,
                      borderRadius: T.radius.md,
                      color: T.text,
                      fontSize: T.fontSize.xs,
                      fontFamily: T.mono,
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    <FileText size={14} />
                    CLAUDE.md
                  </button>
                )}
              </div>
            )}
            {tab === 'leaderboard' && <Leaderboard rows={leaderboard} />}
            {tab === 'narrative' && <NarrativePanel narrativeState={narrativeState} />}
            {tab === 'evolve' && <EvolvePanel slug={slug} user={user} balance={balance} onBalanceChange={onBalanceChange} />}
            {tab === 'changelog' && (
              <div>
                {versions.slice().reverse().map(v => (
                  <div
                    key={v.version}
                    onClick={() => {
                      fetch(`https://raw.githubusercontent.com/${GITHUB_ORG}/${slug}/main/changelog/v${v.version}.md`)
                        .then(r => r.ok ? r.text() : null)
                        .then(text => { if (text) setChangelogPopup({ version: v.version, text }) })
                        .catch(() => {})
                    }}
                    style={{
                      marginBottom: T.sp[5],
                      borderLeft: `2px solid ${T.border}`,
                      paddingLeft: T.sp[4],
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: T.sp[3] }}>
                      <span style={{ color: T.accentColor, fontFamily: T.mono, fontSize: T.fontSize.xs }}>v{v.version}</span>
                      <span style={{ color: T.muted, fontSize: T.fontSize.xs }}>{v.date}</span>
                      {v.issue && (
                        <span style={{ fontSize: T.fontSize.xs, color: T.muted }}>#{v.issue}</span>
                      )}
                    </div>
                    <div style={{
                      fontSize: T.fontSize.xs,
                      color: T.text,
                      marginTop: T.sp[1],
                      lineHeight: T.leading.normal,
                    }}>
                      {v.description}
                    </div>
                  </div>
                ))}
                {versions.length === 0 && <EmptyState>No versions yet</EmptyState>}
              </div>
            )}
          </div>
        </Panel>

      {showClaudeMd && claudeMd && (
        <MdPopup title="CLAUDE.md" text={claudeMd} onClose={() => setShowClaudeMd(false)} />
      )}
      {changelogPopup && (
        <MdPopup title={`Changelog v${changelogPopup.version}`} text={changelogPopup.text} onClose={() => setChangelogPopup(null)} />
      )}
    </div>
  )
}
