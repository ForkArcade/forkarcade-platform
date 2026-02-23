import { Router } from 'express'
import db from '../db.js'
import { auth } from '../auth.js'
import { GITHUB_ORG, ghHeaders } from './github.js'

const router = Router()
const EVOLVE_VOTE_THRESHOLD = 3
const NEW_GAME_VOTE_THRESHOLD = 10

// GET /api/wallet — current user's balance
router.get('/api/wallet', auth, async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT balance FROM wallets WHERE github_user_id = ?',
      args: [req.user.sub],
    })
    res.json({ balance: result.rows[0]?.balance ?? 0 })
  } catch (err) {
    console.error('Wallet fetch error:', err)
    res.status(500).json({ error: 'db_error' })
  }
})

// POST /api/games/:slug/evolve-issues — create [EVOLVE] issue on GitHub
router.post('/api/games/:slug/evolve-issues', auth, async (req, res) => {
  const { slug } = req.params
  const { title, body, category } = req.body
  if (!title) return res.status(400).json({ error: 'missing_title' })

  try {
    // Check user has at least 1 score in this game
    const scores = await db.execute({
      sql: 'SELECT id FROM scores WHERE github_user_id = ? AND game_slug = ? LIMIT 1',
      args: [req.user.sub, slug],
    })
    if (scores.rows.length === 0) return res.status(403).json({ error: 'must_play_first' })

    // Create GitHub issue with [EVOLVE] prefix
    const labels = category ? [category] : []
    const ghRes = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${slug}/issues`, {
      method: 'POST',
      headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `[EVOLVE] ${title}`,
        body: body || '',
        labels,
      }),
    })
    if (!ghRes.ok) {
      const err = await ghRes.text()
      console.error('GitHub issue creation failed:', err)
      return res.status(502).json({ error: 'github_error' })
    }
    const issue = await ghRes.json()
    res.json({ ok: true, issue_number: issue.number, html_url: issue.html_url })
  } catch (err) {
    console.error('Evolve issue error:', err)
    res.status(500).json({ error: 'server_error' })
  }
})

// POST /api/games/:slug/vote — vote on an evolve issue (burn coins)
router.post('/api/games/:slug/vote', auth, async (req, res) => {
  const { slug } = req.params
  const { issue_number, coins } = req.body
  if (!Number.isInteger(issue_number) || issue_number < 1) {
    return res.status(400).json({ error: 'invalid_issue_number' })
  }
  if (typeof coins !== 'number' || !Number.isInteger(coins) || coins < 10 || coins > 10000 || coins % 10 !== 0) {
    return res.status(400).json({ error: 'invalid_vote' })
  }

  try {
    // Step 1: deduct coins (WHERE balance >= coins ensures sufficient funds)
    const deduct = await db.execute({
      sql: 'UPDATE wallets SET balance = balance - ? WHERE github_user_id = ? AND balance >= ?',
      args: [coins, req.user.sub, coins],
    })
    if (deduct.rowsAffected === 0) return res.status(400).json({ error: 'insufficient_coins' })

    // Step 2: insert vote + read new balance (coins already deducted)
    try {
      const results = await db.batch([
        { sql: 'INSERT INTO votes (github_user_id, game_slug, issue_number, coins_spent, created_at) VALUES (?, ?, ?, ?, ?)', args: [req.user.sub, slug, issue_number, coins, new Date().toISOString()] },
        { sql: 'SELECT balance FROM wallets WHERE github_user_id = ?', args: [req.user.sub] },
      ])
      res.json({ ok: true, newBalance: results[1].rows[0]?.balance ?? 0 })
    } catch (insertErr) {
      // Rollback: refund coins if vote insert fails
      await db.execute({ sql: 'UPDATE wallets SET balance = balance + ? WHERE github_user_id = ?', args: [coins, req.user.sub] })
        .catch(rollbackErr => console.error('CRITICAL: coin rollback failed for user', req.user.sub, coins, 'coins lost:', rollbackErr))
      throw insertErr
    }
  } catch (err) {
    console.error('Vote error:', err)
    res.status(500).json({ error: 'db_error' })
  }
})

// GET /api/games/:slug/votes — aggregated vote totals per issue
router.get('/api/games/:slug/votes', async (req, res) => {
  try {
    const [totals, voters] = await db.batch([
      { sql: `SELECT issue_number, SUM(coins_spent) / 10 as total_votes, SUM(coins_spent) as total_coins, COUNT(DISTINCT github_user_id) as unique_voters FROM votes WHERE game_slug = ? GROUP BY issue_number`, args: [req.params.slug] },
      { sql: `SELECT DISTINCT issue_number, github_user_id FROM votes WHERE game_slug = ?`, args: [req.params.slug] },
    ])
    // Build voter_ids map per issue
    const voterMap = {}
    for (const v of voters.rows) {
      if (!voterMap[v.issue_number]) voterMap[v.issue_number] = []
      voterMap[v.issue_number].push(v.github_user_id)
    }
    res.json(totals.rows.map(r => ({ ...r, voter_ids: voterMap[r.issue_number] || [] })))
  } catch (err) {
    console.error('Votes fetch error:', err)
    res.status(500).json({ error: 'db_error' })
  }
})

// POST /api/games/:slug/evolve-trigger — add evolve label to trigger GitHub Actions
router.post('/api/games/:slug/evolve-trigger', auth, async (req, res) => {
  const { slug } = req.params
  const { issue_number } = req.body
  if (!Number.isInteger(issue_number) || issue_number < 1) return res.status(400).json({ error: 'invalid_issue_number' })

  try {
    // Check vote threshold — author vote bypasses the 3-voter minimum
    const [voteCount, issueRes] = await Promise.all([
      db.execute({
        sql: 'SELECT COUNT(DISTINCT github_user_id) as unique_voters FROM votes WHERE game_slug = ? AND issue_number = ?',
        args: [slug, issue_number],
      }),
      fetch(`https://api.github.com/repos/${GITHUB_ORG}/${slug}/issues/${issue_number}`, { headers: ghHeaders() }).then(r => { if (!r.ok) console.warn(`GitHub issue fetch failed: ${r.status}`); return r.ok ? r.json() : null }),
    ])
    const uniqueVoters = voteCount.rows[0]?.unique_voters ?? 0
    const authorId = issueRes?.user?.id
    let authorVoted = false
    if (authorId) {
      const check = await db.execute({
        sql: 'SELECT 1 FROM votes WHERE game_slug = ? AND issue_number = ? AND github_user_id = ? LIMIT 1',
        args: [slug, issue_number, authorId],
      })
      authorVoted = check.rows.length > 0
    }
    if (!authorVoted && uniqueVoters < EVOLVE_VOTE_THRESHOLD) {
      return res.status(400).json({ error: 'not_enough_voters', required: EVOLVE_VOTE_THRESHOLD, current: uniqueVoters })
    }

    // Add evolve label via GitHub API
    const ghRes = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${slug}/issues/${issue_number}/labels`, {
      method: 'POST',
      headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ labels: ['evolve'] }),
    })
    if (!ghRes.ok) {
      const err = await ghRes.text()
      console.error('GitHub label add failed:', err)
      return res.status(502).json({ error: 'github_error' })
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('Evolve trigger error:', err)
    res.status(500).json({ error: 'server_error' })
  }
})

// --- New Game Proposals ---

const PLATFORM_REPO = `${GITHUB_ORG}/forkarcade-platform`
const NEW_GAME_SLUG = '_platform' // sentinel value in votes table

// POST /api/new-game/issues — create [NEW-GAME] issue on platform repo
router.post('/api/new-game/issues', auth, async (req, res) => {
  const { title, body, template } = req.body
  if (!title) return res.status(400).json({ error: 'missing_title' })

  try {
    const labels = ['new-game']
    if (template) labels.push(template)
    const ghRes = await fetch(`https://api.github.com/repos/${PLATFORM_REPO}/issues`, {
      method: 'POST',
      headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `[NEW-GAME] ${title}`,
        body: body || '',
        labels,
      }),
    })
    if (!ghRes.ok) {
      const err = await ghRes.text()
      console.error('GitHub issue creation failed:', err)
      return res.status(502).json({ error: 'github_error' })
    }
    const issue = await ghRes.json()
    res.json({ ok: true, issue_number: issue.number, html_url: issue.html_url })
  } catch (err) {
    console.error('New game issue error:', err)
    res.status(500).json({ error: 'server_error' })
  }
})

