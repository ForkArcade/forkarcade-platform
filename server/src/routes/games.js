import { Router } from 'express'
import db from '../db.js'
import { auth } from '../auth.js'

const router = Router()

router.post('/api/games', auth, (req, res) => {
  const { slug, title, description, github_repo, github_pages_url } = req.body
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ error: 'invalid_slug' })
  }
  if (!title || !github_pages_url) {
    return res.status(400).json({ error: 'missing_fields' })
  }
  try {
    db.prepare(`
      INSERT INTO games (slug, title, description, github_repo, github_pages_url, author_github_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(slug, title, description || '', github_repo || '', github_pages_url, req.user.sub, new Date().toISOString())
    res.json({ ok: true })
  } catch (e) {
    if (e.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'slug_taken' })
    }
    throw e
  }
})

router.get('/api/games', (req, res) => {
  const rows = db.prepare(`
    SELECT g.*, u.login as author_login, u.avatar as author_avatar
    FROM games g
    JOIN users u ON u.github_user_id = g.author_github_id
    ORDER BY g.created_at DESC
  `).all()
  res.json(rows)
})

router.get('/api/games/:slug', (req, res) => {
  const game = db.prepare(`
    SELECT g.*, u.login as author_login, u.avatar as author_avatar
    FROM games g
    JOIN users u ON u.github_user_id = g.author_github_id
    WHERE g.slug = ?
  `).get(req.params.slug)
  if (!game) return res.status(404).json({ error: 'not_found' })
  res.json(game)
})

export default router
