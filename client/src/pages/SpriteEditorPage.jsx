import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { GITHUB_ORG, githubRawUrl } from '../api'
import { T } from '../theme'
import { SectionHeading } from '../components/ui'
import { spriteToDataUrl, nextPaletteKey, setPixel } from '../utils/sprite'
import PixelGrid from '../components/PixelGrid'
import PalettePanel from '../components/PalettePanel'
import FramesPanel from '../components/FramesPanel'
import SpriteSidebar from '../components/SpriteSidebar'

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

export default function SpriteEditorPage() {
  const { slug } = useParams()
  const [sprites, setSprites] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [activeCat, setActiveCat] = useState(null)
  const [activeName, setActiveName] = useState(null)
  const [activeFrame, setActiveFrame] = useState(0)
  const [activeColor, setActiveColor] = useState('.')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setSprites(null)
    setLoadError(false)
    fetch(githubRawUrl(`${GITHUB_ORG}/${slug}/main/_sprites.json`))
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setLoadError(true); return }
        setSprites(data)
        const cats = Object.keys(data)
        if (cats.length > 0) {
          setActiveCat(cats[0])
          const names = Object.keys(data[cats[0]])
          if (names.length > 0) setActiveName(names[0])
        }
      })
      .catch(() => setLoadError(true))
  }, [slug])

  const def = sprites && activeCat && activeName ? sprites[activeCat]?.[activeName] : null

  const sidebarThumbs = useMemo(() => {
    if (!sprites) return {}
    const result = {}
    for (const cat of Object.keys(sprites)) {
      for (const name of Object.keys(sprites[cat])) {
        const d = sprites[cat][name]
        if (d?.frames) result[`${cat}/${name}`] = spriteToDataUrl(d, 24, 0)
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

  const handleCopy = useCallback(() => {
    if (!sprites) return
    navigator.clipboard.writeText(JSON.stringify(sprites, null, 2)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [sprites])

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
        onCopy={handleCopy}
        copied={copied}
      />

      {/* CENTER: Pixel Grid */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: T.sp[6], overflow: 'auto' }}>
        {def ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: T.sp[3], marginBottom: T.sp[4] }}>
              <span style={{ fontSize: T.fontSize.sm, fontWeight: T.weight.semibold, color: T.textBright, fontFamily: T.mono }}>{activeName}</span>
              <span style={{ fontSize: T.fontSize.xs, color: T.muted }}>{def.w}x{def.h} — frame {activeFrame}</span>
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
