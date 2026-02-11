import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { apiFetch } from '../api'
import Leaderboard from '../components/Leaderboard'
import NarrativePanel from '../components/NarrativePanel'

const GITHUB_ORG = 'ForkArcade'

export default function GamePage({ user }) {
  const { slug } = useParams()
  const [game, setGame] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [tab, setTab] = useState('leaderboard')
  const [narrativeState, setNarrativeState] = useState({ variables: {}, currentNode: null, graph: null, events: [] })
  const iframeRef = useRef(null)

  const loadLeaderboard = useCallback(() => {
    apiFetch(`/api/games/${slug}/leaderboard`).then(setLeaderboard)
  }, [slug])

  useEffect(() => {
    fetch(`https://api.github.com/repos/${GITHUB_ORG}/${slug}`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then(r => r.json())
      .then(repo => {
        setGame({
          slug: repo.name,
          title: repo.description || repo.name,
          topics: repo.topics || [],
          github_pages_url: `https://${GITHUB_ORG.toLowerCase()}.github.io/${repo.name}/`,
        })
      })
    loadLeaderboard()
  }, [slug, loadLeaderboard])

  useEffect(() => {
    function handleMessage(event) {
      const { data } = event
      if (!data || !data.type) return
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return

      switch (data.type) {
        case 'FA_READY':
          iframeRef.current?.contentWindow.postMessage({ type: 'FA_INIT', slug }, '*')
          break

        case 'FA_SUBMIT_SCORE':
          apiFetch(`/api/games/${slug}/score`, {
            method: 'POST',
            body: JSON.stringify({ score: data.score }),
          }).then(result => {
            iframeRef.current?.contentWindow.postMessage(
              { type: 'FA_SCORE_RESULT', ok: result.ok, requestId: data.requestId },
              '*'
            )
            loadLeaderboard()
          }).catch(() => {
            iframeRef.current?.contentWindow.postMessage(
              { type: 'FA_SCORE_RESULT', error: 'submit_failed', requestId: data.requestId },
              '*'
            )
          })
          break

        case 'FA_GET_PLAYER':
          if (user) {
            iframeRef.current?.contentWindow.postMessage(
              { type: 'FA_PLAYER_INFO', login: user.login, sub: user.sub, requestId: data.requestId },
              '*'
            )
          } else {
            iframeRef.current?.contentWindow.postMessage(
              { type: 'FA_PLAYER_INFO', error: 'not_logged_in', requestId: data.requestId },
              '*'
            )
          }
          break

        case 'FA_NARRATIVE_UPDATE':
          setNarrativeState(prev => ({
            variables: data.variables || prev.variables,
            currentNode: data.currentNode || prev.currentNode,
            graph: data.graph || prev.graph,
            events: data.event
              ? [...prev.events, data.event].slice(-20)
              : prev.events,
          }))
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [slug, user, loadLeaderboard])

  if (!game) return <div>Loading...</div>

  return (
    <div>
      <h2>{game.title}</h2>
      {game.topics.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {game.topics.map(t => (
            <span key={t} style={{ background: '#eee', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}>{t}</span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 20 }}>
        <iframe
          ref={iframeRef}
          src={game.github_pages_url}
          sandbox="allow-scripts allow-same-origin"
          style={{ width: '100%', maxWidth: 800, height: 600, border: '1px solid #ccc' }}
          title={game.title}
        />
        <div>
          <div style={{ display: 'flex', gap: 0, marginBottom: 12 }}>
            {['leaderboard', 'narrative'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '6px 16px',
                  background: tab === t ? '#333' : 'transparent',
                  color: tab === t ? '#fff' : '#888',
                  border: '1px solid #444',
                  borderBottom: tab === t ? '1px solid #333' : '1px solid #444',
                  cursor: 'pointer',
                  fontSize: 13,
                  textTransform: 'capitalize',
                }}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === 'leaderboard' && <Leaderboard rows={leaderboard} />}
          {tab === 'narrative' && <NarrativePanel narrativeState={narrativeState} />}
        </div>
      </div>
    </div>
  )
}
