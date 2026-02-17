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

export function spriteToDataUrl(def, size, frameIdx = 0) {
  if (!def?.w || !def?.h || !def?.frames || !def?.palette) return null
  try {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const pw = size / def.w
    const ph = size / def.h
    const pixels = def.frames[frameIdx]
    if (!pixels) return null
    for (let row = 0; row < def.h; row++) {
      const line = pixels[row]
      if (!line) continue
      for (let col = 0; col < def.w; col++) {
        const ch = line[col]
        if (ch === '.') continue
        const color = def.palette[ch]
        if (!color) continue
        ctx.fillStyle = color
        ctx.fillRect(col * pw, row * ph, Math.ceil(pw), Math.ceil(ph))
      }
    }
    return canvas.toDataURL()
  } catch { return null }
}
