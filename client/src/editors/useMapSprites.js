import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { gameFileUrl } from '../api'
import { spriteToDataUrl } from '../utils/sprite'

export function useMapSprites(slug) {
  const [spriteDefs, setSpriteDefs] = useState(null)
  const [activeCategory, setActiveCategory] = useState('tiles')
  const [hasLocalEdits, setHasLocalEdits] = useState(false)
  const [activeTile, setActiveTile] = useState(0)
  const [activeFrame, setActiveFrame] = useState(0)
  const spriteInitialRef = useRef(true)
  const spriteSaveRef = useRef(null)

  const fetchSpritesFromSource = useCallback(() => {
    spriteInitialRef.current = true
    fetch(gameFileUrl(slug, '_sprites.json'))
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) { setSpriteDefs(data); setHasLocalEdits(false); spriteInitialRef.current = false }
      })
      .catch(() => {})
  }, [slug])

  // Load sprites: localStorage first, otherwise GitHub
  useEffect(() => {
    spriteInitialRef.current = true
    const saved = localStorage.getItem(`fa-sprites-${slug}`)
    if (saved) {
      try { setSpriteDefs(JSON.parse(saved)); setHasLocalEdits(true); spriteInitialRef.current = false; return } catch {}
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
      localStorage.setItem(`fa-sprites-${slug}`, JSON.stringify(spriteDefs))
      setHasLocalEdits(true)
    }, 400)
    return () => clearTimeout(spriteSaveRef.current)
  }, [spriteDefs, slug])

  // Cross-tab hot-reload
  useEffect(() => {
    const lsKey = `fa-sprites-${slug}`
    const handler = (e) => {
      if (e.key === lsKey && e.newValue) {
        try { setSpriteDefs(JSON.parse(e.newValue)) } catch {}
      }
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
