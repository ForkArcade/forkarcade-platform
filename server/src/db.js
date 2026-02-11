import Database from 'better-sqlite3'

const db = new Database('forkarcade.sqlite')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    github_user_id INTEGER PRIMARY KEY,
    login TEXT,
    avatar TEXT
  );
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    github_user_id INTEGER,
    game_slug TEXT NOT NULL,
    score INTEGER,
    created_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_scores_game_slug ON scores(game_slug);
`)

export default db
