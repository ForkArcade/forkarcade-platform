import { useState, useEffect } from 'react'
import { GITHUB_ORG, TEMPLATE_TOPIC, githubFetch } from '../api'
import { PageHeader, Grid, Card, CardTitle, CardTags, Badge, EmptyState } from '../components/ui'

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([])
  const [status, setStatus] = useState('loading') // loading | ok | error

  useEffect(() => {
    setStatus('loading')
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
        setStatus('ok')
      })
      .catch(() => {
        setTemplates([])
        setStatus('error')
      })
  }, [])

  return (
    <div>
      <PageHeader>Templates</PageHeader>
      <Grid>
        {templates.map(t => (
          <Card key={t.slug} to={`/templates/${t.slug}`}>
            <CardTitle>{t.name}</CardTitle>
            {t.topics?.length > 0 && <CardTags>{t.topics.map(tp => <Badge key={tp}>{tp}</Badge>)}</CardTags>}
          </Card>
        ))}
      </Grid>
      {status === 'loading' && <EmptyState>Loading templates...</EmptyState>}
      {status === 'error' && <EmptyState>Server is waking up — free Render.com plan spins down after inactivity. Refresh in a few seconds.</EmptyState>}
      {status === 'ok' && templates.length === 0 && <EmptyState>No templates found.</EmptyState>}
    </div>
  )
}
