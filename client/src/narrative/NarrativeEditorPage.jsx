import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { T } from '../theme'
import { useNarrativeData } from './useNarrativeData'
import GraphEditor from './GraphEditor'
import VariableEditor from './VariableEditor'
import ActorEditor from './ActorEditor'
import SceneEditor from './SceneEditor'
import ContentEditor from './ContentEditor'
import SimulationEditor from './SimulationEditor'

const TABS = ['graphs', 'variables', 'actors', 'scenes', 'content', 'simulation']

export default function NarrativeEditorPage({ user }) {
  const { slug } = useParams()
  const { data, update, hasLocalEdits, resetToPublished } = useNarrativeData(slug)
  const [tab, setTab] = useState('graphs')

  if (!data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: T.muted, fontFamily: T.mono, fontSize: T.fontSize.sm }}>
        Loading narrative data...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* Left: tabs */}
      <div style={{ width: 160, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: `${T.sp[4]}px ${T.sp[4]}px ${T.sp[3]}px`, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: T.fontSize.xs, fontFamily: T.mono, color: T.muted, textTransform: 'uppercase', letterSpacing: T.tracking.widest }}>
            Narrative
          </div>
          <div style={{ fontSize: T.fontSize.sm, color: T.textBright, marginTop: T.sp[1] }}>
            {slug}
          </div>
        </div>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: `${T.sp[3]}px ${T.sp[4]}px`,
              background: tab === t ? T.surface : 'transparent',
              border: 'none', borderLeft: tab === t ? `2px solid ${T.accentColor}` : '2px solid transparent',
              color: tab === t ? T.textBright : T.text,
              fontSize: T.fontSize.xs, textTransform: 'uppercase',
              letterSpacing: T.tracking.wider, cursor: 'pointer',
              fontFamily: T.mono,
            }}
          >
            {t}
          </button>
        ))}
        <div style={{ marginTop: 'auto', padding: T.sp[4], borderTop: `1px solid ${T.border}` }}>
          {hasLocalEdits && (
            <>
              <div style={{ fontSize: 9, color: T.warning, marginBottom: T.sp[2] }}>local edits</div>
              <button
                onClick={resetToPublished}
                style={{
                  width: '100%', padding: `${T.sp[2]}px 0`,
                  background: 'transparent', border: `1px solid ${T.border}`,
                  borderRadius: T.radius.sm, color: T.muted,
                  fontSize: 9, fontFamily: T.mono, cursor: 'pointer',
                }}
              >
                Reset to published
              </button>
            </>
          )}
        </div>
      </div>

      {/* Center + Right: editor content */}
      <div style={{ flex: 1, overflow: 'auto', padding: T.sp[5] }}>
        {tab === 'graphs' && <GraphEditor data={data} update={update} />}
        {tab === 'variables' && <VariableEditor data={data} update={update} />}
        {tab === 'actors' && <ActorEditor data={data} update={update} />}
        {tab === 'scenes' && <SceneEditor data={data} update={update} />}
        {tab === 'content' && <ContentEditor data={data} update={update} />}
        {tab === 'simulation' && <SimulationEditor data={data} update={update} />}
      </div>
    </div>
  )
}
