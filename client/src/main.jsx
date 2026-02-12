import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

// GitHub Pages SPA: restore path from 404.html redirect
const params = new URLSearchParams(window.location.search)
const redirectPath = params.get('p')
if (redirectPath) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const cleaned = redirectPath.startsWith(base) ? redirectPath.slice(base.length) : redirectPath
  window.history.replaceState(null, '', base + (cleaned || '/'))
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <App />
  </BrowserRouter>
)
