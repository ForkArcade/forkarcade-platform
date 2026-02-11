export const API = import.meta.env.VITE_API_URL || 'http://localhost:8787'

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