// POST /api/new-game/vote — vote on a new game proposal
router.post('/api/new-game/vote', auth, async (req, res) => {
  const { issue_number, coins } = req.body
  if (!Number.isInteger(issue_number) || issue_number < 1) {
    return res.status(400).json({ error: 'invalid_issue_number' })
  }
  if (typeof coins !== 'number' || !Number.isInteger(coins) || coins < 10 || coins > 10000 || coins % 10 !== 0) {
    return res.status(400).json({ error: 'invalid_vote' })
  }

  try {
    // Step 1: deduct coins (WHERE balance >= coins ensures sufficient funds)
    const deduct = await db.execute({
      sql: 'UPDATE wallets SET balance = balance - ? WHERE github_user_id = ? AND balance >= ?',
      args: [coins, req.user.sub, coins],
    })
    if (deduct.rowsAffected === 0) return res.status(400).json({ error: 'insufficient_coins' })

    // Step 2: insert vote + read new balance (coins already deducted)
    try {
      const results = await db.batch([
        { sql: 'INSERT INTO votes (github_user_id, game_slug, issue_number, coins_spent, created_at) VALUES (?, ?, ?, ?, ?)', args: [req.user.sub, NEW_GAME_SLUG, issue_number, coins, new Date().toISOString()] },
        { sql: 'SELECT balance FROM wallets WHERE github_user_id = ?', args: [req.user.sub] },
      ])
      res.json({ ok: true, newBalance: results[1].rows[0]?.balance ?? 0 })
    } catch (insertErr) {
      // Rollback: refund coins if vote insert fails
      await db.execute({ sql: 'UPDATE wallets SET balance = balance + ? WHERE github_user_id = ?', args: [coins, req.user.sub] })
        .catch(rollbackErr => console.error('CRITICAL: coin rollback failed for user', req.user.sub, coins, 'coins lost:', rollbackErr))
      throw insertErr
    }
  } catch (err) {
    console.error('New game vote error:', err)
    res.status(500).json({ error: 'db_error' })
  }
})

