import { useState, useEffect } from 'react'
import { T } from '../theme'
import { GITHUB_ORG, TEMPLATE_TOPIC, githubFetch } from '../api'
import { Badge } from '../components/ui'

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([])

  useEffect(() => {
    githubFetch(`/orgs/${GITHUB_ORG}/repos?type=public&per_page=100`)
      .then(repos => {
        setTemplates(repos
          .filter(r => r.topics?.includes(TEMPLATE_TOPIC))
          .map(r => ({
            slug: r.name,
            name: r.description || r.name,
            url: r.html_url,
            topics: r.topics.filter(t => t !== TEMPLATE_TOPIC),
          }))
        )
      })
      .catch(() => setTemplates([]))
  }, [])

  return (
    <div>
      <h2 style={{ color: T.textBright, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, margin: '8px 0 16px' }}>Templates</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {templates.map(t => <TemplateCard key={t.slug} template={t} />)}
      </div>
      {templates.length === 0 && <p style={{ color: T.textDim }}>No templates found.</p>}
    </div>
  )
}

function TemplateCard({ template }) {
  const [hover, setHover] = useState(false)

  return (
    <a href={template.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          background: T.elevated,
          border: `1px solid ${hover ? T.accent + '60' : T.border}`,
          borderRadius: T.radius,
          padding: 16,
          transition: 'border-color 0.15s',
        }}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: 14, color: T.textBright }}>{template.name}</h3>
        {template.topics?.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {template.topics.map(t => <Badge key={t}>{t}</Badge>)}
          </div>
        )}
      </div>
    </a>
  )
}
