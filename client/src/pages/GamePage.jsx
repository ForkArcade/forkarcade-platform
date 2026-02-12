import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { apiFetch, GITHUB_ORG, githubFetch } from '../api'
import { T } from '../theme'
import { Panel, TabBar, Badge, StatusBar, Button, SectionHeading, EmptyState } from '../components/ui'
import Leaderboard from '../components/Leaderboard'
import NarrativePanel from '../components/NarrativePanel'

export default function GamePage({ user }) {
  const { slug } = useParams()
  const [game, setGame] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [tab, setTab] = useState('leaderboard')
  const [narrativeState, setNarrativeState] = useState({ variables: {}, currentNode: null, graph: null, events: [] })
  const [versions, setVersions] = useState([])
  const [selectedVersion, setSelectedVersion] = useState(null)
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
      .then(repo => setGame({ slug: repo.name, title: repo.description || repo.name, topics: repo.topics || [] }))
      .catch(() => setGame({ slug, title: slug, topics: [] }))

    fetch(`https://raw.githubusercontent.com/${GITHUB_ORG}/${slug}/main/.forkarcade.json`)
      .then(r => r.json())
      .then(config => setVersions(config.versions || []))
      .catch(() => setVersions([]))
  }, [slug])

  useEffect(() => { loadLeaderboard() }, [loadLeaderboard])

  const iframeOrigin = `https://${GITHUB_ORG.toLowerCase()}.github.io`

  const iframeUrl = selectedVersion
    ? `${iframeOrigin}/${slug}/versions/v${selectedVersion}/`
    : `${iframeOrigin}/${slug}/`

  useEffect(() => {
    function handleMessage(event) {
      const { data } = event
      if (!data || !data.type) return
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return

      switch (data.type) {
        case 'FA_READY':
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

  const tabs = ['leaderboard', 'narrative']
  if (versions.length > 0) tabs.push('changelog')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: T.sp(3), padding: `${T.sp(2)}px 0`, marginBottom: T.sp(1) }}>
        <span style={{ fontSize: T.fontSize.md, fontWeight: 700, color: T.textBright }}>{game.title}</span>
        {game.topics.filter(t => t !== 'forkarcade-game').map(t => <Badge key={t}>{t}</Badge>)}
        {versions.length > 0 && (
          <div style={{ display: 'flex', gap: T.sp(1), marginLeft: 'auto' }}>
            <Button active={selectedVersion === null} onClick={() => setSelectedVersion(null)} style={{ fontFamily: T.mono }}>
              Latest
            </Button>
            {versions.map(v => (
              <Button
                key={v.version}
                active={selectedVersion === v.version}
                onClick={() => setSelectedVersion(v.version)}
                title={v.description}
                style={{ fontFamily: T.mono }}
              >
                v{v.version}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, gap: T.sp(1), overflow: 'hidden' }}>
        <div style={{ flex: 1, background: '#000', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            sandbox="allow-scripts allow-same-origin"
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            title={game.title}
          />
        </div>

        <Panel style={{ width: 280, minWidth: 280, display: 'flex', flexDirection: 'column' }}>
          <TabBar tabs={tabs} active={tab} onChange={setTab} />
          <div style={{ flex: 1, overflow: 'auto', padding: T.sp(3) }}>
            {tab === 'leaderboard' && <Leaderboard rows={leaderboard} />}
            {tab === 'narrative' && <NarrativePanel narrativeState={narrativeState} />}
            {tab === 'changelog' && (
              <div>
                {versions.slice().reverse().map(v => (
                  <div key={v.version} style={{ marginBottom: T.sp(3), borderLeft: `2px solid ${T.border}`, paddingLeft: T.sp(3) }}>
                    <div>
                      <span style={{ color: T.accentColor, fontFamily: T.mono, fontSize: T.fontSize.sm }}>v{v.version}</span>
                      <span style={{ color: T.text, fontSize: T.fontSize.xs, marginLeft: T.sp(2) }}>{v.date}</span>
                    </div>
                    <div style={{ fontSize: T.fontSize.sm, color: T.text, marginTop: T.sp(0.5) }}>{v.description}</div>
                    {v.issue && (
                      <a
                        href={`https://github.com/${GITHUB_ORG}/${slug}/issues/${v.issue}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: T.fontSize.xs, color: T.accentColor, textDecoration: 'none' }}
                      >
                        #{v.issue}
                      </a>
                    )}
                  </div>
                ))}
                {versions.length === 0 && <EmptyState>No versions yet</EmptyState>}
              </div>
            )}
          </div>
        </Panel>
      </div>

      <StatusBar>
        <span>{slug}</span>
        <span style={{ color: T.border }}>|</span>
        <span>{currentVersion ? `v${currentVersion}` : 'no versions'}</span>
      </StatusBar>
    </div>
  )
}
