import { githubFetch, GITHUB_ORG } from '../api'
import { T } from '../theme'
import VotingPanel from './VotingPanel'

const CATEGORIES = ['feature', 'balance', 'visual', 'audio', 'bug', 'narrative']

export default function EvolvePanel({ slug, user, balance, onBalanceChange }) {
  return (
    <VotingPanel
      user={user} balance={balance} onBalanceChange={onBalanceChange}
      refreshKey={slug}
      fetchIssues={() =>
        githubFetch(`/repos/${GITHUB_ORG}/${slug}/issues?state=open&per_page=50`)
          .then(r => (Array.isArray(r) ? r : []).filter(i => i.title.startsWith('[EVOLVE]')))
      }
      votesUrl={`/api/games/${slug}/votes`}
      voteUrl={`/api/games/${slug}/vote`}
      submitUrl={`/api/games/${slug}/evolve-issues`}
      triggerUrl={`/api/games/${slug}/evolve-trigger`}
      triggerLabel="Evolve"
      prefix="[EVOLVE]"
      loginText="Log in to vote on changes and shape how this game evolves."
      proposeText="+ Propose change"
      emptyText="No evolve proposals yet"
      titlePlaceholder="What should change?"
      bodyPlaceholder="Details (optional)"
      hiddenLabels={['evolve']}
      doneLabel="evolve"
      doneBadge="evolving"
      isReady={(issue, v) => {
        const authorVoted = issue.user?.id && (v?.voter_ids ?? []).includes(issue.user.id)
        return authorVoted || (v?.unique_voters ?? 0) >= 3
      }}
      issueMeta={(issue) => `#${issue.number}`}
      voterDisplay={(n) => `${n} voter${n !== 1 ? 's' : ''}`}
      defaultExtra={{ category: 'feature' }}
      renderFormExtra={(extra, setExtra) => (
        <div style={{ display: 'flex', gap: T.sp[2], marginTop: T.sp[2], flexWrap: 'wrap' }}>
          {CATEGORIES.map(c => (
            <button key={c} type="button" onClick={() => setExtra({ ...extra, category: c })}
              style={{
                padding: `${T.sp[1]}px ${T.sp[3]}px`,
                background: extra.category === c ? T.accentColor + '25' : 'transparent',
                border: `1px solid ${extra.category === c ? T.accentColor : T.border}`,
                borderRadius: T.radius.sm,
                color: extra.category === c ? T.accentColor : T.muted,
                fontSize: T.fontSize.xs, fontFamily: T.font, cursor: 'pointer',
              }}>
              {c}
            </button>
          ))}
        </div>
      )}
      buildPayload={(title, body, extra) => ({ title, body, category: extra.category })}
    />
  )
}
