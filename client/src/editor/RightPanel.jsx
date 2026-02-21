import { useState, useRef, useCallback } from 'react'
import { T, formInput } from '../theme'
import { Button } from '../components/ui'
import { apiFetch } from '../api'
import {
  uid, createEmptyGrid, createEmptyZoneGrid, ZONE_COLORS,
  bakeAllAutotiles, DEFAULT_W, DEFAULT_H,
  levelsToMapDefs, mapDefsToLevels, mergeZoneDefs,
} from './mapUtils'

const numInput = {
  width: 50, padding: T.sp[2],
  background: T.surface, border: `1px solid ${T.border}`,
  borderRadius: T.radius.sm, color: T.textBright,
  fontFamily: T.mono, fontSize: T.fontSize.xs,
}

export default function RightPanel({
  slug, user, levels, setLevels, activeId, setActiveId,
  activeLevel, grid, zoneGrid, zoneDefs, setZoneDefs,
  cols, rows, updateLevel, tiles, spriteDefs, setSpriteDefs, showZones, setShowZones,
  hasLocalMapEdits, resetMaps,
}) {
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef(null)

  const [proposeOpen, setProposeOpen] = useState(false)
  const [proposeTitle, setProposeTitle] = useState('Sprite update')
  const [proposeStatus, setProposeStatus] = useState(null)

  const [mapProposeOpen, setMapProposeOpen] = useState(false)
  const [mapProposeTitle, setMapProposeTitle] = useState('Map update')
  const [mapProposeStatus, setMapProposeStatus] = useState(null)

  // Level CRUD
  const addLevel = () => {
    const id = uid()
    const name = `Level ${levels.length + 1}`
    const g = createEmptyGrid(DEFAULT_W, DEFAULT_H)
    setLevels(prev => [...prev, { id, name, grid: g, frameGrid: g.map(r => r.map(() => 0)), zoneGrid: createEmptyZoneGrid(DEFAULT_W, DEFAULT_H), objects: [] }])
    setActiveId(id)
  }

  const deleteLevel = (id) => {
    if (levels.length <= 1) return
    setLevels(prev => prev.filter(l => l.id !== id))
    if (activeId === id) setActiveId(levels.find(l => l.id !== id).id)
  }

  const duplicateLevel = (level) => {
    const id = uid()
    const dup = {
      id, name: level.name + ' copy',
      grid: level.grid.map(r => [...r]),
      frameGrid: level.frameGrid ? level.frameGrid.map(r => [...r]) : level.grid.map(r => r.map(() => 0)),
      zoneGrid: level.zoneGrid ? level.zoneGrid.map(r => [...r]) : createEmptyZoneGrid(level.grid[0]?.length || DEFAULT_W, level.grid.length || DEFAULT_H),
      objects: level.objects ? level.objects.map(o => ({ ...o })) : [],
    }
    setLevels(prev => [...prev, dup])
    setActiveId(id)
  }

  const startRename = (level) => { setRenamingId(level.id); setRenameValue(level.name) }
  const finishRename = () => {
    if (renamingId && renameValue.trim()) {
      setLevels(prev => prev.map(l => l.id === renamingId ? { ...l, name: renameValue.trim() } : l))
    }
    setRenamingId(null)
  }

  // Resize
  const handleResize = (newW, newH) => {
    const w = Math.max(5, Math.min(80, newW || cols))
    const h = Math.max(5, Math.min(50, newH || rows))
    updateLevel(level => {
      const newGrid = Array.from({ length: h }, (_, y) =>
        Array.from({ length: w }, (_, x) => level.grid[y]?.[x] ?? 1)
      )
      const newZg = Array.from({ length: h }, (_, y) =>
        Array.from({ length: w }, (_, x) => level.zoneGrid?.[y]?.[x] ?? '.')
      )
      // Remove objects outside new bounds
      const objects = (level.objects || []).filter(o => o.x < w && o.y < h)
      return { grid: newGrid, frameGrid: bakeAllAutotiles(newGrid, null, tiles), zoneGrid: newZg, objects }
    })
  }

  // Export — clipboard (data.js snippet)
  const handleExport = () => {
    let text = 'map: [\n' + grid.map(row => `  '${row.join('')}'`).join(',\n') + '\n]'
    if (zoneGrid && zoneDefs.length > 0 && zoneGrid.some(row => row.some(c => c !== '.'))) {
      text += ',\nzones: [\n' + zoneGrid.map(row => `  '${row.join('')}'`).join(',\n') + '\n]'
      const usedKeys = new Set(zoneGrid.flat().filter(c => c !== '.'))
      const defsObj = zoneDefs.filter(z => usedKeys.has(z.key)).map(z => `${z.key}: '${z.name}'`).join(', ')
      text += `,\nzoneDefs: { ${defsObj} }`
    }
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  // Export — download _maps.json
  const handleDownloadJson = () => {
    const data = levelsToMapDefs(levels, zoneDefs)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.download = `${slug}_maps.json`
    a.href = url
    a.click()
    URL.revokeObjectURL(url)
  }

  // Import
  const handleUploadJson = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        // Detect _maps.json format: named keys with .grid string arrays
        const firstVal = Object.values(data)[0]
        if (firstVal?.grid && Array.isArray(firstVal.grid) && typeof firstVal.grid[0] === 'string') {
          const { levels: newLevels, zoneDefs: newZoneDefs } = mapDefsToLevels(data)
          if (newLevels.length > 0) {
            const withFrames = newLevels.map(l => ({
              ...l,
              frameGrid: bakeAllAutotiles(l.grid, null, tiles),
            }))
            setLevels(withFrames)
            setActiveId(withFrames[0].id)
            if (newZoneDefs.length > 0) {
              setZoneDefs(prev => mergeZoneDefs(prev, newZoneDefs))
            }
            return
          }
        }
        // Legacy single-map format: { map: [...], zones: [...] }
        if (data.map?.length) {
          const newGrid = data.map.map(s => [...s].map(Number))
          const newZoneGrid = data.zones
            ? data.zones.map(s => [...s])
            : createEmptyZoneGrid(newGrid[0].length, newGrid.length)
          if (data.zoneDefs) {
            const parsedDefs = Object.entries(data.zoneDefs).map(([key, name], i) => ({
              key, name, color: ZONE_COLORS[i % ZONE_COLORS.length],
            }))
            setZoneDefs(prev => mergeZoneDefs(prev, parsedDefs))
          }
          updateLevel(() => ({
            grid: newGrid,
            frameGrid: bakeAllAutotiles(newGrid, null, tiles),
            zoneGrid: newZoneGrid,
          }))
          if (data.name) {
            setLevels(prev => prev.map(l => l.id === activeId ? { ...l, name: data.name } : l))
          }
        } else if (setSpriteDefs && Object.values(data).some(v => v && typeof v === 'object' && Object.values(v).some(s => s?.frames))) {
          setSpriteDefs(data)
        }
      } catch {}
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Generic propose: type='sprites' or 'maps'
  const propose = useCallback(async (type, data, summary, title, setStatus, setOpen) => {
    if (!title.trim()) return
    setStatus('sending')
    const json = JSON.stringify({ type, data })
    const body = `${summary}\n\n\`\`\`json:data-patch\n${json}\n\`\`\``
    if (body.length > 60000) { setStatus('error'); return }
    try {
      await apiFetch(`/api/games/${slug}/evolve-issues`, {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), body, category: 'data-patch' }),
      })
      setStatus('done')
      setOpen(false)
      setTimeout(() => setStatus(null), 3000)
    } catch { setStatus('error') }
  }, [slug])

  const handlePropose = useCallback(() => {
    if (!spriteDefs) return
    const lines = ['Sprite changes proposed from the editor.\n\nChanged sprites:']
    for (const [cat, sprites] of Object.entries(spriteDefs)) {
      for (const [name, def] of Object.entries(sprites)) {
        if (!def?.frames) continue
        lines.push(`- ${cat}/${name} (${def.frames.length} frame${def.frames.length !== 1 ? 's' : ''})`)
      }
    }
    propose('sprites', spriteDefs, lines.join('\n'), proposeTitle, setProposeStatus, setProposeOpen)
  }, [spriteDefs, proposeTitle, propose])

  const handleMapPropose = useCallback(() => {
    const mapsData = levelsToMapDefs(levels, zoneDefs)
    const mapNames = Object.keys(mapsData)
    const summary = `Map changes proposed from the editor.\n\nMaps:\n${mapNames.map(n => {
      const m = mapsData[n]; return `- ${n} (${m.w}x${m.h}${m.objects?.length ? `, ${m.objects.length} objects` : ''})`
    }).join('\n')}`
    propose('maps', mapsData, summary, mapProposeTitle, setMapProposeStatus, setMapProposeOpen)
  }, [levels, zoneDefs, mapProposeTitle, propose])

  return (
    <div style={{
      width: 220, borderLeft: `1px solid ${T.border}`,
      padding: T.sp[4], display: 'flex', flexDirection: 'column', gap: T.sp[5],
      overflowY: 'auto', flexShrink: 0,
    }}>
      <a href={`/play/${slug}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: T.fontSize.xs, color: T.accentColor, textDecoration: 'none', fontFamily: T.mono }}>
        {slug} &nearr; live preview
      </a>

      {/* Levels */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: T.sp[3] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: T.sp[2] }}>
            <div style={{ fontSize: T.fontSize.xs, color: T.text, textTransform: 'uppercase' }}>Levels</div>
            {hasLocalMapEdits && resetMaps && (
              <button
                onClick={resetMaps}
                title="Discard local map edits and reload published maps"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 9, fontFamily: T.mono, color: '#ffb74d',
                  padding: 0,
                }}
              >reset</button>
            )}
          </div>
          <button
            onClick={addLevel}
            style={{
              background: 'none', border: `1px solid ${T.border}`, borderRadius: T.radius.sm,
              color: T.accentColor, fontSize: T.fontSize.xs, padding: '2px 8px', cursor: 'pointer',
            }}
          >+</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: T.sp[1] }}>
          {levels.map(level => (
            <div
              key={level.id}
              style={{
                display: 'flex', alignItems: 'center', gap: T.sp[2],
                padding: `${T.sp[1]}px ${T.sp[2]}px`,
                borderRadius: T.radius.sm, cursor: 'pointer',
                background: activeId === level.id ? T.elevated : 'transparent',
                border: activeId === level.id ? `1px solid ${T.accentColor}` : '1px solid transparent',
              }}
            >
              {renamingId === level.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={finishRename}
                  onKeyDown={e => { if (e.key === 'Enter') finishRename(); if (e.key === 'Escape') setRenamingId(null) }}
                  style={{
                    flex: 1, background: T.surface, border: `1px solid ${T.border}`,
                    borderRadius: T.radius.sm, color: T.textBright, padding: '2px 4px',
                    fontFamily: T.mono, fontSize: T.fontSize.xs,
                  }}
                />
              ) : (
                <span
                  onClick={() => setActiveId(level.id)}
                  onDoubleClick={() => !level.source && startRename(level)}
                  style={{
                    flex: 1, fontSize: T.fontSize.xs,
                    color: activeId === level.id ? T.textBright : T.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {level.source && <span style={{ color: T.gold, fontSize: 9, marginRight: 4 }}>game</span>}
                  {level.name}
                </span>
              )}
              <button
                onClick={() => duplicateLevel(level)}
                title="Duplicate"
                style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 11, padding: '0 2px' }}
              >cp</button>
              {levels.length > 1 && (
                <button
                  onClick={() => deleteLevel(level.id)}
                  title="Delete"
                  style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', fontSize: 11, padding: '0 2px' }}
                >x</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Size */}
      <div>
        <div style={{ fontSize: T.fontSize.xs, color: T.text, textTransform: 'uppercase', marginBottom: T.sp[3] }}>Size</div>
        <div style={{ display: 'flex', gap: T.sp[3], alignItems: 'center' }}>
          <label style={{ fontSize: T.fontSize.xs, color: T.muted }}>W</label>
          <input type="number" value={cols} onChange={e => handleResize(+e.target.value, rows)} style={numInput} />
          <label style={{ fontSize: T.fontSize.xs, color: T.muted }}>H</label>
          <input type="number" value={rows} onChange={e => handleResize(cols, +e.target.value)} style={numInput} />
        </div>
      </div>

      {/* Export */}
      <div>
        <div style={{ fontSize: T.fontSize.xs, color: T.text, textTransform: 'uppercase', marginBottom: T.sp[3] }}>Export</div>
        <Button onClick={handleExport} style={{ width: '100%' }}>
          {copied ? 'Copied!' : 'Copy to clipboard'}
        </Button>
        <Button onClick={handleDownloadJson} style={{ width: '100%', marginTop: T.sp[2] }}>
          Download _maps.json
        </Button>
        {spriteDefs && (
          <Button onClick={() => {
            const blob = new Blob([JSON.stringify(spriteDefs, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.download = `${slug}_sprites.json`
            a.href = url
            a.click()
            URL.revokeObjectURL(url)
          }} style={{ width: '100%', marginTop: T.sp[2] }}>
            Download sprites JSON
          </Button>
        )}
      </div>

      {/* Propose */}
      {user && spriteDefs && (
        <div>
          <div style={{ fontSize: T.fontSize.xs, color: T.text, textTransform: 'uppercase', marginBottom: T.sp[3] }}>Propose</div>
          {proposeStatus === 'done' ? (
            <div style={{ fontSize: T.fontSize.xs, color: T.accent, padding: T.sp[3] }}>Submitted!</div>
          ) : !proposeOpen ? (
            <Button onClick={() => { setProposeOpen(true); setProposeStatus(null) }} style={{ width: '100%' }}>
              Propose sprites
            </Button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: T.sp[2] }}>
              <input
                value={proposeTitle}
                onChange={e => setProposeTitle(e.target.value)}
                placeholder="Title"
                style={formInput}
              />
              <Button onClick={handlePropose} disabled={proposeStatus === 'sending' || !proposeTitle.trim()}>
                {proposeStatus === 'sending' ? 'Sending...' : 'Submit'}
              </Button>
              {proposeStatus === 'error' && (
                <div style={{ fontSize: 10, color: T.danger }}>Failed. Login required & must have played this game.</div>
              )}
              <Button variant="ghost" onClick={() => setProposeOpen(false)}>Cancel</Button>
            </div>
          )}
        </div>
      )}

      {/* Propose maps */}
      {user && hasLocalMapEdits && (
        <div>
          {mapProposeStatus === 'done' ? (
            <div style={{ fontSize: T.fontSize.xs, color: T.accent, padding: T.sp[3] }}>Map proposal submitted!</div>
          ) : !mapProposeOpen ? (
            <Button onClick={() => { setMapProposeOpen(true); setMapProposeStatus(null) }} style={{ width: '100%' }}>
              Propose maps
            </Button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: T.sp[2] }}>
              <input
                value={mapProposeTitle}
                onChange={e => setMapProposeTitle(e.target.value)}
                placeholder="Title"
                style={formInput}
              />
              <Button onClick={handleMapPropose} disabled={mapProposeStatus === 'sending' || !mapProposeTitle.trim()}>
                {mapProposeStatus === 'sending' ? 'Sending...' : 'Submit'}
              </Button>
              {mapProposeStatus === 'error' && (
                <div style={{ fontSize: 10, color: T.danger }}>Failed. Login required & must have played this game.</div>
              )}
              <Button variant="ghost" onClick={() => setMapProposeOpen(false)}>Cancel</Button>
            </div>
          )}
        </div>
      )}

      {/* Import */}
      <div>
        <div style={{ fontSize: T.fontSize.xs, color: T.text, textTransform: 'uppercase', marginBottom: T.sp[3] }}>Import</div>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleUploadJson} style={{ display: 'none' }} />
        <Button onClick={() => fileInputRef.current?.click()} style={{ width: '100%' }}>
          Upload JSON
        </Button>
      </div>

      {/* Zones visibility */}
      <label style={{ display: 'flex', alignItems: 'center', gap: T.sp[2], cursor: 'pointer' }}>
        <input type="checkbox" checked={showZones} onChange={e => setShowZones(e.target.checked)} />
        <span style={{ fontSize: T.fontSize.xs, color: T.text }}>Show zones</span>
      </label>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: T.sp[2] }}>
        <Button variant="ghost" onClick={() => { const g = createEmptyGrid(cols, rows); updateLevel(() => ({ grid: g, frameGrid: g.map(r => r.map(() => 0)), zoneGrid: createEmptyZoneGrid(cols, rows), objects: [] })) }} style={{ width: '100%' }}>Clear all</Button>
      </div>
    </div>
  )
}
