import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import fs from 'fs'
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

initDb().then(() => {
  app.listen(process.env.PORT, () => {
    const readmePath = path.join(__dirname, '../../README.md')
    try {
      console.log('\n' + fs.readFileSync(readmePath, 'utf-8'))
    } catch {
      console.log(`ForkArcade API running on http://localhost:${process.env.PORT}`)
    }
  })
}).catch(err => {
  console.error('Failed to initialize database:', err)
  process.exit(1)
})
