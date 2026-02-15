import { Router } from 'express'

const router = Router()

export const GITHUB_ORG = 'ForkArcade'
const REPOS_TTL = 5 * 60 * 1000  // 5 min — repos list
const PROXY_TTL = 2 * 60 * 1000  // 2 min — API proxy (repo info, trees)
const RAW_TTL   = 5 * 60 * 1000  // 5 min — raw files (rarely change)
const MAX_CACHE_SIZE = 200

const cache = new Map() // key -> { data, ts, contentType? }

function cacheGet(key, ttl) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > ttl) { cache.delete(key); return null }
  return entry
}

function cacheSet(key, data, contentType) {
  if (cache.size >= MAX_CACHE_SIZE) {
    cache.delete(cache.keys().next().value)
  }
  cache.set(key, { data, ts: Date.now(), contentType })
}

export function ghHeaders() {
  const h = { Accept: 'application/vnd.github+json' }
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }
  return h
}

// GET /api/github/repos — cached proxy for org repos
router.get('/api/github/repos', async (_req, res) => {
  const key = 'repos'
  const cached = cacheGet(key, REPOS_TTL)
  if (cached) return res.json(cached.data)

  try {
    const r = await fetch(
      `https://api.github.com/orgs/${GITHUB_ORG}/repos?type=public&per_page=100`,
      { headers: ghHeaders() }
    )
    if (!r.ok) throw new Error(`GitHub API ${r.status}`)
    const repos = await r.json()
    cacheSet(key, repos)
    res.json(repos)
  } catch (err) {
    const stale = cache.get(key)
    if (stale) return res.json(stale.data)
    res.status(502).json({ error: 'GitHub API unavailable' })
  }
})

// Generic proxy for any GitHub API path (authenticated, cached)
router.get('/api/github/proxy/*', async (req, res) => {
  const ghPath = req.params[0]
  if (!ghPath.startsWith(`repos/${GITHUB_ORG}/`) && !ghPath.startsWith(`orgs/${GITHUB_ORG}/`)) {
    return res.status(403).json({ error: 'forbidden' })
  }
  const key = `proxy:${ghPath}`
  const cached = cacheGet(key, PROXY_TTL)
  if (cached) return res.json(cached.data)

  try {
    const r = await fetch(`https://api.github.com/${ghPath}`, { headers: ghHeaders() })
    if (!r.ok) throw new Error(`GitHub API ${r.status}`)
    const data = await r.json()
    cacheSet(key, data)
    res.json(data)
  } catch (err) {
    const stale = cache.get(key)
    if (stale) return res.json(stale.data)
    res.status(502).json({ error: 'GitHub API unavailable' })
  }
})

// Raw file proxy — cached, authenticated
router.get('/api/github/raw/*', async (req, res) => {
  const path = req.params[0]
  if (!path.startsWith(`${GITHUB_ORG}/`)) {
    return res.status(403).json({ error: 'forbidden' })
  }
  const key = `raw:${path}`
  const cached = cacheGet(key, RAW_TTL)
  if (cached) {
    res.set('Content-Type', cached.contentType || 'application/octet-stream')
    return res.send(cached.data)
  }

  try {
    const r = await fetch(`https://raw.githubusercontent.com/${path}`, { headers: ghHeaders() })
    if (!r.ok) return res.status(r.status).end()
    const contentType = r.headers.get('content-type')
    const buf = Buffer.from(await r.arrayBuffer())
    cacheSet(key, buf, contentType)
    res.set('Content-Type', contentType)
    res.send(buf)
  } catch {
    res.status(502).end()
  }
})

export default router
