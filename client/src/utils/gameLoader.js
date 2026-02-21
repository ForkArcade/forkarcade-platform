// gameLoader.js — Load game scripts directly into the page (no iframe)
// Eliminates Chromium double-compositor lag on integrated GPUs.

const INPUT_EVENTS = ['keydown', 'keyup', 'mousemove', 'click', 'mousedown', 'mouseup']

function loadScript(src, container) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script')
    el.src = src
    el.onload = resolve
    el.onerror = () => reject(new Error(`Failed to load ${src}`))
    container.appendChild(el)
  })
}

/**
 * Load a game's scripts directly into the platform page.
 *
 * @param {HTMLElement} container - div wrapping the <canvas id="game">
 * @param {string} gameBaseUrl - e.g. "/local-games/deep-protocol/" or "https://forkarcade.github.io/deep-protocol/"
 * @param {object} callbacks - { slug, version, onSubmitScore, onGetPlayer, onNarrative }
 * @returns {Promise<() => void>} cleanup function
 */
export async function loadGame(container, gameBaseUrl, callbacks) {
  // Ensure trailing slash
  if (!gameBaseUrl.endsWith('/')) gameBaseUrl += '/'

  // 1. Snapshot window keys for cleanup
  const preKeys = new Set(Object.keys(window))

  // 2. Patch document.addEventListener to redirect input events to container
  const trackedListeners = []
  const origDocAdd = document.addEventListener.bind(document)
  const origDocRemove = document.removeEventListener.bind(document)

  document.addEventListener = function (type, handler, options) {
    if (INPUT_EVENTS.includes(type)) {
      container.addEventListener(type, handler, options)
      trackedListeners.push({ target: container, type, handler, options })
    } else {
      origDocAdd(type, handler, options)
      trackedListeners.push({ target: document, type, handler, options })
    }
  }
  document.removeEventListener = function (type, handler, options) {
    if (INPUT_EVENTS.includes(type)) {
      container.removeEventListener(type, handler, options)
    } else {
      origDocRemove(type, handler, options)
    }
  }

  // 3. Patch AudioContext to track instances
  const audioContexts = []
  const OrigAudioContext = window.AudioContext
  window.AudioContext = function (...args) {
    const ctx = new OrigAudioContext(...args)
    audioContexts.push(ctx)
    return ctx
  }
  // Copy static properties
  if (OrigAudioContext) {
    Object.setPrototypeOf(window.AudioContext, OrigAudioContext)
    window.AudioContext.prototype = OrigAudioContext.prototype
  }

  // 4. Inject bridge SDK (replaces forkarcade-sdk.js)
  window.ForkArcade = {
    submitScore(score) {
      if (typeof score !== 'number' || !isFinite(score) || score < 0 || score > 1000000000) {
        return Promise.reject(new Error('Invalid score'))
      }
      return callbacks.onSubmitScore(score)
    },
    getPlayer() {
      return callbacks.onGetPlayer()
    },
    updateNarrative(data) {
      if (data) callbacks.onNarrative(data)
    },
    onReady(cb) {
      cb({ slug: callbacks.slug, version: callbacks.version })
    },
    sdkVersion: 1,
  }

  // 5. Fetch, parse, and load scripts (with guaranteed patch restore)
  try {
    const html = await fetch(gameBaseUrl + 'index.html').then(r => {
      if (!r.ok) throw new Error(`Game not found (${r.status})`)
      return r.text()
    })

    const doc = new DOMParser().parseFromString(html, 'text/html')
    const scriptEls = doc.querySelectorAll('script[src]')
    const scripts = []
    for (const el of scriptEls) {
      const src = el.getAttribute('src').split('?')[0] // strip cache-bust params
      if (src.includes('forkarcade-sdk')) continue // skip SDK, we injected the bridge
      scripts.push(src)
    }

    // Load scripts sequentially
    for (const src of scripts) {
      await loadScript(gameBaseUrl + src, container)
      // Fix spritesheet URL after sprites.js loads
      if (src === 'sprites.js' && window.SPRITESHEET) {
        window.SPRITESHEET.src = gameBaseUrl + '_spritesheet.png'
      }
    }

    // Send initial sprite/map data from localStorage
    callbacks.onLoaded?.()
  } finally {
    // Restore patches (even on error)
    document.addEventListener = origDocAdd
    document.removeEventListener = origDocRemove
    window.AudioContext = OrigAudioContext
  }

  // 9. Return cleanup function
  return function cleanup() {
    // Stop game loop
    if (window.FA && window.FA.stop) window.FA.stop()

    // Close audio contexts
    for (const ctx of audioContexts) {
      try { ctx.close() } catch {}
    }

    // Remove tracked event listeners
    for (const { target, type, handler, options } of trackedListeners) {
      try { target.removeEventListener(type, handler, options) } catch {}
    }

    // Remove script elements
    const scriptEls = container.querySelectorAll('script')
    for (const el of scriptEls) el.remove()

    // Clean up globals added by game scripts
    for (const key of Object.keys(window)) {
      if (!preKeys.has(key)) {
        try { delete window[key] } catch {}
      }
    }
  }
}
