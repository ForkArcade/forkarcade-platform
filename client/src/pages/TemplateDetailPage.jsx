import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { T } from '../theme'
import { GITHUB_ORG, TEMPLATE_TOPIC, githubFetch, githubRawUrl } from '../api'
import { Badge, ColorSwatch, Section, EmptyState } from '../components/ui'
import SimpleMd from '../components/SimpleMd'
import { ArrowLeft, ExternalLink } from 'lucide-react'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function FileRow({ name, size, accent }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: T.sp[4],
      padding: `${T.sp[2]}px 0`,
    }}>
      <div style={{ width: 3, height: 14, background: accent, borderRadius: 1, flexShrink: 0 }} />
      <span style={{ fontFamily: T.mono, fontSize: T.fontSize.xs, color: T.textBright, flex: 1 }}>{name}</span>
      {size != null && (
        <span style={{ fontFamily: T.mono, fontSize: T.fontSize.xs, color: T.muted }}>{formatSize(size)}</span>
      )}
    </div>
  )
}

export default function TemplateDetailPage() {
  const { slug } = useParams()
  const [repo, setRepo] = useState(null)
  const [config, setConfig] = useState(null)
  const [assets, setAssets] = useState(null)
  const [tree, setTree] = useState([])
  const [promptMd, setPromptMd] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const rawBase = githubRawUrl(`${GITHUB_ORG}/${slug}/main`)

    Promise.all([
      githubFetch(`/repos/${GITHUB_ORG}/${slug}`).catch(() => null),
      fetch(`${rawBase}/.forkarcade.json`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${rawBase}/_assets.json`).then(r => r.ok ? r.json() : null).catch(() => null),
      githubFetch(`/repos/${GITHUB_ORG}/${slug}/git/trees/main?recursive=1`).catch(() => null),
      fetch(`${rawBase}/_prompt.md`).then(r => r.ok ? r.text() : null).catch(() => null),
    ]).then(([repoData, configData, assetsData, treeData, promptText]) => {
      setRepo(repoData)
      setConfig(configData)
      setAssets(assetsData)
      setTree(treeData?.tree?.filter(f => f.type === 'blob') || [])
      setPromptMd(promptText)
      setLoading(false)
    })
  }, [slug])

  if (loading) return <EmptyState>Loading...</EmptyState>
  if (!repo) return <EmptyState>Template not found</EmptyState>

  const engineFiles = config?.engineFiles || []
  const gameFiles = config?.gameFiles || []
  const topics = (repo.topics || []).filter(t => t !== TEMPLATE_TOPIC)
  const palette = assets?.palette ? Object.entries(assets.palette) : []
  const categories = assets?.categories ? Object.entries(assets.categories) : []
  const sizeMap = Object.fromEntries(tree.map(f => [f.path, f.size]))
  const findSize = (name) => sizeMap[name] ?? tree.find(f => f.path.endsWith('/' + name))?.size

  const crumbStyle = { display: 'flex', alignItems: 'center', gap: T.sp[2], color: T.muted, textDecoration: 'none', fontSize: T.fontSize.xs, letterSpacing: T.tracking.wider, textTransform: 'uppercase' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: T.sp[8] }}>
        <Link to="/templates" style={crumbStyle}><ArrowLeft size={12} /> Templates</Link>
        <div style={{ flex: 1 }} />
        <a href={repo.html_url} target="_blank" rel="noopener noreferrer" style={crumbStyle}>GitHub <ExternalLink size={12} /></a>
      </div>

      {/* Hero */}
      <div style={{ marginBottom: T.sp[9] }}>
        {topics.length > 0 && (
          <div style={{ display: 'flex', gap: T.sp[2], marginBottom: T.sp[4] }}>
            {topics.map(t => <Badge key={t}>{t}</Badge>)}
          </div>
        )}
        <h1 style={{
          fontSize: 36,
          fontWeight: T.weight.bold,
          color: T.textBright,
          letterSpacing: T.tracking.tighter,
          margin: 0,
          lineHeight: 1.1,
          maxWidth: 700,
        }}>
          {repo.description || repo.name}
        </h1>
      </div>

      {/* Prompt — main content */}
      {promptMd && (
        <div style={{
          marginBottom: T.sp[9],
          paddingBottom: T.sp[8],
          borderBottom: `1px solid ${T.border}`,
        }}>
          <SimpleMd text={promptMd} />
        </div>
      )}

      {/* Technical details — compact 3-column grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: T.sp[8],
        alignItems: 'start',
      }}>
        {/* Col 1: Engine + Game files */}
        <div>
          <Section title="Engine Modules">
            {engineFiles.map(f => (
              <FileRow key={f} name={f} size={findSize(f)} accent={T.accentColor} />
            ))}
            {engineFiles.length === 0 && <EmptyState>No engine files</EmptyState>}
          </Section>
          <Section title="Game Files">
            {gameFiles.map(f => (
              <FileRow key={f} name={f} size={findSize(f)} accent={T.success} />
            ))}
            {gameFiles.length === 0 && <EmptyState>No game files</EmptyState>}
          </Section>
        </div>

        {/* Col 2: Sprites */}
        <div>
          {(categories.length > 0 || assets?.gridSize) && (
            <Section title="Sprite Categories">
              {[...(assets?.gridSize ? [['Grid size', `${assets.gridSize}px`]] : []), ...categories.map(([cat, info]) => [cat, typeof info === 'string' ? info : info.description || ''])].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: `${T.sp[2]}px 0` }}>
                  <span style={{ fontSize: T.fontSize.xs, color: T.textBright }}>{label}</span>
                  <span style={{ fontSize: T.fontSize.xs, color: T.muted, fontFamily: T.mono }}>{val}</span>
                </div>
              ))}
            </Section>
          )}
          {assets?.style && (
            <Section title="Art Style">
              <p style={{ fontSize: T.fontSize.xs, color: T.text, lineHeight: T.leading.relaxed, margin: 0 }}>
                {assets.style}
              </p>
            </Section>
          )}
        </div>

        {/* Col 3: Palette */}
        <div>
          {palette.length > 0 && (
            <Section title="Palette">
              {palette.map(([name, color]) => (
                <ColorSwatch key={name} name={name} color={color} />
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}
