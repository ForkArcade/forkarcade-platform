import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

import { initDb } from './db.js'
import authRouter from './auth.js'
import scoresRouter from './routes/scores.js'
import githubRouter from './routes/github.js'
import walletRouter from './routes/wallet.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(cors({ origin: process.env.CLIENT_ORIGIN || false, credentials: true }))

// Serve SDK as static file (canonical copy in /sdk at project root)
app.use('/sdk', express.static(path.join(__dirname, '../../sdk')))

// Serve local games for dev only (../games/<slug>/)
if (process.env.NODE_ENV !== 'production') {
  app.use('/local-games', express.static(path.join(__dirname, '../../../games')))
}

// Validate :slug parameter across all routes
app.param('slug', (req, res, next, slug) => {
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) return res.status(400).json({ error: 'invalid_slug' })
  next()
})

app.use(authRouter)
app.use(scoresRouter)
app.use(githubRouter)
app.use(walletRouter)

const PORT = parseInt(process.env.PORT, 10) || 8787
const CYAN = '\x1b[36m', YELLOW = '\x1b[33m', DIM = '\x1b[2m', RESET = '\x1b[0m'
const banner = [
  '',
  CYAN + '  █▀▀ █▀█ █▀█ █▄▀',
  '  █▀  █▄█ █▀▄ █ █',
  '',
  '      ▄▀█ █▀█ █▀▀ ▄▀█ █▀▄ █▀▀',
  '      █▀█ █▀▄ █▄▄ █▀█ █▄▀ ██▄' + RESET,
  '',
  `  ${YELLOW}API${RESET}  http://localhost:${PORT}`,
  '',
  `  ${YELLOW}Skills${RESET}`,
  `  ${DIM}New game:${RESET}     cd forkarcade-platform ${DIM}&&${RESET} claude ${DIM}then${RESET} /new-game`,
  `  ${DIM}Edit game:${RESET}    cd ../games/<slug> ${DIM}&&${RESET} claude`,
  `  ${DIM}Evolve:${RESET}       cd ../games/<slug> ${DIM}&&${RESET} claude ${DIM}then${RESET} /evolve`,
  `  ${DIM}Publish:${RESET}      cd ../games/<slug> ${DIM}&&${RESET} claude ${DIM}then${RESET} /publish`,
  '',
  `  ${YELLOW}MCP Tools${RESET}`,
  `  ${DIM}Workflow:${RESET}      list_templates  init_game  validate_game  publish_game`,
  `  ${DIM}             ${RESET} get_sdk_docs  get_game_prompt  update_sdk  list_evolve_issues`,
  `  ${DIM}Assets:${RESET}       get_asset_guide  create_sprite  validate_assets  preview_assets`,
  `  ${DIM}Other:${RESET}        get_versions  create_thumbnail`,
  '',
]

initDb().then(() => {
  app.listen(PORT, () => console.log(banner.join('\n')))
}).catch(err => {
  console.error('Failed to initialize database:', err)
  process.exit(1)
})
