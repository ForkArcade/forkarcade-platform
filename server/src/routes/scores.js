import { Router } from 'express'
import db from '../db.js'
import { auth } from '../auth.js'

const router = Router()

router.post('/api/games/:slug/score', auth, (req, res) => {
  const { score } = req.body
  if (typeof score !== 'number') return res.status(400).json({ error: 'invalid_score' })

  db.prepare(`
    INSERT INTO scores (github_user_id, game_slug, score, created_at)
    VALUES (?, ?, ?, ?)
  `).run(req.user.sub, req.params.slug, score, new Date().toISOString())
  res.json({ ok: true })
})

router.get('/api/games/:slug/leaderboard', (req, res) => {
  const rows = db.prepare(`
    SELECT u.login, u.avatar, MAX(s.score) as best
    FROM scores s
    JOIN users u ON u.github_user_id = s.github_user_id
    WHERE s.game_slug = ?
    GROUP BY s.github_user_id
    ORDER BY best DESC
    LIMIT 50
  `).all(req.params.slug)
  res.json(rows)
})

router.get('/api/me', auth, (req, res) => {
  const user = db.prepare('SELECT github_user_id, login, avatar FROM users WHERE github_user_id = ?').get(req.user.sub)
  if (!user) return res.status(404).json({ error: 'user_not_found' })
  res.json({ user })
})

export default router
