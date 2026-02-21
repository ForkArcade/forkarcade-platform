import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiFetch, GITHUB_ORG, GAME_TOPIC, formatSlug, githubFetch, githubRawUrl } from '../api'
import { T } from '../theme'
import { Panel, IconTabBar, Badge, EmptyState } from '../components/ui'
import Leaderboard from '../components/Leaderboard'
import NarrativePanel from '../components/NarrativePanel'
import { Trophy, BookOpen, Clock, Info, Loader, AlertCircle, FileText, Zap, Palette } from 'lucide-react'
import EvolvePanel from '../components/EvolvePanel'
import MdPopup from '../components/MdPopup'
import { levelsToMapDefs } from '../editors/mapUtils'
import { dehydrateToSheet } from '../utils/sprite'
import { loadGame } from '../utils/gameLoader'

const isDev = window.location.hostname === 'localhost'
const GITHUB_PAGES_BASE = `https://${GITHUB_ORG.toLowerCase()}.github.io`

function applySpritesDirect(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (parsed._format === 'png-hydrated' && parsed._atlas) {
      const { _format, _atlas, ...defs } = parsed
      const sheetDataUrl = dehydrateToSheet(defs, _atlas)
      if (window.SPRITESHEET) window.SPRITESHEET.src = sheetDataUrl
      if (typeof window.SPRITE_DEFS !== 'undefined') {
        window.SPRITE_DEFS = _atlas
        window.SPRITE_SHEET_COLS = _atlas.sheet?.cols || window.SPRITE_SHEET_COLS
      }
    } else if (typeof window.SPRITE_DEFS !== 'undefined') {
      window.SPRITE_DEFS = parsed
      const cats = Object.keys(parsed)
      for (let ci = 0; ci < cats.length; ci++) {
        const names = Object.keys(parsed[cats[ci]])
        for (let ni = 0; ni < names.length; ni++) {
          if (parsed[cats[ci]][names[ni]]._c) delete parsed[cats[ci]][names[ni]]._c
        }
      }
    }
  } catch {}
}

function editorMapsToMapDefs(raw) {
  try {
    const parsed = JSON.parse(raw)
    if (parsed.levels) return levelsToMapDefs(parsed.levels, parsed.zoneDefs || [])
    return parsed
  } catch { return null }
}

const TAB_ICONS = {
  info: { label: 'Info', icon: Info },
  leaderboard: { label: 'Leaderboard', icon: Trophy },
  narrative: { label: 'Narrative', icon: BookOpen },
  evolve: { label: 'Evolve', icon: Zap },
  appearance: { label: 'Appearance', icon: Palette },
  changelog: { label: 'Changelog', icon: Clock },
}

