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
    score INTEGER,
    created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    github_repo TEXT,
    github_pages_url TEXT NOT NULL,
    author_github_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (author_github_id) REFERENCES users(github_user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_games_slug ON games(slug);
`)

// Migration: add game_id to existing scores table
try {
  db.exec(`ALTER TABLE scores ADD COLUMN game_id INTEGER REFERENCES games(id)`)
} catch (e) {
  // Column already exists
}

db.exec(`CREATE INDEX IF NOT EXISTS idx_scores_game_id ON scores(game_id)`)

export default db
