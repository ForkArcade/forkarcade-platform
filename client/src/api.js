export const API = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export const GITHUB_ORG = 'ForkArcade'
export const GAME_TOPIC = 'forkarcade-game'
export const TEMPLATE_TOPIC = 'forkarcade-template'
export const PLATFORM_REPO = `${GITHUB_ORG}/forkarcade-platform`

export function formatSlug(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  if (options.body) headers['Content-Type'] = 'application/json'
  const res = await fetch(API + path, {
    credentials: 'include',
    ...options,
    headers,
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

export function githubRawUrl(path) {
  return `${API}/api/github/raw/${path}`
}

export async function githubFetch(path) {
  // Repos list goes through server proxy (cached, token-authenticated)
  if (path.includes(`/orgs/${GITHUB_ORG}/repos`)) {
    const res = await fetch(`${API}/api/github/repos`)
    if (!res.ok) throw new Error(`GitHub proxy ${res.status}`)
    return res.json()
  }
  // All other GitHub API calls go through server proxy (authenticated, no rate limits)
  const proxyPath = path.startsWith('/') ? path.slice(1) : path
  const res = await fetch(`${API}/api/github/proxy/${proxyPath}`)
  if (!res.ok) throw new Error(`GitHub proxy ${res.status}`)
  return res.json()
}
