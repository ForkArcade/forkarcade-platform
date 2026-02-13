import { useState, useEffect } from 'react'
import { apiFetch, githubFetch, API } from '../api'
import { T } from '../theme'
import { Badge, EmptyState } from './ui'
import { MdPopup } from './MdPopup'

const PLATFORM_REPO = 'ForkArcade/forkarcade-platform'

export default function NewGamePanel({ user, balance, onBalanceChange }) {
  const [issues, setIssues] = useState([])
  const [votes, setVotes] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [template, setTemplate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [votingIssue, setVotingIssue] = useState(null)
  const [viewIssue, setViewIssue] = useState(null)

  async function loadVotes() {
    try {
      const voteData = await apiFetch('/api/new-game/votes')
      const voteMap = {}
      for (const v of (Array.isArray(voteData) ? voteData : [])) {
        voteMap[v.issue_number] = v
      }
      setVotes(voteMap)
    } catch {}
  }

  async function loadData() {
    try {
      const [ghIssues] = await Promise.all([
        githubFetch(`/repos/${PLATFORM_REPO}/issues?state=open&labels=new-game&per_page=50`),
        loadVotes(),
      ])
      const newGameIssues = (Array.isArray(ghIssues) ? ghIssues : [])
        .filter(i => i.title.startsWith('[NEW-GAME]'))
      setIssues(newGameIssues)
    } catch {
      setIssues([])
    }
  }

  useEffect(() => { loadData() }, [])

  const sorted = [...issues].sort((a, b) => {
    const va = votes[a.number]?.total_votes ?? 0
    const vb = votes[b.number]?.total_votes ?? 0
    return vb - va
  })

  async function handleVote(issueNumber) {
    setVotingIssue(issueNumber)
    try {
      const result = await apiFetch('/api/new-game/vote', {
        method: 'POST',
        body: JSON.stringify({ issue_number: issueNumber, coins: 10 }),
      })
      if (result.ok) {
        onBalanceChange(result.newBalance)
        loadVotes()
      }
    } catch {}
    setVotingIssue(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    try {
      const result = await apiFetch('/api/new-game/issues', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), body, template: template || undefined }),
      })
      if (result.ok) {
        setTitle('')
        setBody('')
        setTemplate('')
        setShowForm(false)
        loadData()
      }
    } catch {}
    setSubmitting(false)
  }

  return (
    <div>
      {!user && (
        <div style={{
          padding: T.sp[5],
          marginBottom: T.sp[5],
          background: T.elevated,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius.md,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: T.fontSize.xs, color: T.text, lineHeight: T.leading.relaxed, marginBottom: T.sp[4] }}>
            Log in to propose and vote on new games.
          </div>
          <button
            onClick={() => { window.location.href = `${API}/auth/github` }}
            style={{
              padding: `${T.sp[3]}px ${T.sp[5]}px`,
              background: T.accentColor,
              border: 'none',
              borderRadius: T.radius.md,
              color: '#000',
              fontSize: T.fontSize.xs,
              fontWeight: T.weight.bold,
              fontFamily: T.font,
              cursor: 'pointer',
            }}
          >
            Login with GitHub
          </button>
        </div>
      )}
      {user && (
        <div style={{ marginBottom: T.sp[5] }}>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              width: '100%',
              padding: `${T.sp[3]}px ${T.sp[4]}px`,
              background: showForm ? T.elevated : 'transparent',
              border: `1px solid ${T.border}`,
              borderRadius: T.radius.md,
              color: T.accentColor,
              fontSize: T.fontSize.xs,
              fontFamily: T.font,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {showForm ? 'Cancel' : '+ Propose new game'}
          </button>
          {showForm && (
            <form onSubmit={handleSubmit} style={{ marginTop: T.sp[3] }}>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Game name or concept"
                style={{
                  width: '100%',
                  padding: `${T.sp[3]}px ${T.sp[4]}px`,
                  background: T.bg,
                  border: `1px solid ${T.border}`,
                  borderRadius: T.radius.md,
                  color: T.textBright,
                  fontSize: T.fontSize.xs,
                  fontFamily: T.font,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Describe the game — mechanics, mood, inspiration..."
                rows={4}
                style={{
                  width: '100%',
                  marginTop: T.sp[2],
                  padding: `${T.sp[3]}px ${T.sp[4]}px`,
                  background: T.bg,
                  border: `1px solid ${T.border}`,
                  borderRadius: T.radius.md,
                  color: T.textBright,
                  fontSize: T.fontSize.xs,
                  fontFamily: T.font,
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
              <input
                value={template}
                onChange={e => setTemplate(e.target.value)}
                placeholder="Template (optional, e.g. roguelike, space-combat)"
                style={{
                  width: '100%',
                  marginTop: T.sp[2],
                  padding: `${T.sp[3]}px ${T.sp[4]}px`,
                  background: T.bg,
                  border: `1px solid ${T.border}`,
                  borderRadius: T.radius.md,
                  color: T.textBright,
                  fontSize: T.fontSize.xs,
                  fontFamily: T.font,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                style={{
                  marginTop: T.sp[3],
                  width: '100%',
                  padding: `${T.sp[3]}px`,
                  background: T.accentColor,
                  border: 'none',
                  borderRadius: T.radius.md,
                  color: '#000',
                  fontSize: T.fontSize.xs,
                  fontWeight: T.weight.bold,
                  fontFamily: T.font,
                  cursor: submitting ? 'wait' : 'pointer',
                  opacity: !title.trim() ? 0.5 : 1,
                }}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </form>
          )}
        </div>
      )}

      {sorted.length === 0 && <EmptyState>No game proposals yet</EmptyState>}

      {sorted.map(issue => {
        const v = votes[issue.number]
        const totalVotes = v?.total_votes ?? 0
        const uniqueVoters = v?.unique_voters ?? 0
        const ready = uniqueVoters >= 10
        const hasApproved = issue.labels?.some(l => l.name === 'approved')
        const displayTitle = issue.title.replace(/^\[NEW-GAME\]\s*/, '')

        return (
          <div
            key={issue.number}
            onClick={() => setViewIssue(issue)}
            style={{
              padding: `${T.sp[3]}px 0`,
              borderBottom: `1px solid ${T.border}`,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: T.sp[3] }}>
              <span style={{
                fontFamily: T.mono,
                fontSize: T.fontSize.sm,
                fontWeight: T.weight.bold,
                color: T.gold,
                minWidth: 24,
                textAlign: 'right',
              }}>
                {totalVotes}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: T.fontSize.xs, color: T.textBright, lineHeight: T.leading.relaxed }}>
                  {displayTitle}
                </div>
                <div style={{ display: 'flex', gap: T.sp[2], marginTop: T.sp[2], alignItems: 'center', flexWrap: 'wrap' }}>
                  {issue.labels?.filter(l => l.name !== 'new-game' && l.name !== 'approved').map(l => (
                    <Badge key={l.name}>{l.name}</Badge>
                  ))}
                  <span style={{ fontSize: T.fontSize.xs, color: T.muted, fontFamily: T.mono }}>
                    {uniqueVoters}/10
                  </span>
                  {ready && !hasApproved && <Badge color={T.success}>ready</Badge>}
                  {hasApproved && <Badge color={T.gold}>approved</Badge>}
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {viewIssue && (() => {
        const v = votes[viewIssue.number]
        const totalVotes = v?.total_votes ?? 0
        const uniqueVoters = v?.unique_voters ?? 0
        const canVote = user && balance >= 10
        const hasApproved = viewIssue.labels?.some(l => l.name === 'approved')

        return (
          <MdPopup
            title={viewIssue.title.replace(/^\[NEW-GAME\]\s*/, '')}
            text={viewIssue.body || 'No description.'}
            onClose={() => setViewIssue(null)}
            footer={
              <div style={{ display: 'flex', alignItems: 'center', gap: T.sp[4] }}>
                <span style={{ fontFamily: T.mono, fontSize: T.fontSize.sm, fontWeight: T.weight.bold, color: T.gold }}>
                  {totalVotes} votes
                </span>
                <span style={{ fontSize: T.fontSize.xs, color: T.muted }}>
                  {uniqueVoters}/10 voters
                </span>
                <div style={{ flex: 1 }} />
                {!hasApproved && (
                  <button
                    onClick={() => handleVote(viewIssue.number)}
                    disabled={!canVote || votingIssue === viewIssue.number}
                    style={{
                      padding: `${T.sp[2]}px ${T.sp[4]}px`,
                      background: canVote ? T.gold + '20' : 'transparent',
                      border: `1px solid ${canVote ? T.gold : T.border}`,
                      borderRadius: T.radius.sm,
                      color: canVote ? T.gold : T.muted,
                      fontSize: T.fontSize.xs,
                      fontFamily: T.mono,
                      fontWeight: T.weight.medium,
                      cursor: canVote ? 'pointer' : 'default',
                      opacity: !canVote ? 0.5 : 1,
                    }}
                  >
                    {votingIssue === viewIssue.number ? '...' : 'Vote 10c'}
                  </button>
                )}
              </div>
            }
          />
        )
      })()}
    </div>
  )
}
