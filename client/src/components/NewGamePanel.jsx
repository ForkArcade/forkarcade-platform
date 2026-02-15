import { githubFetch, PLATFORM_REPO } from '../api'
import { T } from '../theme'
import VotingPanel from './VotingPanel'

export default function NewGamePanel({ user, balance, onBalanceChange }) {
  return (
    <VotingPanel
      user={user} balance={balance} onBalanceChange={onBalanceChange}
      refreshKey=""
      fetchIssues={() =>
        githubFetch(`/repos/${PLATFORM_REPO}/issues?state=open&labels=new-game&per_page=50`)
          .then(r => (Array.isArray(r) ? r : []).filter(i => i.title.startsWith('[NEW-GAME]')))
      }
      votesUrl="/api/new-game/votes"
      voteUrl="/api/new-game/vote"
      submitUrl="/api/new-game/issues"
      prefix="[NEW-GAME]"
      loginText="Log in to propose and vote on new games."
      proposeText="+ Propose new game"
      emptyText="No game proposals yet"
      titlePlaceholder="Game name or concept"
      bodyPlaceholder="Describe the game — mechanics, mood, inspiration..."
      hiddenLabels={['new-game', 'approved']}
      doneLabel="approved"
      doneBadge="approved"
      isReady={(_issue, v) => (v?.unique_voters ?? 0) >= 10}
      issueMeta={(_issue, n) => `${n}/10`}
      voterDisplay={(n) => `${n}/10 voters`}
      defaultExtra={{ template: '' }}
      renderFormExtra={(extra, setExtra, style) => (
        <input value={extra.template || ''} onChange={e => setExtra({ ...extra, template: e.target.value })}
          placeholder="Template (optional, e.g. roguelike, space-combat)"
          style={{ ...style, marginTop: T.sp[2] }} />
      )}
      buildPayload={(title, body, extra) => ({ title, body, template: extra.template || undefined })}
    />
  )
}
