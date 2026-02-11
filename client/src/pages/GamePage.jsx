import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { apiFetch, GITHUB_ORG, githubFetch } from '../api'
import { T } from '../theme'
import { Panel, TabBar, Badge, StatusBar } from '../components/ui'
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

  const iframeUrl = selectedVersion
    ? `https://${GITHUB_ORG.toLowerCase()}.github.io/${slug}/versions/v${selectedVersion}/`
    : `https://${GITHUB_ORG.toLowerCase()}.github.io/${slug}/`

  useEffect(() => {
    function handleMessage(event) {
      const { data } = event
      if (!data || !data.type) return
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return

      switch (data.type) {
        case 'FA_READY':
          iframeRef.current?.contentWindow.postMessage({ type: 'FA_INIT', slug, version: currentVersion }, '*')
          break
        case 'FA_SUBMIT_SCORE':
          apiFetch(`/api/games/${slug}/score`, {
            method: 'POST',
            body: JSON.stringify({ score: data.score, version: data.version || currentVersion }),
          }).then(result => {
            iframeRef.current?.contentWindow.postMessage({ type: 'FA_SCORE_RESULT', ok: result.ok, requestId: data.requestId }, '*')
            loadLeaderboard()
          }).catch(() => {
            iframeRef.current?.contentWindow.postMessage({ type: 'FA_SCORE_RESULT', error: 'submit_failed', requestId: data.requestId }, '*')
          })
          break
        case 'FA_GET_PLAYER':
          iframeRef.current?.contentWindow.postMessage(
            user
              ? { type: 'FA_PLAYER_INFO', login: user.login, sub: user.sub, requestId: data.requestId }
              : { type: 'FA_PLAYER_INFO', error: 'not_logged_in', requestId: data.requestId },
            '*'
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

  if (!game) return <div style={{ color: T.textDim, padding: 20 }}>Loading...</div>

  const tabs = ['leaderboard', 'narrative']
  if (versions.length > 0) tabs.push('changelog')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 76px)' }}>
      {/* Toolbar: title + version pills + topics */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', marginBottom: 4 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: T.textBright }}>{game.title}</span>
        {game.topics.filter(t => t !== 'forkarcade-game').map(t => <Badge key={t}>{t}</Badge>)}
        {versions.length > 0 && (
          <div style={{ display: 'flex', gap: 3, marginLeft: 'auto' }}>
            <button
              onClick={() => setSelectedVersion(null)}
              style={{
                padding: '3px 10px', fontSize: 11, cursor: 'pointer', borderRadius: 3,
                fontFamily: T.mono, border: 'none',
                background: selectedVersion === null ? T.accent : T.elevated,
                color: selectedVersion === null ? '#000' : T.textDim,
              }}
            >
              Latest
            </button>
            {versions.map(v => (
              <button
                key={v.version}
                onClick={() => setSelectedVersion(v.version)}
                title={v.description}
                style={{
                  padding: '3px 8px', fontSize: 11, cursor: 'pointer', borderRadius: 3,
                  fontFamily: T.mono, border: 'none',
                  background: selectedVersion === v.version ? T.accent : T.elevated,
                  color: selectedVersion === v.version ? '#000' : T.textDim,
                }}
              >
                v{v.version}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main: viewer + side panel */}
      <div style={{ display: 'flex', flex: 1, gap: 1, overflow: 'hidden' }}>
        {/* Viewer */}
        <div style={{ flex: 1, background: '#000', border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: 'hidden' }}>
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            sandbox="allow-scripts allow-same-origin"
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            title={game.title}
          />
        </div>

        {/* Side panel */}
        <Panel style={{ width: 280, minWidth: 280, display: 'flex', flexDirection: 'column', marginLeft: 4 }}>
          <TabBar tabs={tabs} active={tab} onChange={setTab} />
          <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
            {tab === 'leaderboard' && <Leaderboard rows={leaderboard} />}
            {tab === 'narrative' && <NarrativePanel narrativeState={narrativeState} />}
            {tab === 'changelog' && (
              <div>
                {versions.slice().reverse().map(v => (
                  <div key={v.version} style={{ marginBottom: 12, borderLeft: `2px solid ${T.borderLight}`, paddingLeft: 10 }}>
                    <div>
                      <span style={{ color: T.accent, fontFamily: T.mono, fontSize: 12 }}>v{v.version}</span>
                      <span style={{ color: T.textDim, fontSize: 11, marginLeft: 8 }}>{v.date}</span>
                    </div>
                    <div style={{ fontSize: 13, color: T.text, marginTop: 2 }}>{v.description}</div>
                    {v.issue && (
                      <a
                        href={`https://github.com/${GITHUB_ORG}/${slug}/issues/${v.issue}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 11, color: T.accent, textDecoration: 'none' }}
                      >
                        #{v.issue}
                      </a>
                    )}
                  </div>
                ))}
                {versions.length === 0 && <span style={{ color: T.textDim, fontSize: 12 }}>No versions yet</span>}
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Status bar */}
      <StatusBar>
        <span>{slug}</span>
        <span style={{ color: T.borderLight }}>|</span>
        <span>{currentVersion ? `v${currentVersion}` : 'no versions'}</span>
      </StatusBar>
    </div>
  )
}
