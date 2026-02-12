export const API = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export const GITHUB_ORG = 'ForkArcade'

export async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  return res.json()
}

export async function githubFetch(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!res.ok) throw new Error(`GitHub API ${res.status}`)
  return res.json()
}
