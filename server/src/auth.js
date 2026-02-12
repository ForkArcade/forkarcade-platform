import { Router } from 'express'
import jwt from 'jsonwebtoken'
import db from './db.js'

const router = Router()

export function sign(user) {
  return jwt.sign(
    { sub: user.github_user_id, login: user.login },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  )
}

export function auth(req, res, next) {
  const t = req.cookies[process.env.COOKIE_NAME]
  if (!t) return res.status(401).json({ error: 'no_auth' })
  try {
    req.user = jwt.verify(t, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'invalid' })
  }
}

function cookieOptions() {
  const crossOrigin = process.env.CLIENT_ORIGIN && process.env.SERVER_ORIGIN
    && new URL(process.env.CLIENT_ORIGIN).origin !== new URL(process.env.SERVER_ORIGIN).origin
  return {
    httpOnly: true,
    sameSite: crossOrigin ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  }
}

// OAuth: redirect to GitHub
router.get('/auth/github', (_req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${process.env.SERVER_ORIGIN || `http://localhost:${process.env.PORT}`}/auth/github/callback`,
    scope: 'read:user',
  })
  res.redirect(`https://github.com/login/oauth/authorize?${params}`)
})

// OAuth: callback from GitHub
router.get('/auth/github/callback', async (req, res) => {
  const { code } = req.query
  if (!code) return res.status(400).send('Missing code parameter')

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
    const ghUser = await userRes.json()

    await db.execute({
      sql: `INSERT INTO users (github_user_id, login, avatar)
            VALUES (?, ?, ?)
            ON CONFLICT(github_user_id) DO UPDATE SET login = excluded.login, avatar = excluded.avatar`,
      args: [ghUser.id, ghUser.login, ghUser.avatar_url],
    })

    const token = sign({ github_user_id: ghUser.id, login: ghUser.login })
    res.cookie(process.env.COOKIE_NAME, token, cookieOptions())
    res.redirect(process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  } catch (err) {
    console.error('OAuth callback error:', err)
    res.status(500).send('Authentication failed')
  }
})

// Logout
router.post('/auth/logout', (_req, res) => {
  res.clearCookie(process.env.COOKIE_NAME, cookieOptions())
  res.json({ ok: true })
})

// Mock login (development only)
if (process.env.NODE_ENV !== 'production') {
  router.post('/auth/github/mock', async (req, res) => {
    const { id, login } = req.body
    await db.execute({
      sql: 'INSERT OR REPLACE INTO users (github_user_id, login) VALUES (?, ?)',
      args: [id, login],
    })
    const token = sign({ github_user_id: id, login })
    res.cookie(process.env.COOKIE_NAME, token, cookieOptions())
    res.json({ ok: true })
  })
}

export default router
