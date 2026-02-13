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

app.use(express.json())
app.use(cookieParser())
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }))

// Serve SDK as static file (canonical copy in /sdk at project root)
app.use('/sdk', express.static(path.join(__dirname, '../../sdk')))

app.use(authRouter)
app.use(scoresRouter)
app.use(githubRouter)
app.use(walletRouter)

const C = '\x1b[36m', Y = '\x1b[33m', D = '\x1b[2m', R = '\x1b[0m'
const banner = [
  '',
  C + '  █▀▀ █▀█ █▀█ █▄▀',
  '  █▀  █▄█ █▀▄ █ █',
  '',
  '      ▄▀█ █▀█ █▀▀ ▄▀█ █▀▄ █▀▀',
  '      █▀█ █▀▄ █▄▄ █▀█ █▄▀ ██▄' + R,
  '',
  `  ${Y}API${R}  http://localhost:${process.env.PORT}`,
  '',
  `  ${D}Nowa gra:${R}     cd forkarcade-platform ${D}&&${R} claude ${D}then${R} /new-game`,
  `  ${D}Edycja gry:${R}   cd ../games/<slug> ${D}&&${R} claude`,
  '',
]

initDb().then(() => {
  app.listen(process.env.PORT, () => console.log(banner.join('\n')))
}).catch(err => {
  console.error('Failed to initialize database:', err)
  process.exit(1)
})
