import { Router } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import db from './db.js'

const router = Router()
const COOKIE_NAME = process.env.COOKIE_NAME || 'fa_token'
const IS_PROD = process.env.NODE_ENV === 'production'

export function sign(user) {
  return jwt.sign(
    { sub: user.github_user_id, login: user.login },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  )
}

export function auth(req, res, next) {
  const hdr = req.headers.authorization
  const t = (hdr && hdr.startsWith('Bearer ')) ? hdr.slice(7) : req.cookies[COOKIE_NAME]
  if (!t) return res.status(401).json({ error: 'no_auth' })
  try {
    const payload = jwt.verify(t, process.env.JWT_SECRET)
    req.user = { ...payload, userId: payload.sub }
    next()
  } catch {
    res.status(401).json({ error: 'invalid' })
  }
}

// OAuth: redirect to GitHub
router.get('/auth/github', (_req, res) => {
  const state = crypto.randomUUID()
  res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: IS_PROD, maxAge: 600_000 })
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${process.env.SERVER_ORIGIN || `http://localhost:${process.env.PORT}`}/auth/github/callback`,
    scope: 'read:user',
    state,
  })
  res.redirect(`https://github.com/login/oauth/authorize?${params}`)
})

// OAuth: callback from GitHub
router.get('/auth/github/callback', async (req, res) => {
  const { code, state } = req.query
  if (!code) return res.status(400).send('Missing code parameter')
  const expectedState = req.cookies?.oauth_state
  res.clearCookie('oauth_state', { httpOnly: true, sameSite: 'lax', secure: IS_PROD })
  if (!state || !expectedState || state !== expectedState) {
    return res.status(403).send('Invalid OAuth state — possible CSRF attack')
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    })
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      console.error('GitHub token error:', tokenData)
      return res.status(401).send('GitHub authentication failed')
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
      },
    })
    if (!userRes.ok) {
      console.error('GitHub user fetch failed:', userRes.status)
      return res.status(502).send('Failed to fetch GitHub user info')
    }
    const ghUser = await userRes.json()
    if (!ghUser.id || !ghUser.login) {
      console.error('Invalid GitHub user response:', ghUser)
      return res.status(502).send('Invalid GitHub user data')
    }

    await db.execute({
      sql: `INSERT INTO users (github_user_id, login, avatar)
            VALUES (?, ?, ?)
            ON CONFLICT(github_user_id) DO UPDATE SET login = excluded.login, avatar = excluded.avatar`,
      args: [ghUser.id, ghUser.login, ghUser.avatar_url],
    })

    const token = sign({ github_user_id: ghUser.id, login: ghUser.login })
    const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
    // Use fragment (#) instead of query string (?) — fragments are not logged in server access logs or sent in referrer headers
    res.redirect(`${clientOrigin}#token=${encodeURIComponent(token)}`)
  } catch (err) {
    console.error('OAuth callback error:', err)
    res.status(500).send('Authentication failed')
  }
})

// Logout (kept for backward compat, token cleared client-side)
router.post('/auth/logout', (_req, res) => {
  res.json({ ok: true })
})

export default router
