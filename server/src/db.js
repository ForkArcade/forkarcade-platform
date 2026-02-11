import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

export async function initDb() {
  await client.batch([
    `CREATE TABLE IF NOT EXISTS users (
      github_user_id INTEGER PRIMARY KEY,
      login TEXT,
      avatar TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      github_user_id INTEGER,
      game_slug TEXT NOT NULL,
      score INTEGER,
      version INTEGER,
      created_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_scores_game_slug ON scores(game_slug)`,
    `CREATE INDEX IF NOT EXISTS idx_scores_game_version ON scores(game_slug, version)`,
  ])
}

export default client
