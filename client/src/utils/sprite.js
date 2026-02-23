export function nextPaletteKey(palette) {
  const letters = 'abcdefghijklmnopqrstuvwxyz'
  for (const ch of letters) {
    if (!palette[ch]) return ch
  }
  for (let i = 1; i <= 9; i++) {
    if (!palette[String(i)]) return String(i)
  }
  return null
}

export function setPixel(frame, row, col, ch) {
  const line = frame[row]
  return line.substring(0, col) + ch + line.substring(col + 1)
}

// drawSprite — THE canonical sprite rendering function.
// Same logic as engine fa-renderer.js drawSprite.
// Tiles (def.tiling set): crop to tile area (below origin), fill size×size at (x,y).
// Objects/characters: render full sprite with origin offset for overlap.
export function drawSprite(ctx, def, x, y, size, frame) {
  if (!def?.frames?.length) return
  frame = (frame || 0) % def.frames.length
  const sw = def.w || size, sh = def.h || size
  const origin = def.origin || [0, 0]
  const oy = origin[1] || 0
  const isTile = !!def.tiling
  const srcY = isTile ? oy : 0
  const srcH = isTile ? (sh - oy) : sh
  const scaleW = size / sw
  const scaleH = isTile ? (size / srcH) : (size / sw)
  const dw = Math.ceil(sw * scaleW)
  const dh = Math.ceil(srcH * scaleH)
  const drawX = isTile ? x : x - (origin[0] || 0) * scaleW
  const drawY = isTile ? y : y - oy * (size / sw)
  const f = def.frames[frame]
  if (!f) return
  for (let r = srcY; r < sh; r++) {
    const line = f[r]
    if (!line) continue
    for (let c = 0; c < sw; c++) {
      const ch = line[c]
      if (ch === '.') continue
      const color = def.palette?.[ch]
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(drawX + c * scaleW, drawY + (r - srcY) * scaleH, Math.ceil(scaleW), Math.ceil(scaleH))
    }
  }
}

// === PNG spritesheet ↔ character grid conversion ===

const PALETTE_KEYS = 'abcdefghijklmnopqrstuvwxyz123456789'

function rgbToHex(r, g, b) {
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
}

/**
 * Hydrate PNG atlas into editable character-grid sprite defs.
 * @param {object} atlas — parsed _sprites.json with { sheet, tiles, objects, ... }
 * @param {HTMLImageElement} sheetImg — loaded spritesheet image
 * @returns {object} — SPRITE_DEFS in character-grid format (same as legacy)
 */
export function hydrateSpriteDefs(atlas, sheetImg) {
  const { cols, frameW, frameH } = atlas.sheet
  const cv = document.createElement('canvas')
  cv.width = sheetImg.width
  cv.height = sheetImg.height
  const ctx = cv.getContext('2d')
  ctx.drawImage(sheetImg, 0, 0)

  const defs = {}
  for (const cat of Object.keys(atlas)) {
    if (cat === 'sheet') continue
    defs[cat] = {}
    for (const [name, entry] of Object.entries(atlas[cat])) {
      // Collect unique colors across all frames
      const colorMap = new Map() // 'r,g,b' → hex
      const framePixels = [] // array of ImageData per frame

      const ew = entry.w || frameW, eh = entry.h || frameH

      for (const idx of entry.frames) {
        const sx = (idx % cols) * frameW
        const sy = Math.floor(idx / cols) * frameH
        const imgData = ctx.getImageData(sx, sy, ew, eh)
        framePixels.push(imgData)
        for (let i = 0; i < imgData.data.length; i += 4) {
          if (imgData.data[i + 3] < 128) continue
          const key = `${imgData.data[i]},${imgData.data[i + 1]},${imgData.data[i + 2]}`
          if (!colorMap.has(key)) colorMap.set(key, rgbToHex(imgData.data[i], imgData.data[i + 1], imgData.data[i + 2]))
        }
      }

      // Build palette
      const palette = {}
      const colorToKey = new Map()
      let ki = 0
      for (const [rgb, hex] of colorMap) {
        const pk = PALETTE_KEYS[ki++]
        if (!pk) { console.warn(`[sprite] ${cat}/${name}: ${colorMap.size} colors exceed palette limit (${PALETTE_KEYS.length})`); break }
        palette[pk] = hex
        colorToKey.set(rgb, pk)
      }

      // Convert frames to character grids
      const frames = framePixels.map(imgData => {
        const lines = []
        for (let r = 0; r < eh; r++) {
          let line = ''
          for (let c = 0; c < ew; c++) {
            const i = (r * ew + c) * 4
            if (imgData.data[i + 3] < 128) { line += '.'; continue }
            const rgb = `${imgData.data[i]},${imgData.data[i + 1]},${imgData.data[i + 2]}`
            line += colorToKey.get(rgb) || '.'
          }
          lines.push(line)
        }
        return lines
      })

      // Spread all atlas fields (w, h, origin, tiling, etc), override with hydrated data
      defs[cat][name] = { ...entry, palette, frames }
    }
  }
  return defs
}

/**
 * Dehydrate character-grid sprite defs back to PNG spritesheet data URL.
 * @param {object} spriteDefs — SPRITE_DEFS in character-grid format
 * @param {object} atlas — original atlas with frame indices
 * @returns {string} — data URL of spritesheet PNG
 */
export function dehydrateToSheet(spriteDefs, atlas) {
  const { cols, frameW, frameH } = atlas.sheet
  // Count total frames and find max sprite height to determine canvas size
  let maxIdx = 0
  let maxH = frameH
  for (const cat of Object.keys(atlas)) {
    if (cat === 'sheet') continue
    for (const entry of Object.values(atlas[cat])) {
      for (const idx of entry.frames) if (idx > maxIdx) maxIdx = idx
      if (entry.h > maxH) maxH = entry.h
    }
  }
  const totalFrames = maxIdx + 1
  const rows = Math.ceil(totalFrames / cols)
  const cv = document.createElement('canvas')
  cv.width = cols * frameW
  cv.height = rows * maxH
  const ctx = cv.getContext('2d')

  for (const cat of Object.keys(atlas)) {
    if (cat === 'sheet') continue
    for (const [name, entry] of Object.entries(atlas[cat])) {
      const def = spriteDefs[cat]?.[name]
      if (!def?.palette || !def?.frames) continue
      for (let fi = 0; fi < entry.frames.length; fi++) {
        const idx = entry.frames[fi]
        const dx = (idx % cols) * frameW
        const dy = Math.floor(idx / cols) * frameH
        const charFrame = def.frames[fi]
        if (!charFrame) continue
        for (let r = 0; r < def.h; r++) {
          const line = charFrame[r]
          if (!line) continue
          for (let c = 0; c < def.w; c++) {
            const ch = line[c]
            if (ch === '.') continue
            const color = def.palette[ch]
            if (!color) continue
            ctx.fillStyle = color
            ctx.fillRect(dx + c, dy + r, 1, 1)
          }
        }
      }
    }
  }
  return cv.toDataURL('image/png')
}

export function spriteToDataUrl(def, size, frameIdx = 0) {
  if (!def?.w || !def?.h || !def?.frames || !def?.palette) return null
  try {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    drawSprite(ctx, def, 0, 0, size, frameIdx)
    return canvas.toDataURL()
  } catch { return null }
}
