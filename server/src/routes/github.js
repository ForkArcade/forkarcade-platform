import { Router } from 'express'

const router = Router()

const GITHUB_ORG = 'ForkArcade'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

let cache = { data: null, ts: 0 }

function ghHeaders() {
  const h = { Accept: 'application/vnd.github+json' }
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }
  return h
}

// GET /api/github/repos — cached proxy for org repos
router.get('/api/github/repos', async (_req, res) => {
  const now = Date.now()
  if (cache.data && (now - cache.ts) < CACHE_TTL) {
    return res.json(cache.data)
  }

  try {
    const r = await fetch(
      `https://api.github.com/orgs/${GITHUB_ORG}/repos?type=public&per_page=100`,
      { headers: ghHeaders() }
    )
    if (!r.ok) throw new Error(`GitHub API ${r.status}`)
    const repos = await r.json()

    cache = { data: repos, ts: now }
    res.json(repos)
  } catch (err) {
    // Serve stale cache if available
    if (cache.data) return res.json(cache.data)
    res.status(502).json({ error: 'GitHub API unavailable' })
  }
})

// Generic proxy for any GitHub API path (authenticated, avoids rate limits)
router.get('/api/github/proxy/*', async (req, res) => {
  const ghPath = req.params[0]
  try {
    const r = await fetch(`https://api.github.com/${ghPath}`, { headers: ghHeaders() })
    if (!r.ok) throw new Error(`GitHub API ${r.status}`)
    const data = await r.json()
    res.json(data)
  } catch (err) {
    res.status(502).json({ error: 'GitHub API unavailable' })
  }
})

// Raw file proxy — avoids unauthenticated rate limits on raw.githubusercontent.com
router.get('/api/github/raw/*', async (req, res) => {
  const path = req.params[0]
  try {
    const r = await fetch(`https://raw.githubusercontent.com/${path}`, { headers: ghHeaders() })
    if (!r.ok) return res.status(r.status).end()
    res.set('Content-Type', r.headers.get('content-type'))
    res.send(Buffer.from(await r.arrayBuffer()))
  } catch {
    res.status(502).end()
  }
})

export default router
