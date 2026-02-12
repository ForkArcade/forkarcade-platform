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

export default router
