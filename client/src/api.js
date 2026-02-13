export const API = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export const GITHUB_ORG = 'ForkArcade'
export const TEMPLATE_TOPIC = 'forkarcade-template'

export async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

export async function fetchBuildCache(key) {
  try {
    const res = await fetch(`/cache/${key}.json`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
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
