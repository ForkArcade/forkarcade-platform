import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

import authRouter from './auth.js'
import scoresRouter from './routes/scores.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }))

// Serve SDK as static file
app.use('/sdk', express.static(path.join(__dirname, 'public')))

app.use(authRouter)
app.use(scoresRouter)

app.listen(process.env.PORT, () => console.log('API running'))