// GET /api/new-game/votes — aggregated votes for new game proposals
router.get('/api/new-game/votes', async (_req, res) => {
  try {
    const [totals, voters] = await db.batch([
      { sql: `SELECT issue_number, SUM(coins_spent) / 10 as total_votes, SUM(coins_spent) as total_coins, COUNT(DISTINCT github_user_id) as unique_voters FROM votes WHERE game_slug = ? GROUP BY issue_number`, args: [NEW_GAME_SLUG] },
      { sql: `SELECT DISTINCT issue_number, github_user_id FROM votes WHERE game_slug = ?`, args: [NEW_GAME_SLUG] },
    ])
    const voterMap = {}
    for (const v of voters.rows) {
      if (!voterMap[v.issue_number]) voterMap[v.issue_number] = []
      voterMap[v.issue_number].push(v.github_user_id)
    }
    res.json(totals.rows.map(r => ({ ...r, voter_ids: voterMap[r.issue_number] || [] })))
  } catch (err) {
    console.error('New game votes error:', err)
    res.status(500).json({ error: 'db_error' })
  }
})

// POST /api/new-game/trigger — add new-game label (threshold: 10 unique voters)
router.post('/api/new-game/trigger', auth, async (req, res) => {
  const { issue_number } = req.body
  if (!Number.isInteger(issue_number) || issue_number < 1) return res.status(400).json({ error: 'invalid_issue_number' })

  try {
    const voteCount = await db.execute({
      sql: 'SELECT COUNT(DISTINCT github_user_id) as unique_voters FROM votes WHERE game_slug = ? AND issue_number = ?',
      args: [NEW_GAME_SLUG, issue_number],
    })
    const uniqueVoters = voteCount.rows[0]?.unique_voters ?? 0
    if (uniqueVoters < NEW_GAME_VOTE_THRESHOLD) {
      return res.status(400).json({ error: 'not_enough_voters', required: NEW_GAME_VOTE_THRESHOLD, current: uniqueVoters })
    }

    const ghRes = await fetch(`https://api.github.com/repos/${PLATFORM_REPO}/issues/${issue_number}/labels`, {
      method: 'POST',
      headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ labels: ['approved'] }),
    })
    if (!ghRes.ok) {
      const err = await ghRes.text()
      console.error('GitHub label add failed:', err)
      return res.status(502).json({ error: 'github_error' })
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('New game trigger error:', err)
    res.status(500).json({ error: 'server_error' })
  }
})

// DELETE /api/games/:slug/data — admin-only: remove all scores and votes for a game
router.delete('/api/games/:slug/data', async (req, res) => {
  const secret = req.headers['x-admin-secret']
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'forbidden' })
  }

  const { slug } = req.params
  try {
    const results = await db.batch([
      { sql: 'DELETE FROM scores WHERE game_slug = ?', args: [slug] },
      { sql: 'DELETE FROM votes WHERE game_slug = ?', args: [slug] },
    ])
    res.json({
      ok: true,
      deleted_scores: results[0].rowsAffected,
      deleted_votes: results[1].rowsAffected,
    })
  } catch (err) {
    console.error('Delete game data error:', err)
    res.status(500).json({ error: 'db_error' })
  }
})

export default router
