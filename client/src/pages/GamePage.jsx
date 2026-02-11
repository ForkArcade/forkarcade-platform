import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { apiFetch } from '../api'
import Leaderboard from '../components/Leaderboard'

export default function GamePage({ user }) {
  const { slug } = useParams()
  const [game, setGame] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const iframeRef = useRef(null)

  const loadLeaderboard = useCallback(() => {
    apiFetch(`/api/games/${slug}/leaderboard`).then(setLeaderboard)
  }, [slug])

  useEffect(() => {
    apiFetch(`/api/games/${slug}`).then(setGame)
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
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [slug, user, loadLeaderboard])

  if (!game) return <div>Loading...</div>

  return (
    <div>
      <h2>{game.title}</h2>
      <p>{game.description}</p>
      <div style={{ display: 'flex', gap: 20 }}>
        <iframe
          ref={iframeRef}
          src={game.github_pages_url}
          sandbox="allow-scripts allow-same-origin"
          style={{ width: '100%', maxWidth: 800, height: 600, border: '1px solid #ccc' }}
          title={game.title}
        />
        <Leaderboard rows={leaderboard} />
      </div>
    </div>
  )
}