export default function GamePage({ user, balance, onBalanceChange }) {
  const { slug } = useParams()
  const [game, setGame] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [tab, setTab] = useState('info')
  const tabRef = useRef(tab)
  tabRef.current = tab
  const narrativeRef = useRef({ variables: {}, graphs: {}, events: [] })
  const [narrativeState, setNarrativeState] = useState(narrativeRef.current)
  const narrativeFlushTimer = useRef(null)
  const [versions, setVersions] = useState([])
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [gameStatus, setGameStatus] = useState('loading') // loading | ready | unavailable
  const gameStatusRef = useRef('loading')
  const [focused, setFocused] = useState(false)
  const [sprites, setSprites] = useState(null)
  const [claudeMd, setClaudeMd] = useState(null)
  const [claudeMdPopup, setClaudeMdPopup] = useState(false)
  const [changelogPopup, setChangelogPopup] = useState(null)
  const changelogCache = useRef({})
  const containerRef = useRef(null)

  const currentVersion = selectedVersion || (versions.length > 0 ? versions[versions.length - 1].version : null)

  const loadLeaderboard = useCallback(() => {
    const vParam = selectedVersion ? `?version=${selectedVersion}` : ''
    apiFetch(`/api/games/${slug}/leaderboard${vParam}`)
      .then(data => setLeaderboard(Array.isArray(data) ? data : []))
      .catch(() => setLeaderboard([]))
  }, [slug, selectedVersion])

  // Fetch game metadata
  useEffect(() => {
    githubFetch(`/repos/${GITHUB_ORG}/${slug}`)
      .then(repo => setGame({ slug: repo.name, title: formatSlug(repo.name), description: repo.description || '', topics: repo.topics || [] }))
      .catch(() => setGame({ slug, title: formatSlug(slug), description: '', topics: [] }))

    fetch(githubRawUrl(`${GITHUB_ORG}/${slug}/main/.forkarcade.json`))
      .then(r => r.ok ? r.json() : null)
      .then(config => setVersions(config?.versions || []))
      .catch(() => setVersions([]))

    fetch(githubRawUrl(`${GITHUB_ORG}/${slug}/main/_sprites.json`))
      .then(r => r.ok ? r.json() : null)
      .then(data => setSprites(data))
      .catch(() => setSprites(null))

    fetch(githubRawUrl(`${GITHUB_ORG}/${slug}/main/CLAUDE.md`))
      .then(r => r.ok ? r.text() : null)
      .then(text => setClaudeMd(text))
      .catch(() => setClaudeMd(null))
  }, [slug])

  useEffect(() => { loadLeaderboard() }, [loadLeaderboard])

  const gameBaseUrl = isDev
    ? `/local-games/${slug}/`
    : selectedVersion
      ? `${GITHUB_PAGES_BASE}/${slug}/versions/v${selectedVersion}/`
      : `${GITHUB_PAGES_BASE}/${slug}/`

  const wrapperRef = useRef(null)

  // Blur detection — click outside game area
  useEffect(() => {
    const onMouseDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setFocused(false)
        containerRef.current?.blur()
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  // Stable refs for callbacks used in loadGame
  const userRef = useRef(user)
  userRef.current = user
  const loadLeaderboardRef = useRef(loadLeaderboard)
  loadLeaderboardRef.current = loadLeaderboard
  const currentVersionRef = useRef(currentVersion)
  currentVersionRef.current = currentVersion

  // Load game scripts directly (no iframe)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    setGameStatus('loading')
    gameStatusRef.current = 'loading'
    setFocused(false)

    let cleanupFn = null
    let cancelled = false

    loadGame(container, gameBaseUrl, {
      slug,
      version: currentVersionRef.current,
      onSubmitScore(score) {
        return apiFetch(`/api/games/${slug}/score`, {
          method: 'POST',
          body: JSON.stringify({ score, version: currentVersionRef.current }),
        }).then(result => {
          if (result.coins > 0) {
            onBalanceChange(prev => (prev ?? 0) + result.coins)
          }
          loadLeaderboardRef.current()
          return result
        })
      },
      onGetPlayer() {
        const u = userRef.current
        return u
          ? Promise.resolve({ login: u.login, sub: u.sub })
          : Promise.reject(new Error('not_logged_in'))
      },
      onNarrative(data) {
        const nr = narrativeRef.current
        narrativeRef.current = {
          variables: data.variables || nr.variables,
          graphs: data.graphs || nr.graphs,
          events: data.event ? [...nr.events, data.event].slice(-20) : nr.events,
        }
        if (tabRef.current === 'narrative' && !narrativeFlushTimer.current) {
          narrativeFlushTimer.current = setTimeout(() => {
            narrativeFlushTimer.current = null
            setNarrativeState({ ...narrativeRef.current })
          }, 500)
        }
      },
      onLoaded() {
        if (cancelled) return
        // Apply saved sprites/maps from editor
        try {
          const savedSprites = localStorage.getItem(`fa-sprites-${slug}`)
          if (savedSprites) applySpritesDirect(savedSprites)
          const savedMaps = localStorage.getItem(`fa-maps-${slug}`)
          if (savedMaps) {
            const maps = editorMapsToMapDefs(savedMaps)
            if (maps) {
              window.dispatchEvent(new CustomEvent('fa-map-update', { detail: maps }))
            }
          }
        } catch {}
      },
    }).then(cleanup => {
      if (cancelled) {
        cleanup()
        return
      }
      cleanupFn = cleanup
      setGameStatus('ready')
      gameStatusRef.current = 'ready'
    }).catch(() => {
      if (!cancelled) {
        setGameStatus('unavailable')
        gameStatusRef.current = 'unavailable'
      }
    })

    return () => {
      cancelled = true
      if (cleanupFn) cleanupFn()
    }
  }, [gameBaseUrl, slug, onBalanceChange, !!game])

  // Hot-reload sprites from editor (cross-tab localStorage)
  useEffect(() => {
    const key = `fa-sprites-${slug}`
    function onStorage(e) {
      if (e.key !== key || !e.newValue || gameStatusRef.current !== 'ready') return
      applySpritesDirect(e.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [slug])

  // Hot-reload maps from editor (cross-tab localStorage)
  useEffect(() => {
    const key = `fa-maps-${slug}`
    function onStorage(e) {
      if (e.key !== key || !e.newValue || gameStatusRef.current !== 'ready') return
      try {
        const maps = editorMapsToMapDefs(e.newValue)
        if (maps) {
          window.dispatchEvent(new CustomEvent('fa-map-update', { detail: maps }))
        }
      } catch {}
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [slug])

  // Sync narrative ref to state when switching to narrative tab
  useEffect(() => {
    if (tab === 'narrative') setNarrativeState({ ...narrativeRef.current })
  }, [tab])

  // Cleanup narrative throttle timer
  useEffect(() => () => clearTimeout(narrativeFlushTimer.current), [])

  if (!game) return <EmptyState>Loading...</EmptyState>

  const iconTabs = ['info', 'leaderboard', 'narrative', 'evolve', 'appearance', versions.length > 0 && 'changelog']
    .filter(Boolean).map(k => ({ key: k, ...TAB_ICONS[k] }))

  return (
    <div style={{ display: 'flex', height: '100%', gap: T.sp[4] }}>
      <div ref={wrapperRef} style={{
        flex: 1,
        background: '#000',
        position: 'relative',
      }}>
        <div
          ref={containerRef}
          tabIndex={-1}
          style={{ width: '100%', height: '100%', outline: 'none' }}
        >
          <canvas id="game" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }} />
        </div>
        {gameStatus === 'ready' && !focused && (
          <div onClick={() => { setFocused(true); containerRef.current?.focus() }}
            style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(0,0,0,0.4) 0%, rgba(0,0,0,1) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1 }}>
            <span style={{ fontSize: T.fontSize.sm, color: T.textBright, letterSpacing: T.tracking.wider, textTransform: 'uppercase', padding: `${T.sp[4]}px ${T.sp[6]}px`, border: `1px solid ${T.border}`, borderRadius: T.radius.md, background: T.surface }}>
              Click to focus
            </span>
          </div>
        )}
        {gameStatus !== 'ready' && (
          <div style={{ position: 'absolute', inset: 0, background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: T.sp[5] }}>
            <img src="/logo.svg" alt="" width={48} height={48} style={{ opacity: gameStatus === 'loading' ? 0.3 : 0.15 }} />
            {gameStatus === 'loading'
              ? <><Loader size={16} color={T.muted} style={{ animation: 'spin 1.5s linear infinite' }} /><span style={{ fontSize: T.fontSize.xs, color: T.muted, letterSpacing: T.tracking.wider, textTransform: 'uppercase' }}>Loading game</span></>
              : <><AlertCircle size={16} color={T.muted} /><span style={{ fontSize: T.fontSize.xs, color: T.muted, letterSpacing: T.tracking.wider, textTransform: 'uppercase' }}>Game unavailable</span><span style={{ fontSize: T.fontSize.xs, color: T.border, maxWidth: 240, textAlign: 'center', lineHeight: T.leading.relaxed }}>GitHub Pages not deployed yet or currently rebuilding</span></>
            }
          </div>
        )}
      </div>

      <Panel style={{ width: 260, minWidth: 260, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: `${T.sp[3]}px ${T.sp[4]}px`, borderBottom: `1px solid ${T.border}`, minHeight: 36 }}>
          <span style={{ fontSize: T.fontSize.xs, fontWeight: T.weight.medium, color: T.muted, textTransform: 'uppercase', letterSpacing: T.tracking.widest }}>{slug}</span>
        </div>
        {versions.length > 0 && (
          <div style={{ padding: `${T.sp[3]}px ${T.sp[4]}px`, borderBottom: `1px solid ${T.border}` }}>
            <select value={selectedVersion ?? ''} onChange={e => setSelectedVersion(e.target.value ? Number(e.target.value) : null)}
              style={{ width: '100%', height: 28, background: T.surface, color: T.textBright, border: `1px solid ${T.border}`, borderRadius: T.radius.md, padding: `0 ${T.sp[3]}px`, fontSize: T.fontSize.xs, fontFamily: T.mono, letterSpacing: T.tracking.wide, cursor: 'pointer', outline: 'none' }}>
              <option value="">Latest (v{versions[versions.length - 1].version})</option>
              {versions.slice(0, -1).reverse().map(v => <option key={v.version} value={v.version}>v{v.version} — {v.description}</option>)}
            </select>
          </div>
        )}
        <IconTabBar tabs={iconTabs} active={tab} onChange={setTab} />
        <div style={{ padding: `${T.sp[3]}px ${T.sp[5]}px`, borderBottom: `1px solid ${T.border}`, fontSize: T.fontSize.xs, fontWeight: T.weight.medium, color: T.muted, textTransform: 'uppercase', letterSpacing: T.tracking.widest }}>
          {TAB_ICONS[tab]?.label}
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: T.sp[5] }}>
            {tab === 'info' && (
              <div>
                <div style={{ fontSize: T.fontSize.base, fontWeight: T.weight.semibold, color: T.textBright, marginBottom: T.sp[4] }}>{game.title}</div>
                {game.description && <div style={{ fontSize: T.fontSize.xs, color: T.text, lineHeight: T.leading.relaxed, marginBottom: T.sp[5] }}>{game.description}</div>}
                {(() => { const tags = game.topics.filter(t => t !== GAME_TOPIC); return tags.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: T.sp[2], marginBottom: T.sp[5] }}>{tags.map(t => <Badge key={t}>{t}</Badge>)}</div> })()}
                {claudeMd && (
                  <button onClick={() => setClaudeMdPopup(true)} style={{ display: 'flex', alignItems: 'center', gap: T.sp[3], padding: `${T.sp[3]}px ${T.sp[4]}px`, background: T.elevated, border: `1px solid ${T.border}`, borderRadius: T.radius.md, color: T.text, fontSize: T.fontSize.xs, fontFamily: T.mono, cursor: 'pointer', width: '100%' }}>
                    <FileText size={14} /> CLAUDE.md
                  </button>
                )}
              </div>
            )}
            {tab === 'leaderboard' && <Leaderboard rows={leaderboard} />}
            {tab === 'narrative' && <NarrativePanel narrativeState={narrativeState} />}
            {tab === 'evolve' && <EvolvePanel slug={slug} user={user} balance={balance} onBalanceChange={onBalanceChange} />}
            {tab === 'appearance' && (
              <Link to={`/edit/${slug}`} style={{ display: 'flex', alignItems: 'center', gap: T.sp[3], padding: `${T.sp[3]}px ${T.sp[4]}px`, background: T.elevated, border: `1px solid ${T.border}`, borderRadius: T.radius.md, color: T.accentColor, fontSize: T.fontSize.xs, fontFamily: T.mono, textDecoration: 'none', cursor: 'pointer' }}>
                <Palette size={14} /> Open Editor
              </Link>
            )}
            {tab === 'changelog' && (
              <div>
                {versions.slice().reverse().map(v => (
                  <div key={v.version} onClick={() => {
                    const ck = `v${v.version}`
                    if (changelogCache.current[ck]) { setChangelogPopup({ version: v.version, text: changelogCache.current[ck] }); return }
                    fetch(githubRawUrl(`${GITHUB_ORG}/${slug}/main/changelog/v${v.version}.md`))
                      .then(r => r.ok ? r.text() : null)
                      .then(text => { if (text) { changelogCache.current[ck] = text; setChangelogPopup({ version: v.version, text }) } })
                      .catch(() => {})
                  }} style={{ marginBottom: T.sp[5], borderLeft: `2px solid ${T.border}`, paddingLeft: T.sp[4], cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: T.sp[3] }}>
                      <span style={{ color: T.accentColor, fontFamily: T.mono, fontSize: T.fontSize.xs }}>v{v.version}</span>
                      <span style={{ color: T.muted, fontSize: T.fontSize.xs }}>{v.date}{v.issue && ` #${v.issue}`}</span>
                    </div>
                    <div style={{ fontSize: T.fontSize.xs, color: T.text, marginTop: T.sp[1], lineHeight: T.leading.normal }}>{v.description}</div>
                  </div>
                ))}
                {versions.length === 0 && <EmptyState>No versions yet</EmptyState>}
              </div>
            )}
          </div>
        </Panel>

      {claudeMdPopup && claudeMd && (
        <MdPopup title="CLAUDE.md" text={claudeMd} onClose={() => setClaudeMdPopup(false)} />
      )}
      {changelogPopup && (
        <MdPopup title={`Changelog v${changelogPopup.version}`} text={changelogPopup.text} onClose={() => setChangelogPopup(null)} />
      )}
    </div>
  )
}
