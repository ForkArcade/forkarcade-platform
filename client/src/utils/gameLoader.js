// gameLoader.js — Load game scripts directly into the page (no iframe)

function loadScript(src, container) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script')
    el.src = src
    el.onload = resolve
    el.onerror = () => reject(new Error(`Failed to load ${src}`))
    container.appendChild(el)
  })
}

export async function loadGame(container, gameBaseUrl, callbacks) {
  if (!gameBaseUrl.endsWith('/')) gameBaseUrl += '/'

  const preKeys = new Set(Object.keys(window))
  const audioContexts = []
  const OrigAudioContext = window.AudioContext

  window.AudioContext = function (...args) {
    const ctx = new OrigAudioContext(...args)
    audioContexts.push(ctx)
    return ctx
  }
  if (OrigAudioContext) {
    Object.setPrototypeOf(window.AudioContext, OrigAudioContext)
    window.AudioContext.prototype = OrigAudioContext.prototype
  }

  window.ForkArcade = {
    submitScore: (score) => callbacks.onSubmitScore(score),
    getPlayer: () => callbacks.onGetPlayer(),
    updateNarrative: (data) => { if (data) callbacks.onNarrative(data) },
    onReady: (cb) => cb({ slug: callbacks.slug, version: callbacks.version }),
    sdkVersion: 1,
  }

  let resizeObserver = null

  try {
    const html = await fetch(gameBaseUrl + 'index.html').then(r => {
      if (!r.ok) throw new Error(`Game not found (${r.status})`)
      return r.text()
    })
    const scripts = []
    for (const el of new DOMParser().parseFromString(html, 'text/html').querySelectorAll('script[src]')) {
      const src = el.getAttribute('src').split('?')[0]
      if (!src.includes('forkarcade-sdk')) scripts.push(src)
    }

    const canvasEl = container.querySelector('canvas')
    if (canvasEl) {
      const syncSize = () => {
        const w = Math.round(container.clientWidth)
        const h = Math.round(container.clientHeight)
        if (canvasEl.width !== w || canvasEl.height !== h) {
          canvasEl.width = w
          canvasEl.height = h
          if (window.FA) window.FA.emit('canvas:resize', { width: w, height: h })
        }
      }
      syncSize()
      resizeObserver = new ResizeObserver(syncSize)
      resizeObserver.observe(container)
    }

    for (const src of scripts) {
      const url = /^https?:\/\//.test(src) ? src : gameBaseUrl + src
      await loadScript(url, container)

      if (src === 'sprites.js' && window.SPRITESHEET) {
        window.SPRITESHEET.src = gameBaseUrl + '_spritesheet.png'
      }
    }

    callbacks.onLoaded?.()
  } finally {
    window.AudioContext = OrigAudioContext
  }

  return function cleanup() {
    if (resizeObserver) resizeObserver.disconnect()
    if (window.FA?.stop) window.FA.stop()
    for (const ctx of audioContexts) { try { ctx.close() } catch {} }
    for (const el of container.querySelectorAll('script')) el.remove()
    for (const key of Object.keys(window)) {
      if (!preKeys.has(key)) { try { delete window[key] } catch {} }
    }
  }
}
