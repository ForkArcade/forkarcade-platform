import { useState, useEffect } from 'react'
import { apiFetch, API } from '../api'
import { T } from '../theme'
import { Badge, EmptyState } from './ui'
import { MdPopup } from './MdPopup'

const inputStyle = {
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
}

export default function VotingPanel({
  user, balance, onBalanceChange, refreshKey,
  fetchIssues, votesUrl, voteUrl, submitUrl,
  triggerUrl, triggerLabel,
  prefix, loginText, proposeText, emptyText,
  titlePlaceholder, bodyPlaceholder,
  hiddenLabels, doneLabel, doneBadge,
  isReady, issueMeta, voterDisplay,
  defaultExtra, renderFormExtra, buildPayload,
}) {
  const [issues, setIssues] = useState([])
  const [votes, setVotes] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [extra, setExtra] = useState(defaultExtra || {})
  const [viewIssue, setViewIssue] = useState(null)

  async function loadVotes() {
    try {
      const data = await apiFetch(votesUrl)
      const map = {}
      for (const v of (Array.isArray(data) ? data : [])) map[v.issue_number] = v
      setVotes(map)
    } catch {}
  }

  async function loadData() {
    try {
      const [items] = await Promise.all([fetchIssues(), loadVotes()])
      if (Array.isArray(items)) setIssues(items)
    } catch {}
  }

  useEffect(() => {
    loadData()
    const id = setInterval(loadVotes, 30_000)
    const onVisible = () => !document.hidden && loadVotes()
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [refreshKey])

  const sorted = [...issues].sort((a, b) =>
    (votes[b.number]?.total_votes ?? 0) - (votes[a.number]?.total_votes ?? 0)
  )

  async function handleVote(issueNumber) {
    // Optimistic update
    const prevBalance = balance
    const prevVotes = { ...votes }
    const prev = votes[issueNumber] || { total_votes: 0, unique_voters: 0, voter_ids: [] }
    setVotes(v => ({ ...v, [issueNumber]: { ...prev, total_votes: prev.total_votes + 10, unique_voters: prev.unique_voters + 1 } }))
    onBalanceChange(prevBalance - 10)
    try {
      const r = await apiFetch(voteUrl, { method: 'POST', body: JSON.stringify({ issue_number: issueNumber, coins: 10 }) })
      if (r.ok) { onBalanceChange(r.newBalance); loadVotes() }
      else { setVotes(prevVotes); onBalanceChange(prevBalance) }
    } catch { setVotes(prevVotes); onBalanceChange(prevBalance) }
  }

  async function handleTrigger(issueNumber) {
    try {
      const r = await apiFetch(triggerUrl, { method: 'POST', body: JSON.stringify({ issue_number: issueNumber }) })
      if (r.ok) loadData()
    } catch {}
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    // Optimistic update — add placeholder issue, clear form
    const tempId = `temp-${Date.now()}`
    const optimisticIssue = { number: tempId, title: `${prefix} ${title.trim()}`, body, labels: [], user: user }
    setIssues(prev => [optimisticIssue, ...prev])
    const savedTitle = title.trim(), savedBody = body, savedExtra = { ...extra }
    setTitle(''); setBody(''); setExtra(defaultExtra || {}); setShowForm(false)
    try {
      const r = await apiFetch(submitUrl, { method: 'POST', body: JSON.stringify(buildPayload(savedTitle, savedBody, savedExtra)) })
      if (r.ok) { loadData() }
      else { setIssues(prev => prev.filter(i => i.number !== tempId)); setTitle(savedTitle); setBody(savedBody); setExtra(savedExtra); setShowForm(true) }
    } catch { setIssues(prev => prev.filter(i => i.number !== tempId)); setTitle(savedTitle); setBody(savedBody); setExtra(savedExtra); setShowForm(true) }
  }

  const strip = (t) => t.startsWith(prefix) ? t.slice(prefix.length).trimStart() : t

  const voteBtn = {
    padding: `${T.sp[2]}px ${T.sp[4]}px`,
    borderRadius: T.radius.sm,
    fontSize: T.fontSize.xs,
    fontFamily: T.mono,
    fontWeight: T.weight.medium,
  }

  return (
    <div>
      {!user && (
        <div style={{ padding: T.sp[5], marginBottom: T.sp[5], background: T.elevated, border: `1px solid ${T.border}`, borderRadius: T.radius.md, textAlign: 'center' }}>
          <div style={{ fontSize: T.fontSize.xs, color: T.text, lineHeight: T.leading.relaxed, marginBottom: T.sp[4] }}>{loginText}</div>
          <button onClick={() => { window.location.href = `${API}/auth/github` }} style={{ padding: `${T.sp[3]}px ${T.sp[5]}px`, background: T.accentColor, border: 'none', borderRadius: T.radius.md, color: '#000', fontSize: T.fontSize.xs, fontWeight: T.weight.bold, fontFamily: T.font, cursor: 'pointer' }}>
            Login with GitHub
          </button>
        </div>
      )}

      {user && (
        <div style={{ marginBottom: T.sp[5] }}>
          <button onClick={() => setShowForm(!showForm)} style={{ width: '100%', padding: `${T.sp[3]}px ${T.sp[4]}px`, background: showForm ? T.elevated : 'transparent', border: `1px solid ${T.border}`, borderRadius: T.radius.md, color: T.accentColor, fontSize: T.fontSize.xs, fontFamily: T.font, cursor: 'pointer', textAlign: 'left' }}>
            {showForm ? 'Cancel' : proposeText}
          </button>
          {showForm && (
            <form onSubmit={handleSubmit} style={{ marginTop: T.sp[3] }}>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder={titlePlaceholder} style={inputStyle} />
              <textarea value={body} onChange={e => setBody(e.target.value)} placeholder={bodyPlaceholder} rows={3} style={{ ...inputStyle, marginTop: T.sp[2], resize: 'vertical' }} />
              {renderFormExtra && renderFormExtra(extra, setExtra, inputStyle)}
              <button type="submit" disabled={!title.trim()} style={{ marginTop: T.sp[3], width: '100%', padding: `${T.sp[3]}px`, background: T.accentColor, border: 'none', borderRadius: T.radius.md, color: '#000', fontSize: T.fontSize.xs, fontWeight: T.weight.bold, fontFamily: T.font, cursor: 'pointer', opacity: !title.trim() ? 0.5 : 1 }}>
                Submit
              </button>
            </form>
          )}
        </div>
      )}

      {sorted.length === 0 && <EmptyState>{emptyText}</EmptyState>}

      {sorted.map(issue => {
        const v = votes[issue.number]
        const ready = isReady(issue, v)
        const done = issue.labels?.some(l => l.name === doneLabel)
        return (
          <div key={issue.number} onClick={() => setViewIssue(issue)} style={{ padding: `${T.sp[3]}px 0`, borderBottom: `1px solid ${T.border}`, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: T.sp[3] }}>
              <span style={{ fontFamily: T.mono, fontSize: T.fontSize.sm, fontWeight: T.weight.bold, color: T.gold, minWidth: 24, textAlign: 'right' }}>{v?.total_votes ?? 0}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: T.fontSize.xs, color: T.textBright, lineHeight: T.leading.relaxed }}>{strip(issue.title)}</div>
                <div style={{ display: 'flex', gap: T.sp[2], marginTop: T.sp[2], alignItems: 'center', flexWrap: 'wrap' }}>
                  {issue.labels?.filter(l => !hiddenLabels.includes(l.name)).map(l => <Badge key={l.name}>{l.name}</Badge>)}
                  <span style={{ fontSize: T.fontSize.xs, color: T.muted, fontFamily: T.mono }}>{issueMeta(issue, v?.unique_voters ?? 0)}</span>
                  {ready && !done && <Badge color={T.success}>ready</Badge>}
                  {done && <Badge color={T.gold}>{doneBadge}</Badge>}
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {viewIssue && (() => {
        const v = votes[viewIssue.number]
        const ready = isReady(viewIssue, v)
        const canVote = user && balance >= 10
        const done = viewIssue.labels?.some(l => l.name === doneLabel)
        return (
          <MdPopup
            title={strip(viewIssue.title)}
            text={viewIssue.body || 'No description.'}
            onClose={() => setViewIssue(null)}
            footer={
              <div style={{ display: 'flex', alignItems: 'center', gap: T.sp[4] }}>
                <span style={{ fontFamily: T.mono, fontSize: T.fontSize.sm, fontWeight: T.weight.bold, color: T.gold }}>{v?.total_votes ?? 0} votes</span>
                <span style={{ fontSize: T.fontSize.xs, color: T.muted }}>{voterDisplay(v?.unique_voters ?? 0)}</span>
                <div style={{ flex: 1 }} />
                {!done && (
                  <button onClick={() => handleVote(viewIssue.number)} disabled={!canVote}
                    style={{ ...voteBtn, background: canVote ? T.gold + '20' : 'transparent', border: `1px solid ${canVote ? T.gold : T.border}`, color: canVote ? T.gold : T.muted, cursor: canVote ? 'pointer' : 'default', opacity: !canVote ? 0.5 : 1 }}>
                    Vote 10c
                  </button>
                )}
                {triggerUrl && ready && !done && user && (
                  <button onClick={() => handleTrigger(viewIssue.number)}
                    style={{ ...voteBtn, background: T.success + '20', border: `1px solid ${T.success}`, color: T.success, cursor: 'pointer' }}>
                    {triggerLabel || 'Evolve'}
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
