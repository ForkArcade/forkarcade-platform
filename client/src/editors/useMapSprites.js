import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { gameFileUrl } from '../api'
import { spriteToDataUrl, hydrateSpriteDefs } from '../utils/sprite'
import { storageKey } from '../utils/storage'

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
    const saved = localStorage.getItem(storageKey.sprites(slug))
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed._format === 'png-hydrated' && parsed._atlas) {
          // Character grids + atlas — load directly, no image decoding
          formatRef.current = 'png'
          atlasRef.current = parsed._atlas
          const { _format, _atlas, ...defs } = parsed
          setSpriteDefs(defs)
          setHasLocalEdits(true)
          spriteInitialRef.current = false
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
    localStorage.removeItem(storageKey.sprites(slug))
    fetchSpritesFromSource()
  }, [slug, fetchSpritesFromSource])

  // Debounced save to localStorage on edit
  useEffect(() => {
    if (!spriteDefs || spriteInitialRef.current) return
    clearTimeout(spriteSaveRef.current)
    spriteSaveRef.current = setTimeout(() => {
      if (formatRef.current === 'png' && atlasRef.current) {
        // Save character grids + atlas — no PNG encoding (fast)
        // Dehydration to PNG happens in GamePage on hot-reload
        const lsData = { _format: 'png-hydrated', _atlas: atlasRef.current, ...spriteDefs }
        localStorage.setItem(storageKey.sprites(slug), JSON.stringify(lsData))
      } else {
        localStorage.setItem(storageKey.sprites(slug), JSON.stringify(spriteDefs))
      }
      setHasLocalEdits(true)
    }, 400)
    return () => clearTimeout(spriteSaveRef.current)
  }, [spriteDefs, slug])

  // Cross-tab hot-reload
  useEffect(() => {
    const lsKey = storageKey.sprites(slug)
    const handler = (e) => {
      if (e.key !== lsKey || !e.newValue) return
      try {
        const parsed = JSON.parse(e.newValue)
        if (parsed._format === 'png-hydrated' && parsed._atlas) {
          const { _format, _atlas, ...defs } = parsed
          setSpriteDefs(defs)
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

  // Per-sprite thumbnail cache — only regenerate the one that changed
  const thumbCacheRef = useRef({})
  const tiles = useMemo(() => {
    const catData = spriteDefs?.[activeCategory]
    if (!catData) return []
    const cache = thumbCacheRef.current
    const nextCache = {}
    const result = Object.entries(catData)
      .filter(([, def]) => def?.frames)
      .map(([name, def]) => {
        const key = activeCategory + '/' + name
        const framesKey = def.frames[0]?.join('') || ''
        let thumb
        if (cache[key] && cache[key].k === framesKey) {
          nextCache[key] = cache[key]
          thumb = cache[key].url
        } else {
          thumb = spriteToDataUrl(def, 24, 0)
          nextCache[key] = { k: framesKey, url: thumb }
        }
        return { name, label: name.replace(/_/g, ' '), def, thumb }
      })
    thumbCacheRef.current = nextCache
    return result
  }, [spriteDefs, activeCategory])

  const activeFrameThumbs = useMemo(() => {
    const tile = tiles[activeTile]
    if (!tile || tile.def.frames.length <= 1) return []
    return tile.def.frames.map((_, fi) => spriteToDataUrl(tile.def, 20, fi))
  }, [tiles, activeTile, spriteDefs])

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
