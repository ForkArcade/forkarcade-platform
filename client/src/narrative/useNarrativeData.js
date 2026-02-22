import { useState, useRef, useEffect, useCallback } from 'react'
import { gameFileUrl } from '../api'
import { storageKey } from '../utils/storage'

const EMPTY_NARRATIVE = {
  graphs: { arc: { startNode: 'start', nodes: [{ id: 'start', label: 'Start', type: 'scene' }], edges: [] } },
  variables: {},
  actors: {},
  scenes: [],
  content: {},
  simulation: {},
}

export function useNarrativeData(slug) {
  const [data, setData] = useState(null)
  const [hasLocalEdits, setHasLocalEdits] = useState(false)
  const initialRef = useRef(true)
  const saveRef = useRef(null)

  const fetchFromSource = useCallback(() => {
    initialRef.current = true
    fetch(gameFileUrl(slug, '_narrative.json'))
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setData(d || structuredClone(EMPTY_NARRATIVE))
        setHasLocalEdits(false)
        initialRef.current = false
      })
      .catch(() => {
        setData(structuredClone(EMPTY_NARRATIVE))
        setHasLocalEdits(false)
        initialRef.current = false
      })
  }, [slug])

  // Load: localStorage first, then source
  useEffect(() => {
    initialRef.current = true
    const saved = localStorage.getItem(storageKey.narrative(slug))
    if (saved) {
      try {
        setData(JSON.parse(saved))
        setHasLocalEdits(true)
        initialRef.current = false
        return
      } catch {}
    }
    fetchFromSource()
  }, [slug, fetchFromSource])

  const resetToPublished = useCallback(() => {
    localStorage.removeItem(storageKey.narrative(slug))
    fetchFromSource()
  }, [slug, fetchFromSource])

  // Debounced save to localStorage
  useEffect(() => {
    if (!data || initialRef.current) return
    clearTimeout(saveRef.current)
    saveRef.current = setTimeout(() => {
      localStorage.setItem(storageKey.narrative(slug), JSON.stringify(data))
      setHasLocalEdits(true)
    }, 400)
    return () => clearTimeout(saveRef.current)
  }, [data, slug])

  const update = useCallback((mutator) => {
    setData(prev => {
      if (!prev) return prev
      const next = structuredClone(prev)
      mutator(next)
      return next
    })
  }, [])

  return { data, setData, update, hasLocalEdits, resetToPublished }
}
