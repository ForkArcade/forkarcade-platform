import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { apiFetch, GITHUB_ORG, githubFetch } from '../api'
import { T } from '../theme'
import { Panel, IconTabBar, Badge, SegmentedControl, EmptyState } from '../components/ui'
import Leaderboard from '../components/Leaderboard'
import NarrativePanel from '../components/NarrativePanel'
import { Trophy, BookOpen, Clock, Info, Loader, AlertCircle, FileText, X } from 'lucide-react'

const TAB_ICONS = {
  info: { label: 'Info', icon: Info },
  leaderboard: { label: 'Leaderboard', icon: Trophy },
  narrative: { label: 'Narrative', icon: BookOpen },
  changelog: { label: 'Changelog', icon: Clock },
}

export default function GamePage({ user }) {
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

  const tabKeys = ['info', 'leaderboard', 'narrative']
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
            {tab === 'changelog' && (
              <div>
                {versions.slice().reverse().map(v => (
                  <div key={v.version} style={{
                    marginBottom: T.sp[5],
                    borderLeft: `2px solid ${T.border}`,
                    paddingLeft: T.sp[4],
                  }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: T.sp[3] }}>
                      <span style={{ color: T.accentColor, fontFamily: T.mono, fontSize: T.fontSize.xs }}>v{v.version}</span>
                      <span style={{ color: T.muted, fontSize: T.fontSize.xs }}>{v.date}</span>
                      {v.issue && (
                        <a
                          href={`https://github.com/${GITHUB_ORG}/${slug}/issues/${v.issue}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: T.fontSize.xs, color: T.muted, textDecoration: 'none' }}
                        >
                          #{v.issue}
                        </a>
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
        <div
          onClick={() => setShowClaudeMd(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: T.radius.lg,
              width: '90%',
              maxWidth: 640,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `${T.sp[4]}px ${T.sp[5]}px`,
              borderBottom: `1px solid ${T.border}`,
            }}>
              <span style={{ fontSize: T.fontSize.sm, fontFamily: T.mono, color: T.textBright, fontWeight: T.weight.medium }}>
                CLAUDE.md
              </span>
              <button
                onClick={() => setShowClaudeMd(false)}
                style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: T.sp[1] }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ overflow: 'auto', padding: T.sp[5] }}>
              <SimpleMd text={claudeMd} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SimpleMd({ text }) {
  const lines = text.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      elements.push(
        <pre key={elements.length} style={{
          background: T.bg,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius.md,
          padding: T.sp[4],
          margin: `${T.sp[3]}px 0`,
          fontSize: T.fontSize.xs,
          fontFamily: T.mono,
          color: T.text,
          overflow: 'auto',
          lineHeight: T.leading.relaxed,
        }}>
          {codeLines.join('\n')}
        </pre>
      )
      continue
    }

    // Table (pipe-based)
    if (line.includes('|') && line.trim().startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim().startsWith('|')) {
        const cells = lines[i].split('|').slice(1, -1).map(c => c.trim())
        if (!cells.every(c => /^[-:]+$/.test(c))) rows.push(cells)
        i++
      }
      if (rows.length > 0) {
        const header = rows[0]
        const body = rows.slice(1)
        elements.push(
          <div key={elements.length} style={{ overflow: 'auto', margin: `${T.sp[3]}px 0` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: T.fontSize.xs, fontFamily: T.mono }}>
              <thead>
                <tr>
                  {header.map((h, j) => (
                    <th key={j} style={{ textAlign: 'left', padding: `${T.sp[2]}px ${T.sp[3]}px`, borderBottom: `1px solid ${T.border}`, color: T.textBright, fontWeight: T.weight.medium }}>{inline(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ padding: `${T.sp[2]}px ${T.sp[3]}px`, borderBottom: `1px solid ${T.border}`, color: T.text }}>{inline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(<h4 key={elements.length} style={{ color: T.textBright, fontSize: T.fontSize.sm, fontWeight: T.weight.semibold, margin: `${T.sp[5]}px 0 ${T.sp[2]}px` }}>{inline(line.slice(4))}</h4>)
      i++; continue
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 key={elements.length} style={{ color: T.textBright, fontSize: T.fontSize.base, fontWeight: T.weight.semibold, margin: `${T.sp[5]}px 0 ${T.sp[2]}px` }}>{inline(line.slice(3))}</h3>)
      i++; continue
    }
    if (line.startsWith('# ')) {
      elements.push(<h2 key={elements.length} style={{ color: T.textBright, fontSize: T.fontSize.md, fontWeight: T.weight.bold, margin: `${T.sp[5]}px 0 ${T.sp[3]}px` }}>{inline(line.slice(2))}</h2>)
      i++; continue
    }

    // List item
    if (/^[-*] /.test(line)) {
      elements.push(
        <div key={elements.length} style={{ display: 'flex', gap: T.sp[3], margin: `${T.sp[1]}px 0`, fontSize: T.fontSize.xs, color: T.text, lineHeight: T.leading.relaxed }}>
          <span style={{ color: T.muted }}>-</span>
          <span>{inline(line.slice(2))}</span>
        </div>
      )
      i++; continue
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={elements.length} style={{ height: T.sp[3] }} />)
      i++; continue
    }

    // Paragraph
    elements.push(<p key={elements.length} style={{ fontSize: T.fontSize.xs, color: T.text, lineHeight: T.leading.relaxed, margin: `${T.sp[2]}px 0` }}>{inline(line)}</p>)
    i++
  }

  return <>{elements}</>
}

function inline(text) {
  const parts = []
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[1]) {
      parts.push(<code key={parts.length} style={{ background: T.bg, padding: '1px 4px', borderRadius: 3, fontFamily: T.mono, fontSize: T.fontSize.xs, color: T.accentColor }}>{m[1].slice(1, -1)}</code>)
    } else if (m[2]) {
      parts.push(<strong key={parts.length} style={{ color: T.textBright, fontWeight: T.weight.semibold }}>{m[2].slice(2, -2)}</strong>)
    }
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts
}
