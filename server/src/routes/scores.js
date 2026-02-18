import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import db from '../db.js'
import { auth } from '../auth.js'

const router = Router()

const MAX_COINS_PER_SUBMISSION = 1000

// Rate limit: max 6 score submissions per minute per user
const scoreLimiter = rateLimit({
  windowMs: 60_000,
  max: 6,
  keyGenerator: (req) => req.user?.sub || req.ip,
  message: { error: 'rate_limited', retry_after: 60 },
})

router.post('/api/games/:slug/score', auth, scoreLimiter, async (req, res) => {
  const { score, version } = req.body
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1_000_000_000) {
    return res.status(400).json({ error: 'invalid_score' })
  }
  const v = version != null ? parseInt(version) : null
  if (version != null && (!Number.isInteger(v) || v < 1)) {
    return res.status(400).json({ error: 'invalid_version' })
  }

  try {
    // Get personal best + insert score + mint coins in one batch (single round-trip to Turso)
    const results = await db.batch([
      { sql: 'SELECT MAX(score) as best FROM scores WHERE github_user_id = ? AND game_slug = ?', args: [req.user.sub, req.params.slug] },
      { sql: 'INSERT INTO scores (github_user_id, game_slug, score, version, created_at) VALUES (?, ?, ?, ?, ?)', args: [req.user.sub, req.params.slug, score, v, new Date().toISOString()] },
    ])
    const personalBest = results[0].rows[0]?.best ?? 0
    const isPersonalRecord = score > personalBest

    let coins = Math.min(Math.floor(score * 0.1), MAX_COINS_PER_SUBMISSION)
    if (isPersonalRecord) coins = Math.min(Math.floor(coins * 1.5), MAX_COINS_PER_SUBMISSION)
    if (coins > 0) {
      await db.execute({
        sql: `INSERT INTO wallets (github_user_id, balance) VALUES (?, ?)
              ON CONFLICT(github_user_id) DO UPDATE SET balance = balance + ?`,
        args: [req.user.sub, coins, coins],
      })
    }

    res.json({ ok: true, coins, isPersonalRecord })
  } catch (err) {
    console.error('Score insert error:', err.message)
    res.status(500).json({ error: 'db_error' })
  }
})

router.get('/api/games/:slug/leaderboard', async (req, res) => {
  const { version } = req.query
  let sql = `SELECT u.login, u.avatar, MAX(s.score) as best
             FROM scores s JOIN users u ON u.github_user_id = s.github_user_id
             WHERE s.game_slug = ?`
  const args = [req.params.slug]
  const v = version ? parseInt(version) : NaN
  if (!Number.isNaN(v)) { sql += ` AND s.version = ?`; args.push(v) }
  sql += ` GROUP BY s.github_user_id ORDER BY best DESC LIMIT 50`

  try {
    const result = await db.execute({ sql, args })
    res.json(result.rows)
  } catch (err) {
    console.error('Leaderboard error:', err.message)
    res.json([])
  }
})

router.get('/api/me', auth, async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT github_user_id, login, avatar FROM users WHERE github_user_id = ?',
      args: [req.user.sub],
    })
    const user = result.rows[0]
    if (!user) return res.status(404).json({ error: 'user_not_found' })
    res.json({ user })
  } catch (err) {
    console.error('Me error:', err.message)
    res.status(500).json({ error: 'db_error' })
  }
})

export default router
