import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { gameFileUrl } from '../api'
import { spriteToDataUrl, hydrateSpriteDefs, dehydrateToSheet } from '../utils/sprite'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export function useMapSprites(slug) {
  const [spriteDefs, setSpriteDefs] = useState(null)
  const [activeCategory, setActiveCategory] = useState('tiles')
  const [hasLocalEdits, setHasLocalEdits] = useState(false)
  const [activeTile, setActiveTile] = useState(0)
  const [activeFrame, setActiveFrame] = useState(0)
  const spriteInitialRef = useRef(true)
  const spriteSaveRef = useRef(null)
  const formatRef = useRef(null)   // 'png' or 'legacy'
  const atlasRef = useRef(null)    // original atlas (for dehydration)

  const fetchSpritesFromSource = useCallback(() => {
    spriteInitialRef.current = true
    fetch(gameFileUrl(slug, '_sprites.json'))
      .then(r => r.ok ? r.json() : null)
      .then(async data => {
        if (!data) return
        if (data.sheet) {
          // PNG atlas format
          formatRef.current = 'png'
          atlasRef.current = data
          const img = await loadImage(gameFileUrl(slug, '_spritesheet.png'))
          const hydrated = hydrateSpriteDefs(data, img)
          setSpriteDefs(hydrated)
        } else {
          // Legacy JSON format
          formatRef.current = 'legacy'
          atlasRef.current = null
          setSpriteDefs(data)
        }
        setHasLocalEdits(false)
        spriteInitialRef.current = false
      })
      .catch(() => {})
  }, [slug])

  // Load sprites: localStorage first, otherwise GitHub
  useEffect(() => {
    spriteInitialRef.current = true
    const saved = localStorage.getItem(`fa-sprites-${slug}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed._format === 'png') {
          formatRef.current = 'png'
          const { _format, _sheetDataUrl, _sheetCols, ...atlas } = parsed
          atlasRef.current = { sheet: { cols: _sheetCols, frameW: atlas.tiles?.[Object.keys(atlas.tiles)[0]]?.w || 10, frameH: atlas.tiles?.[Object.keys(atlas.tiles)[0]]?.h || 10 }, ...atlas }
          loadImage(_sheetDataUrl).then(img => {
            const hydrated = hydrateSpriteDefs(atlasRef.current, img)
            setSpriteDefs(hydrated)
            setHasLocalEdits(true)
            spriteInitialRef.current = false
          }).catch(() => fetchSpritesFromSource())
          return
        }
        formatRef.current = 'legacy'
        atlasRef.current = null
        setSpriteDefs(parsed)
        setHasLocalEdits(true)
        spriteInitialRef.current = false
        return
      } catch {}
    }
    fetchSpritesFromSource()
  }, [slug, fetchSpritesFromSource])

  const resetToPublished = useCallback(() => {
    localStorage.removeItem(`fa-sprites-${slug}`)
    fetchSpritesFromSource()
  }, [slug, fetchSpritesFromSource])

  // Debounced save to localStorage on edit
  useEffect(() => {
    if (!spriteDefs || spriteInitialRef.current) return
    clearTimeout(spriteSaveRef.current)
    spriteSaveRef.current = setTimeout(() => {
      if (formatRef.current === 'png' && atlasRef.current) {
        const dataUrl = dehydrateToSheet(spriteDefs, atlasRef.current)
        const atlas = atlasRef.current
        const lsData = { _format: 'png', _sheetDataUrl: dataUrl, _sheetCols: atlas.sheet.cols }
        for (const cat of Object.keys(atlas)) {
          if (cat === 'sheet') continue
          lsData[cat] = atlas[cat]
        }
        localStorage.setItem(`fa-sprites-${slug}`, JSON.stringify(lsData))
      } else {
        localStorage.setItem(`fa-sprites-${slug}`, JSON.stringify(spriteDefs))
      }
      setHasLocalEdits(true)
    }, 400)
    return () => clearTimeout(spriteSaveRef.current)
  }, [spriteDefs, slug])

  // Cross-tab hot-reload
  useEffect(() => {
    const lsKey = `fa-sprites-${slug}`
    const handler = (e) => {
      if (e.key !== lsKey || !e.newValue) return
      try {
        const parsed = JSON.parse(e.newValue)
        if (parsed._format === 'png') {
          const { _format, _sheetDataUrl, _sheetCols, ...atlas } = parsed
          const fullAtlas = { sheet: { cols: _sheetCols, frameW: 10, frameH: 10 }, ...atlas }
          loadImage(_sheetDataUrl).then(img => {
            setSpriteDefs(hydrateSpriteDefs(fullAtlas, img))
          }).catch(() => {})
        } else {
          setSpriteDefs(parsed)
        }
      } catch {}
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [slug])

  const categories = useMemo(() => {
    if (!spriteDefs) return []
    return Object.keys(spriteDefs).filter(cat =>
      Object.values(spriteDefs[cat]).some(d => d?.frames)
    )
  }, [spriteDefs])

  const tiles = useMemo(() => {
    const catData = spriteDefs?.[activeCategory]
    if (!catData) return []
    return Object.entries(catData)
      .filter(([, def]) => def?.frames)
      .map(([name, def]) => ({
        name,
        label: name.replace(/_/g, ' '),
        def,
        thumb: spriteToDataUrl(def, 24, 0),
      }))
  }, [spriteDefs, activeCategory])

  const activeFrameThumbs = useMemo(() => {
    const tile = tiles[activeTile]
    if (!tile || tile.def.frames.length <= 1) return []
    return tile.def.frames.map((_, fi) => spriteToDataUrl(tile.def, 20, fi))
  }, [tiles, activeTile])

  const handleSpriteUpdate = useCallback((mutator) => {
    const name = tiles[activeTile]?.name
    if (!name) return
    const cat = activeCategory
    setSpriteDefs(prev => {
      const prevDef = prev[cat]?.[name]
      if (!prevDef) return prev
      const newDef = {
        ...prevDef,
        palette: { ...prevDef.palette },
        frames: prevDef.frames.map(f => [...f]),
        origin: prevDef.origin ? [...prevDef.origin] : undefined,
      }
      mutator(newDef)
      return { ...prev, [cat]: { ...prev[cat], [name]: newDef } }
    })
  }, [activeCategory, activeTile, tiles])

  return {
    spriteDefs, setSpriteDefs, hasLocalEdits, resetToPublished,
    categories, tiles, activeCategory, setActiveCategory,
    activeTile, setActiveTile, activeFrame, setActiveFrame,
    activeFrameThumbs, handleSpriteUpdate, spriteInitialRef,
  }
}
