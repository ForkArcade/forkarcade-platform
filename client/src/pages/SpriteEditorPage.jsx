import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { apiFetch, GITHUB_ORG, githubRawUrl } from '../api'
import { T } from '../theme'
import { SectionHeading, smallBtnStyle } from '../components/ui'
import { spriteToDataUrl, nextPaletteKey, setPixel } from '../utils/sprite'
import PixelGrid from '../components/PixelGrid'
import PalettePanel from '../components/PalettePanel'
import FramesPanel from '../components/FramesPanel'
import SpriteSidebar from '../components/SpriteSidebar'
import { Undo2 } from 'lucide-react'

const LS_KEY = slug => `fa-sprites-${slug}`

const inputStyle = {
  width: 48,
  height: 24,
  background: T.surface,
  color: T.textBright,
  border: `1px solid ${T.border}`,
  borderRadius: T.radius.sm,
  padding: `0 ${T.sp[2]}px`,
  fontSize: T.fontSize.xs,
  fontFamily: T.mono,
  textAlign: 'center',
  outline: 'none',
}

export default function SpriteEditorPage({ user }) {
  const { slug } = useParams()
  const [sprites, setSprites] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [hasLocalEdits, setHasLocalEdits] = useState(false)
  const [activeCat, setActiveCat] = useState(null)
  const [activeName, setActiveName] = useState(null)
  const [activeFrame, setActiveFrame] = useState(0)
  const [activeColor, setActiveColor] = useState('.')
  const initialLoadRef = useRef(true)

  function initSelection(data) {
    const cats = Object.keys(data)
    if (cats.length > 0) {
      setActiveCat(cats[0])
      const names = Object.keys(data[cats[0]])
      if (names.length > 0) setActiveName(names[0])
    }
  }

  useEffect(() => {
    setSprites(null)
    setLoadError(false)
    initialLoadRef.current = true

    // Try localStorage first
    const saved = localStorage.getItem(LS_KEY(slug))
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setSprites(data)
        setHasLocalEdits(true)
        initSelection(data)
        initialLoadRef.current = false
        return
      } catch (e) {
        localStorage.removeItem(LS_KEY(slug))
      }
    }

    fetch(githubRawUrl(`${GITHUB_ORG}/${slug}/main/_sprites.json`))
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setLoadError(true); return }
        setSprites(data)
        setHasLocalEdits(false)
        initSelection(data)
        initialLoadRef.current = false
      })
      .catch(() => setLoadError(true))
  }, [slug])

  // Save to localStorage on every edit (skip initial load)
  useEffect(() => {
    if (!sprites || initialLoadRef.current) return
    localStorage.setItem(LS_KEY(slug), JSON.stringify(sprites))
    setHasLocalEdits(true)
  }, [sprites, slug])

  const handleDiscard = useCallback(() => {
    localStorage.removeItem(LS_KEY(slug))
    setHasLocalEdits(false)
    initialLoadRef.current = true
    fetch(githubRawUrl(`${GITHUB_ORG}/${slug}/main/_sprites.json`))
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        setSprites(data)
        initSelection(data)
        initialLoadRef.current = false
      })
      .catch(() => {})
  }, [slug])

  const def = sprites && activeCat && activeName ? sprites[activeCat]?.[activeName] : null

  const thumbCacheRef = useRef({})
  const sidebarThumbs = useMemo(() => {
    if (!sprites) return {}
    const cache = thumbCacheRef.current
    const result = {}
    for (const cat of Object.keys(sprites)) {
      for (const name of Object.keys(sprites[cat])) {
        const d = sprites[cat][name]
        if (!d?.frames) continue
        const key = `${cat}/${name}`
        if (cache[key]?.def === d) {
          result[key] = cache[key].url
        } else {
          const url = spriteToDataUrl(d, 24, 0)
          result[key] = url
          cache[key] = { def: d, url }
        }
      }
    }
    return result
  }, [sprites])

  const update = useCallback((mutator) => {
    setSprites(prev => {
      const prevDef = prev[activeCat][activeName]
      const newDef = {
        ...prevDef,
        palette: { ...prevDef.palette },
        frames: prevDef.frames.map(f => [...f]),
        origin: prevDef.origin ? [...prevDef.origin] : undefined,
      }
      mutator(newDef)
      return {
        ...prev,
        [activeCat]: {
          ...prev[activeCat],
          [activeName]: newDef,
        },
      }
    })
  }, [activeCat, activeName])

  const handlePaint = useCallback((row, col, ch) => {
    update(d => {
      d.frames[activeFrame][row] = setPixel(d.frames[activeFrame], row, col, ch)
    })
  }, [update, activeFrame])

  const handleColorChange = useCallback((key, color) => {
    update(d => { d.palette[key] = color })
  }, [update])

  const handleAddColor = useCallback(() => {
    update(d => {
      const key = nextPaletteKey(d.palette)
      if (key) {
        d.palette[key] = '#888888'
        setActiveColor(key)
      }
    })
  }, [update])

  const handleRemoveColor = useCallback((key) => {
    update(d => {
      delete d.palette[key]
      for (let f = 0; f < d.frames.length; f++) {
        d.frames[f] = d.frames[f].map(line => line.split('').map(ch => ch === key ? '.' : ch).join(''))
      }
      if (activeColor === key) setActiveColor('.')
    })
  }, [update, activeColor])

  const handleAddFrame = useCallback(() => {
    update(d => {
      const emptyLine = '.'.repeat(d.w)
      const frame = Array.from({ length: d.h }, () => emptyLine)
      d.frames.push(frame)
      setActiveFrame(d.frames.length - 1)
    })
  }, [update])

  const handleDuplicateFrame = useCallback(() => {
    update(d => {
      const dup = d.frames[activeFrame].map(l => l)
      d.frames.push(dup)
      setActiveFrame(d.frames.length - 1)
    })
  }, [update, activeFrame])

  const handleRemoveFrame = useCallback(() => {
    update(d => {
      d.frames.splice(activeFrame, 1)
      setActiveFrame(Math.min(activeFrame, d.frames.length - 1))
    })
  }, [update, activeFrame])

  const handleOriginChange = useCallback((axis, val) => {
    update(d => {
      if (!d.origin) d.origin = [0, 0]
      d.origin[axis] = val
    })
  }, [update])

  // Paste image from clipboard → extract colors → build palette → update frame
  useEffect(() => {
    const PALETTE_KEYS = '123456789abcdefghijklmnopqrstuvwxyz'

    function rgbToHex(r, g, b) {
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
    }

    function colorDist(a, b) {
      return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
    }

    // Merge closest pair of colors until count fits maxColors
    function reduceColors(colors, maxColors) {
      const entries = colors.map(c => ({ rgb: c, count: 1 }))
      while (entries.length > maxColors) {
        let bestI = 0, bestJ = 1, bestDist = Infinity
        for (let i = 0; i < entries.length; i++) {
          for (let j = i + 1; j < entries.length; j++) {
            const d = colorDist(entries[i].rgb, entries[j].rgb)
            if (d < bestDist) { bestDist = d; bestI = i; bestJ = j }
          }
        }
        // Weighted average merge
        const a = entries[bestI], b = entries[bestJ]
        const total = a.count + b.count
        a.rgb = [
          Math.round((a.rgb[0] * a.count + b.rgb[0] * b.count) / total),
          Math.round((a.rgb[1] * a.count + b.rgb[1] * b.count) / total),
          Math.round((a.rgb[2] * a.count + b.rgb[2] * b.count) / total),
        ]
        a.count = total
        entries.splice(bestJ, 1)
      }
      return entries.map(e => e.rgb)
    }

    function onPaste(e) {
      if (!def || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const items = e.clipboardData?.items
      if (!items) return
      let imageItem = null
      for (const item of items) {
        if (item.type.startsWith('image/')) { imageItem = item; break }
      }
      if (!imageItem) return
      e.preventDefault()

      const blob = imageItem.getAsFile()
      const img = new Image()
      img.onload = () => {
        const cv = document.createElement('canvas')
        cv.width = def.w
        cv.height = def.h
        const cc = cv.getContext('2d')
        cc.imageSmoothingEnabled = false
        cc.drawImage(img, 0, 0, def.w, def.h)
        const imgData = cc.getImageData(0, 0, def.w, def.h).data

        // Collect unique opaque colors
        const seen = new Map() // "r,g,b" → [r, g, b]
        for (let i = 0; i < imgData.length; i += 4) {
          if (imgData[i + 3] < 128) continue
          const key = `${imgData[i]},${imgData[i + 1]},${imgData[i + 2]}`
          if (!seen.has(key)) seen.set(key, [imgData[i], imgData[i + 1], imgData[i + 2]])
        }

        let uniqueColors = [...seen.values()]
        if (uniqueColors.length === 0) {
          update(d => {
            d.frames[activeFrame] = Array.from({ length: def.h }, () => '.'.repeat(def.w))
          })
          URL.revokeObjectURL(img.src)
          return
        }

        // Reduce if too many colors for palette keys
        const maxColors = PALETTE_KEYS.length
        if (uniqueColors.length > maxColors) {
          uniqueColors = reduceColors(uniqueColors, maxColors)
        }

        // Build new palette
        const newPalette = {}
        const finalColors = uniqueColors.map((rgb, i) => ({
          key: PALETTE_KEYS[i],
          rgb,
          hex: rgbToHex(...rgb),
        }))
        for (const c of finalColors) newPalette[c.key] = c.hex

        // Map pixels to nearest palette color
        const newLines = []
        for (let row = 0; row < def.h; row++) {
          let line = ''
          for (let col = 0; col < def.w; col++) {
            const i = (row * def.w + col) * 4
            if (imgData[i + 3] < 128) { line += '.'; continue }
            const rgb = [imgData[i], imgData[i + 1], imgData[i + 2]]
            let best = finalColors[0]
            let bestDist = Infinity
            for (const c of finalColors) {
              const d = colorDist(rgb, c.rgb)
              if (d < bestDist) { bestDist = d; best = c }
            }
            line += best.key
          }
          newLines.push(line)
        }

        update(d => {
          d.palette = newPalette
          d.frames[activeFrame] = newLines
        })
        URL.revokeObjectURL(img.src)
      }
      img.src = URL.createObjectURL(blob)
    }

    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [def, activeFrame, update])

  const handlePropose = useCallback(async (title) => {
    const body = `Sprite changes proposed from the editor.\n\n<details>\n<summary>_sprites.json</summary>\n\n\`\`\`json\n${JSON.stringify(sprites, null, 2)}\n\`\`\`\n\n</details>`
    return apiFetch(`/api/games/${slug}/evolve-issues`, {
      method: 'POST',
      body: JSON.stringify({ title, body, category: 'visual' }),
    })
  }, [slug, sprites])

  const handleSelectSprite = useCallback((cat, name) => {
    setActiveCat(cat)
    setActiveName(name)
    setActiveFrame(0)
    const d = sprites?.[cat]?.[name]
    if (d?.palette && activeColor !== '.' && !d.palette[activeColor]) {
      const keys = Object.keys(d.palette)
      if (keys.length > 0) setActiveColor(keys[0])
    }
  }, [sprites, activeColor])

  if (loadError) {
    return <div style={{ padding: T.sp[7], color: T.muted, fontSize: T.fontSize.sm }}>No _sprites.json found for {slug}</div>
  }
  if (!sprites) {
    return <div style={{ padding: T.sp[7], color: T.muted, fontSize: T.fontSize.sm }}>Loading sprites...</div>
  }

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      <SpriteSidebar
        slug={slug}
        sprites={sprites}
        sidebarThumbs={sidebarThumbs}
        activeCat={activeCat}
        activeName={activeName}
        onSelect={handleSelectSprite}
        hasLocalEdits={hasLocalEdits}
        onReset={handleDiscard}
        user={user}
        onPropose={handlePropose}
      />

      {/* CENTER: Pixel Grid */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: T.sp[6], overflow: 'auto' }}>
        {def ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: T.sp[3], marginBottom: T.sp[4] }}>
              <span style={{ fontSize: T.fontSize.sm, fontWeight: T.weight.semibold, color: T.textBright, fontFamily: T.mono }}>{activeName}</span>
              <span style={{ fontSize: T.fontSize.xs, color: T.muted }}>{def.w}x{def.h} — frame {activeFrame}</span>
              {hasLocalEdits && (
                <>
                  <span style={{ fontSize: 9, color: T.accentColor, fontFamily: T.mono, marginLeft: 'auto' }}>local edits</span>
                  <button onClick={handleDiscard} style={{ ...smallBtnStyle, height: 22, padding: `0 ${T.sp[3]}px`, color: T.muted }} title="Discard local edits">
                    <Undo2 size={11} /> Discard
                  </button>
                </>
              )}
            </div>
            <PixelGrid def={def} frameIdx={activeFrame} activeColor={activeColor} onPaint={handlePaint} />
          </div>
        ) : (
          <div style={{ color: T.muted, fontSize: T.fontSize.sm }}>Select a sprite</div>
        )}
      </div>

      {/* RIGHT: Palette + Origin + Frames */}
      {def && (
        <div style={{
          width: 200,
          minWidth: 200,
          borderLeft: `1px solid ${T.border}`,
          overflow: 'auto',
          padding: T.sp[4],
          display: 'flex',
          flexDirection: 'column',
          gap: T.sp[5],
        }}>
          <div>
            <SectionHeading>Palette</SectionHeading>
            <PalettePanel
              palette={def.palette}
              activeColor={activeColor}
              onSelect={setActiveColor}
              onColorChange={handleColorChange}
              onAdd={handleAddColor}
              onRemove={handleRemoveColor}
            />
          </div>

          <div>
            <SectionHeading>Origin</SectionHeading>
            <div style={{ display: 'flex', alignItems: 'center', gap: T.sp[3] }}>
              <label style={{ fontSize: T.fontSize.xs, color: T.muted }}>x</label>
              <input
                type="number"
                min={0}
                max={def.w - 1}
                value={(def.origin || [0, 0])[0]}
                onChange={e => handleOriginChange(0, parseInt(e.target.value) || 0)}
                style={inputStyle}
              />
              <label style={{ fontSize: T.fontSize.xs, color: T.muted }}>y</label>
              <input
                type="number"
                min={0}
                max={def.h - 1}
                value={(def.origin || [0, 0])[1]}
                onChange={e => handleOriginChange(1, parseInt(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <SectionHeading>Frames ({def.frames.length})</SectionHeading>
            <FramesPanel
              def={def}
              activeFrame={activeFrame}
              onSelect={setActiveFrame}
              onAdd={handleAddFrame}
              onDuplicate={handleDuplicateFrame}
              onRemove={handleRemoveFrame}
            />
          </div>
        </div>
      )}
    </div>
  )
}
